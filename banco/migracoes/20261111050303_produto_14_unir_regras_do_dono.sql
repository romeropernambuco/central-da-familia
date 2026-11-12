alter policy eventos_ver on produto.eventos using (
  (familia_id in (select produto.familias_com_papel('casal')))
  or ((select auth.uid()) in (select d.user_id from produto.donos_produto d)));
alter policy familias_ver on produto.familias using (
  (id in (select produto.minhas_familias()))
  or ((select auth.uid()) in (select d.user_id from produto.donos_produto d)));
-- as regras separadas do dono ficam inertes (só service_role, que já ignora RLS); apagar quando houver confirmação manual
alter policy eventos_ver_dono on produto.eventos to service_role using (false);
alter policy familias_ver_dono on produto.familias to service_role using (false);
;