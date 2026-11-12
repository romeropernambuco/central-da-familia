
-- Pastas visíveis por painel. Leem a mesma tabela docs e respeitam os mesmos acessos.
create view public.parcelas_dados with (security_invoker = true) as
  select colecao as pasta, doc_id as item, dados, atualizado_em from public.docs where painel = 'parcelas';
create view public.andreza_dados with (security_invoker = true) as
  select colecao as pasta, doc_id as item, dados, atualizado_em from public.docs where painel = 'andreza';
create view public.feira_dados with (security_invoker = true) as
  select colecao as pasta, doc_id as item, dados, atualizado_em from public.docs where painel = 'feira';
create view public.caixa_dados with (security_invoker = true) as
  select colecao as pasta, doc_id as item, dados, atualizado_em from public.docs where painel = 'caixa';
revoke all on public.parcelas_dados, public.andreza_dados, public.feira_dados, public.caixa_dados from anon;
grant select on public.parcelas_dados, public.andreza_dados, public.feira_dados, public.caixa_dados to authenticated;
;