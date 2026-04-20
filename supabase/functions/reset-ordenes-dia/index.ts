import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  // Supabase invoca la función con POST cuando se dispara el cron.
  // Rechazamos cualquier otra petición sin la auth header correcta.
  const authHeader = req.headers.get("Authorization");
  if (authHeader !== `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Mueve todas las tareas en_progreso → pendiente y borra el resultado provisional
  const { error, count } = await supabase
    .from("tareas")
    .update({ estado: "pendiente", resultado: null })
    .eq("estado", "en_progreso");

  if (error) {
    console.error("reset-ordenes-dia error:", error.message);
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const msg = `Reset completado: ${count ?? "??"} tareas devueltas a pendiente`;
  console.log(msg);

  return new Response(JSON.stringify({ ok: true, message: msg }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
