-- Desfaz f_01. Rodar só depois de desfazer f_02 a f_10 (as políticas da f_02 usam estas funções).
drop function if exists produto.meus_envelopes_escrita();
drop function if exists produto.meu_membro(uuid);
drop function if exists produto.envelopes_que_ajusto();
drop function if exists produto.meus_cartoes_escrita();
