import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type AdminRequest =
  | { action: "createUser"; email: string; password: string; role: "admin" | "user" }
  | { action: "deleteUser"; userId: string };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace("Bearer ", "");

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const userClient = createClient(supabaseUrl, serviceRoleKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });

    const { data: callerData, error: callerError } = await userClient.auth.getUser(jwt);
    if (callerError || !callerData.user) {
      return json({ error: "인증이 필요합니다." }, 401);
    }

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("role")
      .eq("id", callerData.user.id)
      .single();

    if (profileError || profile?.role !== "admin") {
      return json({ error: "Admin 권한이 필요합니다." }, 403);
    }

    const body = (await req.json()) as AdminRequest;

    if (body.action === "createUser") {
      const { data, error } = await admin.auth.admin.createUser({
        email: body.email,
        password: body.password,
        email_confirm: true,
        user_metadata: { role: body.role },
      });

      if (error) return json({ error: error.message }, 400);

      await admin.from("profiles").update({ role: body.role }).eq("id", data.user.id);
      return json({ user: data.user });
    }

    if (body.action === "deleteUser") {
      if (body.userId === callerData.user.id) {
        return json({ error: "자기 자신은 삭제할 수 없습니다." }, 400);
      }

      const { error } = await admin.auth.admin.deleteUser(body.userId);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    return json({ error: "지원하지 않는 작업입니다." }, 400);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "알 수 없는 오류입니다." }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
