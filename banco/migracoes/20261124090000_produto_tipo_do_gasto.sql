-- Tipo do gasto (24/11/2026): quem anota pode escolher o tipo (Mercado, Saúde...).
-- Vazio continua valendo: o app adivinha o tipo pelo nome da compra.
-- Quem pode mudar: as mesmas regras de "lanc_mudar" (só quem lançou, no limite em que escreve).
alter table produto.lancamentos add column if not exists tipo text
  constraint lancamentos_tipo_curto check (tipo is null or char_length(btrim(tipo)) between 1 and 40);

grant update (tipo) on produto.lancamentos to authenticated;

comment on column produto.lancamentos.tipo is
  'Tipo escolhido por quem anotou (Mercado, Saúde...). Vazio: o app adivinha pelo nome.';
