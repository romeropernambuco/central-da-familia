# Escritório · Leia primeiro

```
                    ESCRITÓRIO DA FAMÍLIA · 5 cadernos · 91 passos · 146 testes

  +-----------+   +-----------+   +-----------+   +-----------+   +-----------+
  |   11-D    |   |   11-C    |   |   11-B    |   |   11-E    |   |   11-F    |
  | DINHEIRO  |   | CONFIANÇA |   |  CUSTO,   |   |  TELA E   |   | ESCRITÓRIO|
  | certo em  |   | no número |   |  SAÚDE E  |   | INTERAÇÃO |   |   EM 3D   |
  | cada      |   | e na IA   |   | NOVIDADES |   |           |   |           |
  | ajudante  |   |           |   |           |   |           |   |           |
  +-----------+   +-----------+   +-----------+   +-----------+   +-----------+
   as contas       o carimbo       o teto e        o cartão        o modo novo,
   do banco        e a tranca      a escala        curto           3 fases

  ORDEM:  D (contas) -> C -> D (pendência e tom) -> B -> D (fechamento)
          -> E -> B (placar) -> F fase 1 -> piloto -> F fases 2 e 3
          A tela da 11-E (passos 1 a 15) pode andar ao lado, com dados de exemplo.
```

## 1. O que é esta pasta (5 linhas) e a essência que não pode quebrar

1. Esta pasta tem o passo a passo pra construir os ajustes finais do módulo Escritório (Tarefa 11 das Diretrizes).
2. São 5 cadernos de construção, 1 base comum de nomes e números, e este índice.
3. Cada caderno termina com 1 "ordem de serviço pronta pra colar" pro agente programador.
4. Quem manda, em ordem: Diretrizes do CEO, depois `00-base-comum.md`, depois o caderno, depois o resumo `docs/tarefa-11-escritorio-ajustes-finais.md`.
5. Todo teste usa a família Silva (exemplo), na terça, 24/11/2026, 9h00, fuso de Recife. Nada toca família real nem o projeto de hoje no Supabase.

**A essência que nenhum caderno pode quebrar:**

1. 8 ajudantes com nome, função fixa e horário.
2. Fila "Depende de você", separada em "Pra decidir" e "Pra informar".
3. Fonte em cada número.
4. Família separada de empresa.
5. O ajudante sugere. Nunca envia, paga, aplica nem apaga.
6. Conta é do banco. A IA só escreve o destaque e a ação.
7. Personagens na cena e 1 cor de destaque (verde).
8. Mudar sem quebrar: mesmas telas, mesma ordem, mesmos blocos.

## 2. Mapa dos cadernos (tabela: arquivo, pra que serve, nº de passos, nº de testes, quem deve ler)

| Arquivo | Pra que serve | Passos | Testes | Quem deve ler |
|---|---|---|---|---|
| `00-base-comum.md` | Palavras, nomes, 7 situações e números da família Silva | 0 | 0 | todos, antes de tudo |
| `11-D-dinheiro-certo-em-cada-ajudante.md` | A conta de cada ajudante, o livre de R$ 920, o tom, o Fechamento do mês | 15 | 36 | agente de banco e IA; economista; contador |
| `11-C-confianca-no-numero-e-na-ia.md` | Número com carimbo, IA que falha, nunca 2 vezes, privacidade, pendência | 14 | 26 | agente de banco e segurança; advogado |
| `11-B-custo-saude-novidades.md` | Custo e teto de IA, escala, saúde, novidades, placar | 15 | 26 | agente de banco e IA; dono (painel) |
| `11-E-tela-e-interacao.md` | Tela curta, cartão em 3 níveis, 7 situações, 6 fluxos | 18 | 30 | agente de telas; dono (prints) |
| `11-F-escritorio-em-3d.md` | Modo 3D opcional, em 3 fases | 29 (18 + 6 + 5) | 28 | agente de telas 3D; dono (iPhone) |
| **Soma** | | **91** | **146** | |

## 3. Ordem de construção (tabela passo a passo, com o que cada passo precisa de pronto antes, citando caderno e nº do passo, e as Tarefas das Diretrizes de que depende)

A ordem do resumo antigo punha a 11-D inteira antes da 11-C. Não funciona: a 11-C chama as contas da 11-D, e a 11-D abre pendência pela 11-C. Por isso a 11-D entra em 3 partes.

