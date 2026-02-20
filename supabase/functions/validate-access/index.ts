import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { token, method = "web" } = await req.json();
    if (!token) return new Response(JSON.stringify({ access: false, reason: "No token" }), { headers: { ...cors, "Content-Type": "application/json" }, status: 400 });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: rental } = await supabase.from("rentals").select("*, profiles(full_name), rooms(room_number)").eq("access_token", token).single();

    let access = false, reason = "Token tidak ditemukan", tenant_name = null, room_number = null;
    if (rental) {
      const expiry = new Date(rental.expiry_date); expiry.setHours(23,59,59);
      if (rental.status === "active" && expiry >= new Date()) {
        access = true; reason = "Akses diberikan";
        tenant_name = rental.profiles?.full_name; room_number = rental.rooms?.room_number;
      } else { reason = expiry < new Date() ? "Sewa sudah berakhir" : "Sewa tidak aktif"; }
    }

    await supabase.from("access_logs").insert({ rental_id: rental?.id ?? null, token_scanned: token, access_granted: access, scanner_method: method, notes: reason });
    return new Response(JSON.stringify({ access, reason, tenant_name, room_number, expiry_date: rental?.expiry_date ?? null }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ access: false, reason: "Server error" }), { headers: { ...cors, "Content-Type": "application/json" }, status: 500 });
  }
});
