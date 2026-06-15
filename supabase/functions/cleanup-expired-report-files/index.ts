import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "https://gzaalqhcmmtksvlneics.supabase.co";
const serviceRoleKey = (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY") ?? "").trim();

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
});

Deno.serve(async () => {
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Missing Supabase function environment." }), {
      status: 500,
      headers: { "content-type": "application/json" }
    });
  }

  const now = new Date().toISOString();
  const { data: expired, error } = await supabase
    .from("clients")
    .select("id, report_path")
    .not("report_path", "is", null)
    .lte("report_expires_at", now);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "content-type": "application/json" }
    });
  }

  const paths = (expired ?? []).map((item) => item.report_path).filter(Boolean);
  if (paths.length) {
    const { error: removeError } = await supabase.storage.from("reports").remove(paths);
    if (removeError) {
      return new Response(JSON.stringify({ error: removeError.message }), {
        status: 500,
        headers: { "content-type": "application/json" }
      });
    }

    const ids = expired.map((item) => item.id);
    const { error: updateError } = await supabase
      .from("clients")
      .update({
        report_path: null,
        report_name: null,
        report_uploaded_at: null,
        report_expires_at: null,
        status: "not-ready"
      })
      .in("id", ids);

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { "content-type": "application/json" }
      });
    }
  }

  return new Response(JSON.stringify({ deleted: paths.length }), {
    headers: { "content-type": "application/json" }
  });
});