| Etapa | Caderno e passos | O que fica pronto | Precisa pronto antes | Tarefas das Diretrizes |
|---|---|---|---|---|
| 1 | 11-D, passos 1 a 8 | Regras aprovadas, semeadura conferida, 36 testes escritos, previsão única, as 8 contas | decisões 1, 2 e 3 da parte 6 | 2, 3 e 4. Pros ajudantes que leem delas: 8, 10 e 19 (sem elas, eles ficam "Perguntando") |
| 2 | 11-C, passos 1 a 11 | Carimbo, tranca, conferência fechada, acesso, troca de nomes, conferidor, função de servidor, pendência, "Agora não", "Ajudou", aviso seguro | etapa 1 (11-D passos 4 a 8); decisões 4 e 5 | 2, 3, 4, 5, 7 e 11 (as tabelas do Escritório no projeto novo) |
| 3 | 11-D, passos 9, 10, 11 e 13 | Piso de R$ 50 que vira pendência, perguntas, tom e termos proibidos, teste noturno | etapa 2 (11-C passos 7, 8 e 9); decisão 7 | 5 |
| 4 | 11-B, passos 1 a 8 | Preços, colunas de custo, teto com reserva, escala em tabela, rotina de 10 minutos | etapa 2 (11-C passos 1, 3 e 8); decisão 6 | 8 (dia de fechamento do cartão) |
| 5 | 11-B, passos 9 a 13 | Saúde, novidades, time com data, frase do resumido, página de custo do dono | etapa 4 | 14, ou a página simples da pergunta 5 da 11-B |
| 6 | 11-D, passos 12, 14 e 15 | Fechamento no 1º dia útil, aviso da tela, rodada final da 11-D | etapa 4 (11-B passo 7); decisão 2 | 15 (texto do aviso com o advogado) |
| 7 | 11-C, passo 12 | 4 sinais de confiança no painel do dono | etapa 5 (11-B passo 13) | 14 |
| 8 | 11-E, passos 1 a 15 | A tela inteira com o arquivo de exemplo | nada do banco. Pode começar junto com a etapa 1 | 6 e 7 |
| 9 | 11-E, passos 16 a 18 | Tela ligada ao banco, função única de situação, 30 testes | etapas 2 a 6 | 7 |
| 10 | 11-C, passos 13 e 14 | Faixa "Sem internet" e rodada final da 11-C | etapa 8 (11-E passo 13) | nenhuma |
| 11 | 11-B, passos 14 e 15 | Placar e conferência final da 11-B | etapa 9 | 14 |
| 12 | 11-E, itens 10 e 11 da ficha | Domingo do casal e aviso que abre na pendência | etapa 9 | 20 |
| 13 | 11-F, passos 1.1 a 1.18 | Modo 3D, fase 1 | etapa 9 aprovada no iPhone do dono; pergunta da câmera (parte 7) | nenhuma |
| 14 | 11-F, passos 2.1 a 2.6 e 3.1 a 3.5; item 12 da 11-E; cópia sem internet da 11-C | Ao vivo, linha do tempo, lugares úteis, perguntar sobre o relatório | fase anterior aprovada; depois do piloto | 12 e 20 |

Regras da ordem:

1. A escala só é ligada sozinha depois da etapa 4 testada (T-B01 a T-B12) e com preço real inserido.
2. Nenhuma etapa começa com teste falhando na etapa anterior.
3. Mudei 3 coisas em relação à parte 12 antiga do resumo: a 11-D em 3 partes; o passo 12 da 11-C depois do painel da 11-B; a faixa "Sem internet" da 11-C junto da peça de tela da 11-E. O resumo já está corrigido.

## 4. Quem cria o quê (tabela única de TODAS as tabelas, colunas e funções novas: nome, caderno dono, quem mais usa)

Regra: 1 dono por objeto. Quem não é dono não cria, só usa. O tipo de `escritorio_turnos.id` neste pacote é `uuid`; se a Tarefa 11 criou outro, vale o dela em todos os cadernos.

**Tabelas e colunas**

