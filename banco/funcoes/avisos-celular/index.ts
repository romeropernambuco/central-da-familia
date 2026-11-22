import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import postgres from "npm:postgres@3.4.5";
import { enviarAviso, gerarChavesVapid } from "./webpush.ts";

// Avisos no celular: o agendador do banco chama esta função todo dia às 19h de Recife (cron produto_avisos_celular).
// O texto vem pronto do banco (produto._avisos_do_dia): sem valor e sem nome. As chaves VAPID nascem aqui na 1ª vez
// e ficam em produto.servidor_segredos; a privada nunca sai do servidor. webpush.ts é CÓPIA de codigo/src/lib/webpush.ts.
const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { prepare: false, max: 1 });
const comoServico = <T>(f: (tx: any) => Promise<T>) =>
  sql.begin(async (tx: any) => { await tx`set local role service_role`; return await f(tx); }) as Promise<T>;
const CONTATO = "https://central-da-familia-eosin.vercel.app";

const segredo = async (nome: string): Promise<string | null> =>
  ((await comoServico((tx) => tx`select produto._servidor_segredo(${nome}) as v`)) as any[])[0]?.v ?? null;
const guardar = (nome: string, valor: string) =>
  comoServico((tx) => tx`select produto._servidor_guardar(${nome}, ${valor})`);

async function chaves() {
  let publica = await segredo("vapid_publica"), privada = await segredo("vapid_privada");
  if (!publica || !privada) {
    const novas = await gerarChavesVapid();
    // a privada primeiro: a pública só aparece para o app quando as 2 existem
    await guardar("vapid_privada", novas.privada);
    await guardar("vapid_publica", novas.publica);
    publica = await segredo("vapid_publica");
    privada = await segredo("vapid_privada");
  }
  return { publica: publica!, privada: privada! };
}

const json = (status: number, corpo: unknown) =>
  new Response(JSON.stringify(corpo), { status, headers: { "Content-Type": "application/json; charset=utf-8" } });

// comparação sem atalho: não deixa adivinhar o segredo pelo tempo da resposta
const iguais = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
};

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") return json(405, { erro: "use POST" });
    const esperado = await segredo("cron_avisos");
    if (!esperado || !iguais(req.headers.get("x-segredo") ?? "", esperado)) return json(401, { erro: "nao autorizado" });
    const corpo = await req.json().catch(() => ({}));
    const k = await chaves();
    if (corpo?.acao === "preparar") return json(200, { pronto: true });
    const lista = (await comoServico((tx) => tx`select endpoint, p256dh, auth, texto from produto._avisos_do_dia()`)) as any[];
    let enviados = 0, sairam = 0, falhas = 0;
    for (const a of lista) {
      try {
        const st = await enviarAviso(
          { endpoint: a.endpoint, p256dh: a.p256dh, auth: a.auth },
          JSON.stringify({ titulo: "Central da Família", texto: a.texto, abrir: "./#/inicio" }),
          k,
          CONTATO,
        );
        if (st === 404 || st === 410) {
          await comoServico((tx) => tx`select produto._celular_saiu(${a.endpoint})`);
          sairam++;
        } else if (st >= 200 && st < 300) {
          await comoServico((tx) => tx`select produto._celular_enviado(${a.endpoint})`);
          enviados++;
        } else falhas++;
      } catch {
        falhas++;
      }
    }
    // log só com números: sem endereço do aparelho e sem texto
    console.log(JSON.stringify({ funcao: "avisos-celular", aparelhos: lista.length, enviados, sairam, falhas }));
    return json(200, { aparelhos: lista.length, enviados, sairam, falhas });
  } catch (e) {
    console.log(JSON.stringify({ funcao: "avisos-celular", evento: "erro_interno", tipo: (e as Error)?.name ?? "erro" }));
    return json(500, { erro: "interno" });
  }
});
