import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "POST, OPTIONS"
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
});

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "Missing Supabase function environment." }, 500);
  }

  const body = await request.json().catch(() => ({}));
  const phone = String(body.phone ?? "").trim();
  const password = String(body.password ?? "");

  if (!phone || !password) {
    return json({ record: null }, 200);
  }

  const { data, error } = await supabase.rpc("verify_result_access", {
    lookup_phone: phone,
    lookup_password: password
  });

  if (error) {
    return json({ error: error.message }, 500);
  }

  const record = data?.[0] ?? null;
  if (!record) {
    return json({ record: null }, 200);
  }

  let signedUrl = "";
  if (record.status === "ready" && record.report_path) {
    const { data: signed, error: signedError } = await supabase.storage
      .from("reports")
      .createSignedUrl(record.report_path, 60 * 10);

    if (signedError) {
      return json({ error: signedError.message }, 500);
    }

    signedUrl = signed.signedUrl;
  }

  return json({
    record: {
      id: record.id,
      name: record.name,
      status: record.status,
      reportName: record.report_name,
      reportExpiresAt: record.report_expires_at,
      signedUrl
    }
  });
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" }
  });
}
