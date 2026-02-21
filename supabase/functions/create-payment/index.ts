// supabase/functions/create-payment/index.ts
// ─────────────────────────────────────────────────────────────────────────────
// Edge Function ini dipanggil dari frontend untuk membuat transaksi Midtrans.
// Server Key disimpan aman di sini — tidak pernah terekspos ke browser.
// ─────────────────────────────────────────────────────────────────────────────

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // Handle preflight CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── Ambil data dari request ──────────────────────────────────────────
    const { rental_id, months_paid = 1 } = await req.json();

    if (!rental_id) {
      return errorResponse("rental_id wajib diisi", 400);
    }

    // ── Inisialisasi Supabase (pakai service_role agar bisa bypass RLS) ──
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── Ambil data rental + tenant + room ───────────────────────────────
    const { data: rental, error: rentalError } = await supabase
      .from("rentals")
      .select("*, rooms(room_number, price_monthly)")
      .eq("id", rental_id)
      .single();

    if (rentalError || !rental) {
      return errorResponse("Data sewa tidak ditemukan", 404);
    }

    // ── Ambil email dari auth.users ──────────────────────────────────────
    const { data: userData } = await supabase.auth.admin.getUserById(rental.tenant_id);
    const userEmail = userData?.user?.email ?? "tenant@kostify.id";

    // ── Hitung total pembayaran ──────────────────────────────────────────
    const pricePerMonth = rental.monthly_price ?? rental.rooms?.price_monthly ?? 0;
    const totalAmount   = pricePerMonth * months_paid;

    // ── Buat order ID unik ───────────────────────────────────────────────
    const orderId = `KOST-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

    // ── Simpan record payment ke database (status: pending) ───────────────
    const paymentMonth = new Date();
    paymentMonth.setDate(1);

    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .insert({
        rental_id:          rental_id,
        tenant_id:          rental.tenant_id,
        amount:             totalAmount,
        months_paid:        months_paid,
        payment_month:      paymentMonth.toISOString().split("T")[0],
        midtrans_order_id:  orderId,
        status:             "pending",
      })
      .select()
      .single();

    if (paymentError) {
      console.error("Payment insert error:", paymentError);
      return errorResponse("Gagal membuat record pembayaran", 500);
    }

    // ── Panggil Midtrans Snap API ────────────────────────────────────────
    const MIDTRANS_SERVER_KEY = Deno.env.get("MIDTRANS_SERVER_KEY")!;
    const IS_PRODUCTION       = Deno.env.get("MIDTRANS_PRODUCTION") === "true";
    const MIDTRANS_BASE_URL   = IS_PRODUCTION
      ? "https://app.midtrans.com"
      : "https://app.sandbox.midtrans.com";

    const credentials = btoa(`${MIDTRANS_SERVER_KEY}:`);

    const snapPayload = {
      transaction_details: {
        order_id:     orderId,
        gross_amount: totalAmount,
      },
      customer_details: {
        first_name: "Penyewa",
        email:      userEmail,
        phone:      "",
      },
      item_details: [
        {
          id:       `SEWA-${rental.rooms?.room_number}`,
          price:    pricePerMonth,
          quantity: months_paid,
          name:     `Sewa Kamar ${rental.rooms?.room_number ?? ""} (${months_paid} bulan)`,
        },
      ],
      // ── Metode pembayaran yang diaktifkan ─────────────────────────────
      // Virtual Account: BCA, BNI, BRI, Mandiri, Permata, dan lainnya
      // E-Wallet: GoPay, ShopeePay, QRIS
      // Kartu: credit_card
      // Minimarket: cstore (Alfamart/Indomaret)
      enabled_payments: [
        "bca_va", "bni_va", "bri_va", "mandiri_va", "permata_va", "other_va",
        "gopay", "shopeepay", "qris",
        "credit_card",
        "cstore",
      ],
      // VA number kosong = Midtrans generate otomatis
      bca_va:  { va_number: "" },
      bni_va:  { va_number: "" },
      bri_va:  { va_number: "" },
      callbacks: {
        finish: `${Deno.env.get("APP_URL") ?? "http://localhost:5173"}/?payment=success`,
      },
    };

    const midtransResponse = await fetch(`${MIDTRANS_BASE_URL}/snap/v1/transactions`, {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Basic ${credentials}`,
      },
      body: JSON.stringify(snapPayload),
    });

    const snapData = await midtransResponse.json();

    if (!midtransResponse.ok) {
      console.error("Midtrans error:", snapData);
      return errorResponse(`Midtrans error: ${snapData.error_messages?.join(", ") ?? "Unknown error"}`, 500);
    }

    // ── Update payment dengan snap_token ─────────────────────────────────
    await supabase
      .from("payments")
      .update({ midtrans_snap_token: snapData.token })
      .eq("id", payment.id);

    // ── Kembalikan token ke frontend ─────────────────────────────────────
    return new Response(
      JSON.stringify({
        success:    true,
        snap_token: snapData.token,
        order_id:   orderId,
        amount:     totalAmount,
        payment_id: payment.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (err) {
    console.error("Unexpected error:", err);
    return errorResponse("Server error: " + err.message, 500);
  }
});

function errorResponse(message: string, status: number) {
  return new Response(
    JSON.stringify({ success: false, error: message }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" }, status }
  );
}