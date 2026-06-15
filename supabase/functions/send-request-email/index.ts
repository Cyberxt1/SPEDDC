import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "POST, OPTIONS"
};

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

  if (!serviceRoleKey || !resendApiKey) {
    return json({ error: "Email service is not configured." }, 500);
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");
  const { data: authData, error: authError } = await supabase.auth.getUser(token);

  if (authError || !authData.user) {
    return json({ error: "You must be signed in to send email." }, 401);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", authData.user.id)
    .single();

  if (profileError || !["admin", "staff"].includes(profile?.role)) {
    return json({ error: "You do not have permission to send request emails." }, 403);
  }

  const body = await request.json().catch(() => ({}));
  const to = String(body.to ?? "").trim();
  const subject = String(body.subject ?? "").trim();
  const message = String(body.message ?? "").trim();

  if (!to || !subject || !message) {
    return json({ error: "Recipient, subject, and message are required." }, 400);
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${resendApiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [to],
      subject,
      html: `<p>${escapeHtml(message).replaceAll("\n", "<br />")}</p>`
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("send-request-email resend failed", errorText);
    return json({ error: "Email provider rejected the message. Check Resend sender/domain settings." }, 500);
  }

  return json({ ok: true });
});

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
