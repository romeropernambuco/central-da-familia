# 🫀 Central da Família: o corpo inteiro

Documento mãe. Mostra cada órgão da Central, o que ele faz, como os órgãos se ligam e em que ordem o corpo é montado.
Cada órgão tem o seu contexto detalhado nesta mesma pasta.

A Central é da família: Romero, Andreza, os 3 filhos e a equipe da casa. Cada órgão diz para quem serve, quem vê e quem mexe. Órgão que serve só ao Romero é marcado como **pessoal** e nunca passa na frente de um órgão da casa sem motivo escrito.

Versão 2 (25/11/2026): revisada por 4 especialistas (TDAH adulto, designer de serviço para famílias, planejador financeiro, pesquisador de usabilidade). O que mudou está em `revisao-especialistas.md`.

---

## 🧭 Mapa mental

```
                   🦴 ESQUELETO
          Supabase, tabela docs, login
                        │
🩸 SANGUE ─────── [ CENTRAL DA FAMÍLIA ] ─────── 🏠 CASA
Parcelas, Caixa,                          Escritório, Agenda,
Orçamento Andreza, Feira                  Saúde, Crianças
                        │
     🧠 MENTE (pessoal) ─────────────── ⏱️ RITMO E MÃOS
   Jardim, Aprendizados               Foco, Portfólio
```

---

## 👨‍👩‍👧‍👦 1. Quem é quem na Central

| Pessoa | O que a Central faz por ela | Vê | Mexe |
|---|---|---|---|
| Romero | Dinheiro, foco, carreira, aprendizado | Tudo | Tudo |
| Andreza | Orçamento dela, feira, agenda e saúde da família, parte do casal no domingo | Orçamento, feira, agenda, saúde, Caixa (só bolso família) | Orçamento, agenda, saúde |
| 3 filhos | Rotina, saúde e agenda cuidadas sem depender da memória dos pais | Nada (não usam a Central) | Nada |
| Equipe da casa | O passo a passo do próprio turno, em frase simples | Só o cartão do próprio turno e a ficha de emergência | Só "feito" e "não deu" no próprio turno |
| Jobson | Lista da feira | Feira | Feira |

Ninguém da equipe vê dinheiro da família, Portfólio, Foco, Aprendizados ou Jardim.
[confirmar: quem é a equipe da casa hoje e a função de cada um]

---

## 🧍 2. Os órgãos

| Órgão | Parte do corpo | Para quem | Faz o quê | Estado |
|---|---|---|---|---|
| 🦴 **Base** | Esqueleto | Todos | Banco de dados, login, 1 lugar pra cada coisa | ✅ no ar |
| 🩸 **Parcelas e Caixa** | Sangue e coração | Família | Dinheiro entrando, saindo, dívidas, colchão | ✅ Parcelas no ar · Caixa vazio |
| 👛 **Orçamento da Andreza** | O outro lado do coração | Família | Dinheiro que Andreza administra. Ela mexe, Romero vê | 🟡 existe, falta migrar |
| 🛒 **Feira da Casa** | Estômago | Família | Compras da casa. Jobson mexe, Andreza vê | 🟡 existe, falta migrar |
| 💪 **Escritório da Família** | Músculos | Casa | Equipe da casa: turnos e o passo a passo de cada dia | 🟡 tabelas criadas |
| ⏱️ **Foco e tempo** | Sistema nervoso | Pessoal | Transforma o que os outros órgãos pedem em horas do dia | 📄 contexto pronto |
| ✋ **Portfólio** | Mãos | Pessoal | O que eu fiz e entreguei, com prova | 📄 contexto pronto |
| 🧠 **Aprendizados** (painel `banco`) | Memória | Pessoal | O que aprendi e onde apliquei | 📄 contexto pronto |
| 👁️ **Jardim** | Olhos | Pessoal | O que eu vejo e me inspira | 📄 contexto pronto |

### 🔮 Órgãos que ainda não existem
1. 📅 **Agenda da família (1º da fila, fase 3):** escola, aniversários, médico, quem leva e quem busca. Andreza mexe; o motorista vê só o "quem leva quem" do dia dele.
2. 🫁 **Saúde da família:** consultas, vacinas, alergias e remédios das 3 crianças, de Andreza e do Romero. A babá vê só a ficha de emergência.
3. 👧 **Crianças:** rotina de cada filho (acordar, escola, banho, dormir). Não é tela pra criança usar; é o que a casa precisa saber.
4. 🆘 **Emergência da casa:** quem chamar, em que ordem, endereço completo, o que fazer nos 5 primeiros minutos. Impresso na geladeira também.
5. 🧾 **Folha da equipe:** salário, férias, 13º e eSocial de cada funcionário da casa. Sempre no bolso família.
6. 🗂️ **Documentos e jurídico:** contratos, escrituras, prazos, sócios.
7. 🚀 **Negócio novo:** próxima fase, depois do caixa ajustado, em projeto Supabase próprio.

