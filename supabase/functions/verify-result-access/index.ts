import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "GET, POST, OPTIONS"
};

const MAX_DIRECT_ACCESS = 5;
const TOKEN_TTL_HOURS = 24;
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "https://gzaalqhcmmtksvlneics.supabase.co";
const serviceRoleKey = (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY") ?? "").trim();
const resendApiKey = (Deno.env.get("RESEND_API_KEY") ?? "").trim();
const fromEmail = (Deno.env.get("RESULTS_FROM_EMAIL") ?? "Results Desk <onboarding@resend.dev>").trim();

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
});

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("verify-result-access missing environment", {
      hasSupabaseUrl: Boolean(supabaseUrl),
      hasServiceRoleKey: Boolean(serviceRoleKey),
      hasResendApiKey: Boolean(resendApiKey),
      hasFromEmail: Boolean(fromEmail)
    });
    return json({ error: "Missing Supabase function environment." }, 500);
  }

  if (request.method === "GET") {
    return handleTokenDownload(request);
  }

  const body = await request.json().catch(() => ({}));
  const phone = String(body.phone ?? "").trim();
  const password = String(body.password ?? "");

  if (!phone || !password) {
    return json({ record: null }, 200);
  }

  const { data: record, error } = await supabase
    .from("clients")
    .select("id, name, email, phone, status, report_path, report_name, report_expires_at, result_access_count")
    .eq("result_password", password)
    .limit(25);

  if (error) {
    console.error("verify-result-access client lookup failed", error);
    return json({ error: error.message }, 500);
  }

  const client = (record ?? []).find((item) => normalizePhone(item.phone) === normalizePhone(phone));
  if (!client) {
    return json({ record: null }, 200);
  }

  if (client.status !== "ready" || !client.report_path) {
    return json({
      record: {
        id: client.id,
        name: client.name,
        status: client.status,
        reportName: client.report_name,
        reportExpiresAt: client.report_expires_at,
        signedUrl: ""
      }
    });
  }

  if ((client.result_access_count ?? 0) >= MAX_DIRECT_ACCESS) {
    const emailSent = await sendLimitEmail(request, client);
    await supabase
      .from("clients")
      .update({ result_access_limited_at: new Date().toISOString() })
      .eq("id", client.id);

    return json({
      record: {
        id: client.id,
        name: client.name,
        status: "limited",
        reportName: client.report_name,
        reportExpiresAt: client.report_expires_at,
        signedUrl: "",
        accessLimited: true,
        emailSent
      }
    });
  }

  const { data: signed, error: signedError } = await supabase.storage
    .from("reports")
    .createSignedUrl(client.report_path, 60 * 10);

    if (signedError) {
      console.error("verify-result-access signed URL failed", signedError);
      return json({ error: signedError.message }, 500);
    }

  await supabase
    .from("clients")
    .update({
      result_access_count: (client.result_access_count ?? 0) + 1,
      last_result_access_at: new Date().toISOString()
    })
    .eq("id", client.id);

  return json({
    record: {
      id: client.id,
      name: client.name,
      status: client.status,
      reportName: client.report_name,
      reportExpiresAt: client.report_expires_at,
      signedUrl: signed.signedUrl,
      accessCount: (client.result_access_count ?? 0) + 1,
      accessLimit: MAX_DIRECT_ACCESS
    }
  });
});

async function handleTokenDownload(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  if (!token) {
    return new Response("Missing download token.", { status: 400, headers: corsHeaders });
  }

  const tokenHash = await sha256(token);
  const { data, error } = await supabase
    .from("result_download_tokens")
    .select("id, expires_at, used_at, clients(report_path)")
    .eq("token_hash", tokenHash)
    .single();

  if (error || !data || data.used_at || new Date(data.expires_at) < new Date()) {
    return new Response("This download link is invalid or expired.", { status: 410, headers: corsHeaders });
  }

  const reportPath = data.clients?.report_path;
  if (!reportPath) {
    return new Response("Report file is not available.", { status: 404, headers: corsHeaders });
  }

  const { data: signed, error: signedError } = await supabase.storage
    .from("reports")
    .createSignedUrl(reportPath, 60 * 10);

  if (signedError) {
    return new Response(signedError.message, { status: 500, headers: corsHeaders });
  }

  await supabase.from("result_download_tokens").update({ used_at: new Date().toISOString() }).eq("id", data.id);
  return Response.redirect(signed.signedUrl, 302);
}

async function sendLimitEmail(request: Request, client: Record<string, string>) {
  if (!resendApiKey || !client.email) {
    console.error("verify-result-access email skipped", {
      hasResendApiKey: Boolean(resendApiKey),
      hasClientEmail: Boolean(client.email)
    });
    return false;
  }

  const token = crypto.randomUUID();
  const tokenHash = await sha256(token);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000).toISOString();
  const downloadUrl = `${new URL(request.url).origin}${new URL(request.url).pathname}?token=${token}`;

  const { error } = await supabase.from("result_download_tokens").insert({
    client_id: client.id,
    token_hash: tokenHash,
    expires_at: expiresAt
  });

  if (error) {
    console.error("verify-result-access token insert failed", error);
    return false;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${resendApiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [client.email],
      subject: "Result access limit reached",
      html: `
        <p>Hello ${escapeHtml(client.name)},</p>
        <p>Your result has been accessed more than ${MAX_DIRECT_ACCESS} times.</p>
        <p>Use this secure link to download the result:</p>
        <p><a href="${downloadUrl}">Download result PDF</a></p>
        <p>This link expires in ${TOKEN_TTL_HOURS} hours. If you did not request this, please contact the system administrator.</p>
      `
    })
  });

  if (!response.ok) {
    console.error("verify-result-access resend failed", await response.text());
  }

  return response.ok;
}

async function sha256(value: string) {
  const input = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", input);
  return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function normalizePhone(value: string) {
  return String(value || "").replace(/\s+/g, "");
}

function escapeHtml(value: string) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" }
  });
}
