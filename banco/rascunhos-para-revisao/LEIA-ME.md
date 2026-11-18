# Rascunhos de SQL para você revisar

**Nada aqui foi aplicado em nenhum banco, nem testado contra um banco de verdade.** Eu li o SQL atual
(migrações `rev_02`, `rev_04`, `f_02`, `f_04`) e gerei estes arquivos por script, partindo do texto original,
para não haver erro de transcrição. Antes de rodar no projeto de verdade, rode num projeto de teste ou
revise linha por linha.

Esta pasta **não** é a pasta `migracoes/`. Os arquivos não entram em nenhum fluxo automático.

## Ordem

1. Aplique a série `f_01` a `f_15` (roteiro em `roteiro-migracoes-supabase.md`).
2. **B_pagador_no_mesmo_gasto.sql** (depende da `f_04`). Depois rode a consulta de teste do bloco 8 e `produto.teste_tranca_f()`.
3. Publique o app novo.
4. **A_fechar_entrada_antiga_da_equipe.sql**, só depois do app novo estar no ar.

## O que cada arquivo faz

### A · Fechar a entrada antiga da equipe

A função antiga `produto.entrar_equipe(codigo)` aceita só os 4 números, sem o link do convite. O app
novo já usa `entrar_equipe_convite`, então a antiga pode morrer.

- Faz o mesmo que o **bloco 6** do `RODAR_NO_SUPABASE.sql`. **Não rode o bloco 6 junto: rode só este.**
- **Mais uma coisa que o bloco 6 não faz:** existe um teste no banco que exige que a entrada antiga
  continue funcionando (`CONTROLE entrada antiga (so os 4 numeros) continua`, dentro de
  `produto._teste_revisao()`). Sem ajustá-lo, `produto.teste_vazamento()` passaria a devolver **1 linha
  falhando** e pareceria que vazou algo. O arquivo troca esse teste para exigir o contrário.
- O ajuste do teste é feito no **texto vivo** da função (a `f_02` faz igual), então não apaga o
  ajuste que a `f_02` já faz nela.
- Os outros testes que chamam `entrar_equipe` esperam que ela **recuse**, então continuam passando.
- Desfazer: `A_desfazer.sql`.

### B · Gravar quem pagou na mesma transação do gasto

Hoje o app grava o gasto e depois faz um segundo passo para gravar o pagador. Se o segundo falha, o
gasto fica sem pagador. Este arquivo acrescenta um argumento opcional `pago_por` em
`produto.lancar_com_chave`, e o gasto e o pagador entram juntos ou nenhum entra.

- Quem chama com 9 argumentos continua funcionando. **O app atual funciona sem mudar nada.**
- Regras (confirme): `autor` continua sendo quem anotou, e o pagador **nunca** é preenchido sozinho. O
  pagador tem que ser membro ativo da mesma família, casal ou pessoa. O Assessor da Casa não informa
  pagador. A pessoa da família só consegue marcar a si mesma, porque só enxerga a própria linha em
  `membros`. Repetir a mesma chave não mexe no pagador.
- A diferença para o original da `f_04` é só a validação do pagador e o `pago_por` no `insert`.
- **Depois de aplicar**, uma mudança pequena no app passa a enviar `pago_por` junto. Peça ao Codex, é só
  app. Até lá, o app continua com o segundo passo.
- Desfazer: `B_desfazer.sql`.

## O que NÃO precisa de SQL (conferi)

- **"Ligar o login ao membro" (`membros.user_id`):** a coluna **já é legível**. O app lê `membros` com
  `select('*')` e já mapeia `user_id` quando ele chega. A política `membros_ver` deixa o casal ver todos
  e a pessoa ver a si mesma. O que falta é só o app usar isso em todo lugar. É trabalho do app.
- **Placar do casal no modo real:** o banco já entrega os envelopes, e a fórmula do "se continuar
  assim" (`projecao`) está no app. Dá para derivar o placar no app a partir dos envelopes, **desde que**
  o campo `pontual_mes` também venha do banco (não confirmei). É trabalho do app.
- **`lanc_mudar` com pagador:** não precisa de SQL novo, porque a coluna `pago_por` já tem permissão de
  `update` (`f_04`) e o app corrige por aí.

## O que continua dependendo de você e do banco

Saldo em conta real (aplicar a `f_11` e decidir a regra do cheque especial), dívidas, e os pedidos
listados em `codigo/DEFINICOES-PROVISORIAS.md` nas seções "Pedidos ao banco".