---

## 🔁 3. Como o sangue circula entre os órgãos

```
👁️ Jardim ──► 🧠 Aprendizados ──► ⏱️ Foco ──► ✋ Portfólio
  vi algo        aprendi           fiz no dia   entreguei, com prova
                                      ▲
                                      │
                    🩸 Parcelas manda vencimentos e tarefas de dinheiro
```

| De | Para | O que passa | Exemplo |
|---|---|---|---|
| Parcelas | Foco | Vencimento vira tarefa com prazo | "Pagar fatura do cartão até dia 10" |
| Escritório | Caixa | Folha e DAE do eSocial viram saída certa | "DAE da casa vence dia 7" |
| Jardim | Aprendizados | Referência vira aprendizado | Post sobre negociação vira "ancore com número" |
| Aprendizados | Foco | "Como aplicar" vira tarefa do dia | "Mandar proposta ao credor com valor fechado" |
| Foco | Portfólio | Tarefa importante concluída vira entrega | "Renegociei dívida X": a economia é calculada pelo Parcelas, o Portfólio só aponta para ela |
| Aprendizados | Portfólio | Aprendizado aplicado vira prova | "Curso de negociação, aplicado em 4 conversas" |

### 📏 Regras das ligações
1. **Cada dado mora num órgão só.** A ligação guarda apenas o endereço `{painel, colecao, doc_id}`. A dívida continua no Parcelas, mesmo quando vira tarefa no Foco.
2. **Regra dos 3 bolsos.** Todo dado e toda tarefa de dinheiro carrega o campo `bolso`: `familia`, `empresa` ou `campanha`. Só o bolso família entra no Parcelas, no Caixa, na feira e no domingo do casal. Empresa e campanha nunca somam, nunca se compensam e nunca aparecem na mesma tela. Sem bolso marcado, o item fica em "a separar" e não entra em conta nenhuma.
3. **Empresa só entra na família pela retirada combinada, depois de paga.** Quando existir, a empresa ganha projeto Supabase próprio.

### 💰 Quais ligações valem dinheiro