| Nome | Dono | Quem mais usa |
|---|---|---|
| `escritorio_turnos`: `numeros`, `dados_ate`, `versao_conta`, `previsto_para`, `aberto_por`, `origem`, `corrige_turno_id`, `texto_situacao`, `sem_texto_motivo`; 2 índices únicos sobre `chave` | 11-C | 11-B, 11-D, 11-E, 11-F |
| `escritorio_turnos`: `modelo_id`, `tokens_entrada`, `tokens_saida`, `custo_brl`, `preco_id`, `ia_decisao`, `ia_reserva_brl`, `ia_reserva_em`, `ia_reserva_devolvida_em`, `resumido`; permissão por coluna | 11-B | 11-C (motivo), 11-E e 11-F (só `resumido`) |
| `escritorio_pendencias` (com `tipo`, `dono_id`, `vence_em`, `cobrada_em`, `resolvida_*`, `adiada_*`) | 11-C | 11-D, 11-E, 11-B (placar) |
| `escritorio_avaliacoes` | 11-C | 11-E, 11-B (placar) |
| `escritorio_trilha` | 11-C | 11-D ("Vimos juntos"), 11-E |
| `escritorio_ia_envios` | 11-C | ninguém logado; só testes e sinais |
| `ia_precos`, `ia_gasto_mes` | 11-B | Tarefa 12 (mesmo teto) |
| `escritorio_escala` (tipos `dia_do_mes`, `primeiro_dia_util`, `dia_da_semana`, `apos_fechamento_cartao`) | 11-B | 11-D (Fechamento), 11-E, 11-F |
| `escritorio_funcionarios.modelo`, `pessoas.escritorio_visto_em`, `produto_donos` (rascunho) | 11-B | painel do dono |
| `escritorio_parametros` (piso, meta de semanas, teto de parcela) e a tabela de termos proibidos | 11-D | 11-C (conferidor) |

**Funções do banco e do servidor**

| Nome | Dono | Quem mais usa |
|---|---|---|
| `previsao_unica`, `gasto_semanal_base` | 11-D | as 5 contas do dinheiro |
| `conta_contador`, `conta_cartao`, `conta_vencimentos`, `conta_folha`, `conta_colchao`, `conta_comprador`, `conta_auditor`, `conta_presenca` (devolvem também `legenda_curta` e `comparacao_curta`) | 11-D | 11-C (abrir com carimbo), 11-E (cartão) |
| `escritorio_comparar_assuntos`, `escritorio_marcar_vimos_juntos` | 11-D | Tarefa 5; 11-E |
| `escritorio_abrir_turno` (reescrita), gatilho de conferência fechada, `escritorio_fechar_interrompidas` | 11-C | 11-B (rotina), 11-E ("Rodar agora") |
| Função de servidor `escritorio-conferir` (com `mascarar`, `desmascarar`, `conferir`, IA simulada) | 11-C | 11-B acrescenta a contagem e a reserva; 11-D acrescenta as instruções |
| `escritorio_abrir_pendencia`, `escritorio_resolver_pendencia`, `escritorio_desfazer_resolvi`, `escritorio_adiar_pendencia`, `escritorio_desfazer_adiamento`, `escritorio_responder_pergunta`, `escritorio_avaliar_relatorio` | 11-C | 11-D, 11-E |
| `escritorio_conta_mudou`, `escritorio_refazer_conta`, `aviso_seguro`, `escritorio_sinais_confianca`, `escritorio_tela` | 11-C | 11-E; Tarefa 20; painel do dono |
| `ia_mes_ref`, `ia_preco_vigente`, `ia_custo_brl`, `ia_teto_para`, `ia_definir_teto`, `ia_reservar`, `ia_reservar_valor`, `ia_devolver_reservas_vencidas` | 11-B | 11-C (passo 5 do caminho), Tarefa 12 |
| `escritorio_fechar_turno` (estendida com custo) | 11-B | 11-C fecha por ela |
| `escritorio_proximo_horario`, `escritorio_ligar_escala`, `escritorio_rotina`, `escritorio_agora`, agendamento `escritorio-rotina-10min` | 11-B | 11-C e 11-D (testes com relógio) |
| `escritorio_saude`, `escritorio_rodar_atrasadas`, `escritorio_novidades`, `escritorio_marcar_visto`, `escritorio_time` | 11-B | 11-E |
| `ia_painel_custo`, `ia_painel_custo_ajudantes`, `escritorio_placar`, `eh_dono_produto` (rascunho) | 11-B | Tarefa 14 |
| `escritorio_estado` (situação dos 8, 7 valores, palavra pronta) | contrato: 11-F, parte 6. Construção: 11-E, passo 16 | 11-C (`escritorio_tela`), cena pixel, cena 3D, cartões |
| `escritorio_linha_do_dia` | 11-F, fase 2 | só a cena 3D |

**Peças de tela com 2 cadernos encostando**

