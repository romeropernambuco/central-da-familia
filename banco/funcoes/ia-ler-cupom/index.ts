import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import postgres from "npm:postgres@3.4.5";
import { corsPara, MAX_BYTES, MSG, tratar, type Deps } from "./logica.ts";

const URL_SB = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
// Banco direto, sempre como service_role (o papel da chave de servico).
// Nao depende do schema "produto" estar exposto na API.
const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { prepare: false, max: 1 });
const auth = createClient(URL_SB, ANON, { auth: { persistSession: false } });

const comoServico = <T>(f: (tx: any) => Promise<T>) =>
  sql.begin(async (tx: any) => { await tx`set local role service_role`; return await f(tx); }) as Promise<T>;

const deps: Deps = {
  async usuarioDoToken(token) {
    const { data, error } = await auth.auth.getUser(token);
    return error || !data?.user ? null : data.user.id;
  },
  async reservar(r) {
    const x = await comoServico((tx) => tx`select produto.ia_reservar(${r.familia_id}::uuid, ${r.user_id}::uuid, ${r.funcao}, ${r.modelo}, ${r.custo_max}::numeric, ${r.teto}::numeric, ${r.teto_geral}::numeric) as j`);
    const j = (x as any[])[0]?.j ?? {};
    return { ok: j.ok === true, id: j.id, motivo: j.motivo, gasto: j.gasto === undefined ? undefined : Number(j.gasto) };
  },
  async fechar(id, ent, sai, custo) {
    await comoServico((tx) => tx`select produto.ia_fechar(${id}::uuid, ${ent}::int, ${sai}::int, ${custo}::numeric)`);
  },
  chaveIA: () => Deno.env.get("ANTHROPIC_API_KEY") || undefined,
  async chamarIA(chave, corpo) {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": chave, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify(corpo),
    });
    let json: any = null;
    try { json = await resp.json(); } catch { /* corpo vazio */ }
    return { status: resp.status, json };
  },
  // Log sem foto, sem CPF e sem conteudo do cupom: so evento, ids e numeros.
  log: (e) => console.log(JSON.stringify({ funcao: "ia-ler-cupom", ...e })),
};

const ORIGENS = (Deno.env.get("APP_ORIGENS") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
// Corpo maximo: a foto de 1,5 MB em base64 (x 4/3) mais uma folga pro resto do pedido.
const MAX_CORPO = Math.ceil(MAX_BYTES * 4 / 3) + 4096;

Deno.serve(async (req) => {
  const cors = corsPara(req.headers.get("Origin"), ORIGENS);
  const json = (status: number, corpo: unknown) =>
    new Response(JSON.stringify(corpo), { status, headers: { ...cors, "Content-Type": "application/json; charset=utf-8" } });
  try {
    // Recusa pedido grande demais antes de ler o corpo (nao gasta memoria nem IA)
    const tam = Number(req.headers.get("content-length") ?? "0");
    if (req.method === "POST" && tam > MAX_CORPO) return json(413, { erro: MSG.grande });
    const lerCorpo = async () => {
      const texto = await req.text();
      if (texto.length > MAX_CORPO) throw new Error("grande");
      return JSON.parse(texto);
    };
    const r = await tratar(req.method, req.headers.get("Authorization"), lerCorpo, deps);
    if (r.status === 204) return new Response(null, { status: 204, headers: cors });
    return json(r.status, r.corpo);
  } catch (e) {
    console.log(JSON.stringify({ funcao: "ia-ler-cupom", evento: "erro_interno", tipo: (e as Error)?.name ?? "erro" }));
    return json(500, { erro: MSG.interno });
  }
});