| Ligação | O que vale em R$ | Veredito |
|---|---|---|
| Parcelas → Foco | Evita multa de 2% (CDC, art. 52) e juros. Uma fatura de R$ 3.000 no rotativo custa perto de R$ 480 num mês (estimativa) [confirmar taxa do mês no [Banco Central](https://www.bcb.gov.br/estatisticas/txjuros)] | **Economia. Entra na fase 2** |
| Escritório → Caixa | DAE da casa vence dia 7; atraso tem multa diária [confirmar percentual] | **Economia. Fase 3** |
| Portfólio → kit | Pode abrir receita. Fica fora do plano base até ter contrato assinado com valor e data | Receita possível, não certa |
| Jardim, Aprendizados e as demais | Zero em R$ | Depois do caixa ajustado |

---

## 🦴 4. Esqueleto técnico (vale pra todos)

1. **1 banco:** Supabase `central-da-familia`, tabela `docs`. Cada órgão é um `painel`: `parcelas`, `andreza`, `feira`, `foco`, `portfolio`, `banco`, `jardim`. Exceção que já existe: o Escritório usa `escritorio_funcionarios` e `escritorio_turnos` [decidir: manter ou migrar para `docs`].
2. **Cada órgão tem `resumo/atual`:** é dele que a tela principal da Central lê o número de topo.
3. **1 site:** cada órgão é uma página deste repositório (`/parcelas/`, `/foco/`, `/portfolio/`, `/banco/`, `/jardim/`), instalável no iPhone.
4. **1 IA:** Claude Haiku 5.5, o mais barato da linha, chamado por Edge Function do Supabase. A chave nunca fica na página. Crédito pré-pago com **limite de US$ 2 por mês** no Console da Anthropic: se passar, a IA para e o app segue sem ela.
5. **Arquivos:** Supabase Storage, um bucket privado por órgão. A foto original fica no iCloud ou Google Fotos; aqui vão só a miniatura e 1 foto por entrega.
6. **Exportar tudo:** botão em cada órgão desde a v1.
7. **Limite do plano grátis** ([fonte](https://supabase.com/pricing), consultado em 25/11/2026): 500 MB de banco, 1 GB de arquivos, 2 projetos ativos, pausa após 1 semana sem uso. Estouram primeiro as fotos e o número de projetos (família e empresa já são 2).

### 💸 Quanto custa manter o corpo (por mês, estimativa)

Câmbio: PTAX de 24/11/2026 (R$ 5,86) mais IOF de 3,5%, o que dá R$ 6,06 por US$. [confirmar preço do Haiku 5.5 na [página oficial](https://platform.claude.com/docs/en/about-claude/pricing)]

| Item | R$/mês | Quando muda |
|---|---|---|
| GitHub Pages (telas) | 0 | Repositório privado pede GitHub Pro: R$ 24 |
| Supabase | 0 | Fotos acima de 1 GB ou 3º projeto: Pro, **R$ 152** |
| Claude no Foco, nas capturas e nas revisões | cerca de 2 | Sonnet em vez de Haiku multiplica por 20 |
| **Total esperado** | **cerca de R$ 2** | Uso 3 vezes maior: R$ 5 |
| Pago 1 vez: crédito mínimo da API | cerca de R$ 30 | Dura mais de 1 ano neste uso |

1. **Entra no plano base como R$ 5/mês**, arredondado para cima.
2. **O Pro do Supabase (R$ 1.824 por ano) nunca entra por impulso.** Antes dele, tirar fotos originais do Storage e apagar histórico antigo.

---

## 🎨 5. Um corpo, uma cara

1. Fundo creme, 1 cor de destaque por órgão: sálvia no Jardim e nos Aprendizados, sálvia escuro no Portfólio, terracota no Foco. [confirmar: cor do Parcelas atual]
2. Título serifado com a 2ª palavra em itálico ("Meu dia *em foco*").
3. Mesma estrutura em todos: barra lateral, **1 número grande no topo** (o que responde "estou indo bem?"), centro com a próxima ação, rodapé com 1 dica da IA e 1 botão principal. Os outros números ficam em "ver mais" e aparecem completos só na revisão de domingo, no Windows. No iPhone, nenhum número além do timer. [hipótese H8 do plano de teste]
4. **Celular captura, computador lê.** Captura em 10 segundos, contados do toque em Compartilhar até a tela "salvo". [hipóteses H1 e H2]
5. Nome na tela: **Aprendizados**. Painel e endereço continuam `banco`.

---

## 🧠 6. Princípios do corpo (pensados pro TDAH)

1. **Uma porta só de captura.** Um único Atalho no iPhone ("Central") e uma única caixa no Windows recebem link, print, foto ou 1 frase, sem campo obrigatório. A IA sugere o destino e o Romero confirma em lote no fechamento do dia. Quem captura não decide onde a coisa mora. [hipóteses H3 e H4]
2. **Nada vermelho e volta sem dívida.** O placar mostra só o que aconteceu ("3 dias com foco nesta semana"), sem denominador. Depois de 3 dias sem abrir, a Central volta numa tela limpa: "Qual a 1 coisa de hoje?". O que ficou para trás vai para a gaveta "pra quando der", sem contagem.
3. **1 aviso por dia.** A Central inicia no máximo 1 aviso: o "Fechar o dia" (18h, ajustável), com 1 item e os mesmos 3 botões em todos os órgãos: **Fazer hoje**, **Adiar**, **Soltar**. O aviso de fim de ciclo do Foco não conta, porque foi o Romero quem ligou o timer. Aviso ignorado 3 vezes se desliga sozinho. [hipótese H10]
4. **Domingo em 2 partes, na mesma tela, com teto:**
   1. **Parte do Romero (15 min, no Windows):** no máximo 5 decisões: dinheiro da semana, 1 ajuste do Foco, até 2 aprendizados para aplicar, até 2 entregas para o Portfólio. O que não couber fica para o domingo seguinte sem acumular. O Portfólio mensal vira o bloco do último domingo do mês.
   2. **Parte do casal (20 min, com Andreza, depois que as crianças dormem):** agenda da semana das crianças, escala da equipe, dinheiro da família (só o bolso família) e 1 decisão do casal anotada.
   3. A revisão nasce na fase 2 só com o bloco do Foco e ganha 1 bloco por órgão que entra. Domingo pulado não gera atraso. [hipótese H11]
5. **Tempo visível, sem cobrança na hora.** O fator de estimativa ("você leva 1,4x o que estima") aparece só no domingo, nunca às 8h30.
6. **Recompensa na hora.** Ciclo fechado, mesmo parcial, acende 1 peça na parede da semana, que nunca perde peças. Conta paga mostra o efeito real calculado pelo Parcelas. Proibido: pontos, ranking e recompensa que se perde.
7. **Equipe recebe passo literal.** Todo cartão de turno segue o molde hora, verbo, coisa, lugar. Sem sigla e sem "conforme combinado". No fim do turno, 2 botões: "feito" e "não deu" (com 1 frase). Exemplo ilustrativo de cartão: [confirmar com Andreza a rotina real antes de escrever]
   1. 7h00: acordar as crianças. Roupa da escola fica [confirmar: onde].
   2. 11h30: buscar na escola com o motorista. Se ninguém chegar até 11h45, ligar pra Andreza.
   3. Febre: seguir a ficha de emergência e ligar pra Andreza. Não dar remédio fora da ficha.
8. **A casa não depende do Romero.** Rotina que só funciona quando ele lembra ainda não está na Central.

---

## 🗺️ 7. Ordem de montagem do corpo

### 🚦 Regras que valem em toda fase
1. **Semana abaixo do colchão é semana só do Caixa.** Nenhuma construção nova nela.
2. **Construir x usar.** Só 1 órgão em construção por vez. Construir com o Claude tem hora marcada: até 2 sessões por semana, de até 90 minutos, cada uma termina com 1 linha de "onde parei". Ideia de tela nova vai para a porta de captura, nunca direto para o código. Semana com mais horas construindo do que usando: a seguinte não tem construção.

| Fase | O que entra | Por quê | Trava pra passar |
|---|---|---|---|
| T | 🧪 Semana de teste sem código (papel, protótipo, Atalho e Lembretes do iPhone), junto com a fase 0 | As telas dependem de comportamentos que só você confirma | H1, H2, H10 e H11 aprovadas no `plano-teste-semana-1.md` |
| 0 | 🩸 Caixa oficial + Orçamento da Andreza e Feira migrados + fev/2027 simulado | Sem renda de mandato a partir de fev/2027, o mês precisa fechar só com dinheiro certo | Saldo conferido com o extrato por Romero e Andreza, e fev/2027 fechando sem descer do colchão |
| 1 | ✋ Mutirão do legado **em planilha, sem app** | Prazo fixo: o acesso ao gabinete acaba com o mandato. Custa R$ 0 | Entregas do mandato na planilha antes da saída [confirmar: data, provavelmente 31/01/2027] |
| 2 | ⏱️ Foco mínimo: vencimentos do Parcelas, 3 tarefas do dia, timer e "anotar". Sem IA, sem push, sem agenda. Horários das crianças como blocos que o Foco nunca ocupa | Conta esquecida vira multa e juros | 4 semanas sem conta paga com atraso e 15 dias de uso em 21 (dia só construindo não conta) |
| 3 | 🏠 Casa: Agenda da família + Escritório com passo literal + Folha da equipe | A casa roda sem depender da memória do Romero nem de Andreza | 4 semanas com a escala saindo da Central, sem ligação pra tirar dúvida |
| 4 | ✋ Portfólio no app (importa a planilha) + kit por público | Único órgão que pode abrir porta de receita | 1 kit usado numa conversa de trabalho pago |
| 5 | 🧠 Aprendizados e 👁️ Jardim (pessoais) | Ajudam a pensar, não mexem no caixa | Só começa com o caixa ajustado: toda dívida com plano e colchão cheio |
| 6 | 🔁 IA do Foco, push, agenda Google, ligações automáticas, domingo completo | Conforto, não economia | 4 domingos do casal feitos |

---

## 👥 8. Time que pensou e revisou

| Especialista | O que cobriu |
|---|---|
| Gerente de Produto | Problema, jornadas, o que fica fora |
| Designer de Produto | Telas, celular x computador, linguagem visual |
| Arquiteto de Software | Encaixe na tabela `docs`, ligações, Storage, IA |
| Pesquisador de mercado | 40+ concorrentes com preço e fonte |
| Engenheiro de IA | O que a IA faz e o que nunca faz |
| Especialista em TDAH adulto | Porta única, 1 aviso, 1 número, volta sem dívida, construir x usar |
| Designer de serviço para famílias | Quem é quem, 3 bolsos, domingo do casal, órgãos da casa |
| Planejador financeiro | Custo mensal, ordem pelo dinheiro, ligações que valem R$ |
| Pesquisador de usabilidade | 16 contradições, metas mensuráveis, plano de teste |

---

## 📂 9. Documentos desta pasta

1. Este arquivo: o corpo inteiro.
2. `plano-teste-semana-1.md`: o teste antes do código.
3. `revisao-especialistas.md`: o que cada especialista mudou e por quê.
4. `contexto-foco-e-tempo.md`: Sistema nervoso.
5. `contexto-portfolio-carreira.md`: Mãos.
6. `contexto-jardim-e-banco.md`: Olhos e Memória.

---

## ❓ 10. Decisões que são do Romero

1. **Mostrar este mapa para Andreza antes de aprovar a ordem.** Recomendo: ela escolhe quem é dona da Agenda e da Saúde, e a parte do casal no domingo só é desenhada depois de ouvir o que ela quer ver.
2. **Ordem de montagem acima:** recomendo aprovar.
3. **Data de saída do gabinete:** define o prazo do mutirão.
4. **Repositório público:** estes documentos falam de dívidas e da família e hoje podem ser lidos por qualquer pessoa. Recomendo tirar os documentos sensíveis do repositório público (R$ 0) em vez de pagar GitHub Pro (R$ 24/mês).