| Peça | Dono | Quem só entrega o dado |
|---|---|---|
| `LinhaSaude`, `LinhaNovidades` | 11-E (a 11-B cria a 1ª versão no mesmo arquivo) | 11-B |
| `CartaoAjudante`, `SinalDeSituacao`, `FaixaSemInternet` | 11-E | 11-C (textos e regra), 11-B (frase do resumido) |
| Cena 3D e etiquetas | 11-F | 11-E (sinal do cartão) |

## 5. Como colocar os agentes pra trabalhar (passo a passo literal pro dono: qual ordem de serviço colar primeiro, o que esperar de volta, o que conferir antes de liberar o próximo; 1 agente por caderno; quem revisa quem, já que ninguém revisa o próprio trabalho)

Use 1 agente por caderno, cada um numa conversa nova e num ramo próprio. Cada agente para 2 vezes: no plano (espera "aprovado") e antes de publicar (espera "pode publicar").

| Agente | Caderno | Quem revisa o trabalho dele |
|---|---|---|
| A | 11-D | o agente B (ele usa as contas) |
| B | 11-C | o agente C (ele usa a tranca e o carimbo) |
| C | 11-B | o agente D (ele usa saúde, novidades e a frase do resumido) |
| D | 11-E | o agente E (ele usa a função de situação) |
| E | 11-F | o agente D (ele é dono do sinal do cartão) |

Passo a passo:

1. Responda as 7 decisões da parte 6. Sem elas o agente A para no passo 1.
2. Confira que as Tarefas 2, 3 e 4 estão prontas. Se não estão, pare aqui.
3. Abra o agente A. Cole a ordem de serviço da seção 11 do caderno 11-D. Diga: "faça só a 1ª etapa, itens 1 a 6, 8 e 9".
4. Espere de volta: as regras em português simples e as 12 perguntas. Responda e escreva "aprovado".
5. Espere de volta: lista dos testes T-D01 a T-D05, T-D11, T-D14 a T-D17, T-D22, T-D28 a T-D31 passando. Confira você mesmo 3 números: livre R$ 920, 9 semanas, R$ 2.700 em 10 dias.
6. Abra o agente B. Cole a ordem de serviço da seção 9 do caderno 11-C. Diga: "faça os itens 1 a 11; o 12 e o 13 esperam".
7. Antes de aprovar o agente B, peça ao agente C (ainda sem tarefa) pra ler o que o B fez e listar o que falta pra ele. Confira: IA desligada, o número sai (T-C02); 2 toques, 1 conferência (T-C11); a cozinheira e a filha leem 0 linha (T-C16, T-C17).
8. Volte ao agente A: "faça a 2ª etapa, itens 7, 10 e 12". Confira: achado de R$ 32 não vira pendência; divergência provocada vira 1 alerta (T-D06).
9. Abra o agente C. Cole a ordem de serviço da seção 9 do caderno 11-B. Confira antes de liberar: 2 conferências ao mesmo tempo não furam o teto (T-B09); a família não vê custo (T-B13). Só então ele agenda a rotina.
10. Volte ao agente A: "faça a 3ª etapa, itens 11, 13 e 14". Confira o Fechamento de novembro: R$ 360, R$ 290 a mais, 9 semanas.
11. O agente D pode ter começado antes, com o arquivo de exemplo (passos 1 a 15 da 11-E). Cole a ordem de serviço da seção 14 do caderno 11-E. Agora libere os passos 16 a 18. Confira no seu iPhone: a 1ª pendência aparece sem rolar; "Resolvi" e "Desfazer"; "Agora não".
12. Volte ao agente B (passos 12 a 14 da 11-C) e ao agente C (passos 14 e 15 da 11-B, com a Tarefa 14 pronta).
13. Só com a tela aprovada no seu iPhone: abra o agente E e cole a 1ª ordem de serviço da seção 14 do caderno 11-F (fase 1). Ele para depois do passo 1.8 pra você aprovar a câmera pelo print.
14. Fases 2 e 3 do 3D, item 12 da 11-E e a cópia sem internet: só depois do piloto.

O que todo agente devolve no fim: lista "teste, passou ou falhou"; prints no iPhone e no Windows; arquivos e tabelas tocados; 0 aviso de segurança; como voltar à versão anterior em 1 clique.

## 6. Decisões do dono que travam o começo (só as que impedem começar; cada uma com recomendação e qual passo ela trava)

