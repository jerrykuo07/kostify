// supabase/functions/midtrans-webhook/index.ts
// Menerima notifikasi dari Midtrans, verifikasi signature, update status payment.
//
// Daftarkan URL ini di Midtrans Dashboard:
//   Settings → Configuration → Payment Notification URL
//   → https://YOUR_PROJECT_REF.supabase.co/functions/v1/midtrans-webhook

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// SHA-512 hash menggunakan Web Crypto API bawaan Deno (tidak butuh import tambahan)
async function sha512hex(str: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-512", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const body = await req.json();
    console.log("Midtrans webhook:", body.order_id, body.transaction_status);

    const {
      order_id, status_code, gross_amount, signature_key,
      transaction_status, fraud_status, payment_type, transaction_id,
    } = body;

    // ── Verifikasi signature ─────────────────────────────────────────────
    const MIDTRANS_SERVER_KEY = Deno.env.get("MIDTRANS_SERVER_KEY")!;
    const rawString  = `${order_id}${status_code}${gross_amount}${MIDTRANS_SERVER_KEY}`;
    const expectedSig = await sha512hex(rawString);

    if (signature_key !== expectedSig) {
      console.error("Signature mismatch!");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        headers: { ...cors, "Content-Type": "application/json" }, status: 401,
      });
    }

    // ── Tentukan status ──────────────────────────────────────────────────
    const isSuccess = (transaction_status === "capture" && fraud_status === "accept")
                   || transaction_status === "settlement";
    const isFailed  = ["deny","cancel","expire","failure"].includes(transaction_status);

    let newStatus: string;
    if (isSuccess)     newStatus = "paid";
    else if (isFailed) newStatus = "failed";
    else               newStatus = "pending";

    // ── Update payment di DB ─────────────────────────────────────────────
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const updateData: Record<string, unknown> = {
      status: newStatus,
      midtrans_transaction_id: transaction_id,
      midtrans_payment_type: payment_type,
    };
    if (newStatus === "paid") updateData.paid_at = new Date().toISOString();

    const { error } = await supabase
      .from("payments")
      .update(updateData)
      .eq("midtrans_order_id", order_id);

    if (error) {
      console.error("Update error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        headers: { ...cors, "Content-Type": "application/json" }, status: 500,
      });
    }

    // DB trigger extend_rental_expiry akan otomatis memperpanjang sewa
    console.log(`Payment ${order_id} updated → ${newStatus}`);

    return new Response(JSON.stringify({ success: true, status: newStatus }), {
      headers: { ...cors, "Content-Type": "application/json" }, status: 200,
    });

  } catch (err) {
    console.error("Webhook error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...cors, "Content-Type": "application/json" }, status: 500,
    });
  }
});
