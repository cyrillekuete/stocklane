// Supabase Edge Function: admin user create / deactivate.
// Deploy with: supabase functions deploy manage-users
// Requires SUPABASE_SERVICE_ROLE_KEY in function secrets (auto-provided on hosted).

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: [
    "dashboard",
    "inventory",
    "warehouses",
    "pos",
    "products",
    "categories",
    "orders",
    "customers",
    "settings",
    "users",
  ],
  cashier: ["dashboard", "pos", "orders", "customers"],
  store_keeper: ["dashboard", "inventory", "warehouses", "products", "categories"],
};

type Body = {
  action: "create" | "set_password" | "delete";
  email?: string;
  password?: string;
  role?: string;
  first_name?: string;
  last_name?: string;
  user_id?: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing authorization" }, 401);
    }

    const caller = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await caller.auth.getUser();
    if (userError || !user) return json({ error: "Unauthorized" }, 401);

    const role = (user.app_metadata as { role?: string } | undefined)?.role;
    if (role !== "admin") return json({ error: "Only admins can manage users" }, 403);

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body = (await req.json()) as Body;

    if (body.action === "create") {
      const email = body.email?.trim().toLowerCase();
      const password = body.password ?? "";
      const userRole = body.role ?? "cashier";
      if (!email || password.length < 6) {
        return json({ error: "Email and password (min 6) are required" }, 400);
      }
      if (!["admin", "cashier", "store_keeper"].includes(userRole)) {
        return json({ error: "Invalid role" }, 400);
      }

      const first = body.first_name ?? "";
      const last = body.last_name ?? "";
      const fullname = `${first} ${last}`.trim();
      const permissions = ROLE_PERMISSIONS[userRole] ?? ROLE_PERMISSIONS.cashier;

      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        app_metadata: { role: userRole, permissions },
        user_metadata: {
          first_name: first,
          last_name: last,
          fullname,
        },
      });
      if (error) return json({ error: error.message }, 400);

      await admin.from("inventory_profiles").upsert({
        id: data.user.id,
        email,
        first_name: first || null,
        last_name: last || null,
        full_name: fullname || email.split("@")[0],
        role: userRole,
        status: "active",
        permissions,
        updated_at: new Date().toISOString(),
      });

      return json({ user: { id: data.user.id, email, role: userRole, permissions } });
    }

    if (body.action === "set_password") {
      if (!body.user_id || !body.password || body.password.length < 6) {
        return json({ error: "user_id and password are required" }, 400);
      }
      const { error } = await admin.auth.admin.updateUserById(body.user_id, {
        password: body.password,
      });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (body.action === "delete") {
      if (!body.user_id) return json({ error: "user_id is required" }, 400);
      if (body.user_id === user.id) {
        return json({ error: "You cannot delete your own account" }, 400);
      }
      const { error } = await admin.auth.admin.deleteUser(body.user_id);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    return json(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      500,
    );
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