| # | Decisão | Recomendação | Trava |
|---|---|---|---|
| 1 | Aprovar as regras de dinheiro da 11-D (seções 4, 5 e 6), em especial: "a fatura cabe" contra o livre do mês do vencimento | Aprovar. É a mesma conta do Contador, então os 2 nunca divergem | 11-D passo 1 |
| 2 | O 1º dia útil do Contador olha feriado? A base comum já foi corrigida: em novembro/2026 o Contador roda na terça, 03/11, porque 02/11 é feriado (Finados)| Olhar feriado. Corrigir a base pra terça, 03/11 | 11-D passo 12; 11-B passo 7 |
| 3 | Qual é o retrato da família Silva em 24/11? Pela regra da 11-D, quase todo ajudante teria pendência aberta. A tela da 11-E e a cena da 11-F mostram só 3 coisas esperando, com o Analista de Cartão "Perguntando" | A semeadura segue a 11-D e a base comum. O retrato da 11-E vale só como cenário de tela (arquivo de exemplo), supondo que o casal já resolveu as outras pendências | 11-D passo 2; 11-E passo 3 |
| 4 | Um do casal lê o relatório com o gasto do outro? | Sim, sabendo de quem é cada coisa (regra de 13/11) | 11-C passo 5 |
| 5 | A pendência ganha tabela própria, e "Agora não", "Ajudou" e "Responder" ficam no banco pela 11-C? | Sim. Não tinham dono em nenhum caderno; sem isso não há tranca nem placar | 11-C passos 2 e 9 |
| 6 | Teto de IA de R$ 2,49 por família por mês, somando Escritório e Tarefa 12; forte só pro Contador e pro Analista de Cartão | Sim nos 2 | 11-B passos 3 e 4 |
| 7 | "Pra informar" quer dizer o quê? Na 11-E é "um dado que o ajudante precisa". Na 11-D era "só avisa" | Vale a 11-E: a casa informa 1 dado ou confirma. Só "Pra decidir" vira "Precisa de você". A 11-D já foi ajustada | 11-D passo 9; 11-E passo 7 |

## 7. Decisões que podem esperar (as demais perguntas em aberto dos 5 cadernos, sem repetir, com recomendação)

| # | Pergunta | Recomendação | Caderno |
|---|---|---|---|
| 1 | Câmera do 3D. Opção A: de frente e vista de cima, como o pixel. Opção B: na diagonal, como o 3D de hoje, com etiqueta sem a palavra no celular | Opção A. Na diagonal a etiqueta com palavra não cabe em 390 px. Aprovar pelo print do passo 1.8 | 11-F |
| 2 | 3D como modo opcional ou no lugar do pixel? | Modo opcional. O pixel continua padrão e plano B | 11-F |
| 3 | Ajudante atrasado e com pendência: qual sinal aparece? | "Atrasado" primeiro, como a 11-E manda. Alternativa: primeiro o que depende da casa | 11-E, 11-F |
| 4 | Insight forte toda semana ou só no mês? | Só no mês | 11-B |
| 5 | Piso pra achado virar pendência | R$ 50 por mês, calibrar no piloto | 11-D |
| 6 | Alerta de 80% do teto chega por onde? Onde fica o custo antes da Tarefa 14? | Só no painel do dono; 1 página simples até a Tarefa 14 | 11-B |
| 7 | A família muda dia e hora dos ajudantes no piloto? | Não. Só o dono, a pedido | 11-B |
| 8 | Com o teto estourado, a leitura de cupom para? | Continua no leve até 150%; depois a pessoa digita | 11-B |
| 9 | Sem internet: faixa agora e cópia no aparelho depois do piloto, por 7 dias? | Sim | 11-C |
| 10 | Guardar por quanto tempo o que foi enviado à IA? | 30 dias, com marcador, sem acesso de ninguém logado | 11-C |
| 11 | Número solto, sem R$ nem %, também derruba o texto da IA? | Sim | 11-C |
| 12 | Conferência interrompida fecha como "Entregue" só com número? Toque depois de 2 minutos abre outra e conta no limite de 3? | Sim nos 2 | 11-C, 11-B |
| 13 | "Resolvido por Marina" aparece pro Carlos? | Sim | 11-C |
| 14 | O que fica do limite no fim do mês vai pro guardado? | Sim, em linha separada. Até decidir, só mostrar | 11-D |
| 15 | A cesta do Comprador é termômetro de preço ou a compra da semana? | Termômetro de preço | 11-D |
| 16 | Tabela da folha conferida por contador: quem mantém e onde nasce? | Tabela do produto, na Tarefa 19, conferida antes do piloto | 11-D |
| 17 | Meta de semanas da reserva; teto de parcela nova; tabela `escritorio_parametros` | A família escolhe a meta; R$ 200; sim, por família | 11-D |
| 18 | "Vimos juntos" pede o toque dos 2? O teste noturno refaz conta sozinho? | Não nos 2 | 11-D |
| 19 | O verbo "sobrar" pode aparecer na tela? A folha com data entra nos 10, 30, 60 e 90 dias da Agenda? | Sim como verbo do mês; sim, em linha própria | 11-D |
| 20 | Botão verde do cartão fechado resolve ou abre? "Resolvi" grava na hora? | Abre o cartão; grava na hora e "Desfazer" reverte | 11-E |
| 21 | 4 colunas a partir de 1.200 px e cena com até 400 px de altura no computador? | Sim. Sem isso não cabe em 2.600 px | 11-E |
| 22 | Anel de "Conferindo agora": 4 voltas e para? | Sim | 11-E |
| 23 | Chave "Só o que depende de mim": lembra no aparelho e mostra pendência de quem? | No aparelho; do dono logado e as sem dono | 11-E |
| 24 | Pendência "Pra informar" abre o cartão sozinha? Dá pra adiar 2 vezes? | Não nos 2 | 11-E |
| 25 | Texto do botão do 3D; o que o quadro de metas abre; vagas na frente; reunião de segunda | "Ver em pixel"; o resumo do topo; 3 e 6; de 6h00 até abrir o resumo ou 12h00 | 11-F |
| 26 | Gerente que encaminha pedido entra no piloto? Ligar já as 10 conferências da nossa família? | Não nos 2 | resumo |

## 8. O que ainda não foi medido ou confirmado (preço de modelo, iPhone de verdade, advogado, contador)

**Não medido**

1. Preço real dos 2 modelos e o dólar. Os testes usam preço fictício. O dono confirma na página oficial no dia de ligar.
2. Tamanho de cada conferência em tokens. Os R$ 0,44 de novembro são estimativa.
3. iPhone de verdade no 3D: quadros por segundo, calor, bateria, memória, perda da cena ao ir pro fundo.
4. Tema escuro do 3D, leitor de tela, tamanho real do pedaço 3D (130 a 190 KB é estimativa).
5. Limite de tempo da função de servidor no plano contratado, e quantos avisos ao vivo o plano permite.
6. Altura da barra de abas do app (a 11-E reservou 224 px).

**A confirmar com advogado (Tarefa 15):** envio de dado ao fornecedor de IA e o que ele guarda; marcador no lugar do nome pra dado de filho e de empregado; prazo de guarda dos envios e da trilha; texto do aviso da tela; se "Uma saída: ..." pode ser lida como recomendação; presença e consumo ligados à equipe.

**A confirmar com contador:** a tabela inteira da folha (datas de 13º e férias, percentuais, encargos); férias dentro do custo de 12 meses.

**Divergências que sobraram depois da conferência (não estão resolvidas):**

1. Resolvido na base comum (parte 6.1): o Analista de Cartão está "Perguntando" porque entrou 1 cartão novo sem dia de fechamento. Sobra 1 ponto: a Folha aparece "Entregue" com 1 pendência de informar aberta; o agente da 11-C confirma se pendência aberta muda a situação do cartão.
2. Texto do cartão fechado: a 11-D escreve legenda e comparação longas; a 11-E precisa de 1 linha. Ficou a regra (a conta devolve `legenda_curta` e `comparacao_curta`), mas a 11-D só traz o texto curto dos 8 exemplos pela tabela 6.1 da 11-E.
3. Tipo de `escritorio_turnos.id`: ficou `uuid` nos 2 cadernos, a confirmar com o que a Tarefa 11 criar.
4. `escritorio_estado` nasce no passo 16 da 11-E, mas o contrato está na 11-F. O agente da 11-E precisa ler a parte 6 da 11-F.
5. Os exemplos de texto da 11-D que diziam "Precisa de você (Pra informar)" foram trocados; os testes T-D não conferem a parte da fila, só o status.

**Erros achados na base comum (não editei; o dono decide):**

1. Resolvido: a base agora põe o Contador de novembro em 03/11, porque 02/11 é feriado.
2. Resolvido: a base ganhou a parte 6.1, com a situação e as pendências de cada ajudante em 24/11.
3. A base não abre o gasto de R$ 8.240 por pessoa e Casa, nem as presenças da semana. A 11-D criou: Casa R$ 4.410 de R$ 5.000; 38 presenças; consumo de R$ 1.444.
