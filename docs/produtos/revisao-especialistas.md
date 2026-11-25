# 🔍 Revisão dos especialistas (25/11/2026)

4 especialistas leram os 4 documentos de contexto e devolveram os trechos reescritos. Este arquivo registra o que cada um mudou e por quê. Tudo já está aplicado nos documentos.

---

## 🧠 1. Especialista em TDAH adulto

**Veredito:** o tom sem culpa está certo. O risco é o sistema virar um 2º emprego: 5 portas de captura, 4 rituais de revisão e 25 números na tela. Nos apps de saúde mental, a mediana de usuários que ainda usam no dia 30 é 3,3% ([Baumel, JMIR 2019](https://www.jmir.org/2019/9/e14567)).

| Mudou | Por quê |
|---|---|
| 1 porta só de captura, a IA sugere o destino | A terapia com melhor evidência no TDAH adulto junta tudo num lugar só ([Safren, JAMA 2010](https://pmc.ncbi.nlm.nih.gov/articles/PMC2909688)) |
| 1 aviso por dia na Central inteira | Aviso repetido sem ação vira ruído e depois motivo de desinstalar |
| Placar sem denominador e volta sem dívida | Recomeço em data marcante ajuda a voltar ao objetivo ([Dai, Milkman e Riis, 2014](https://faculty.wharton.upenn.edu/wp-content/uploads/2014/06/Dai_Fresh_Start_2014_Mgmt_Sci.pdf)) |
| 1 número no topo em vez de 5 | Cada número é uma comparação a mais na memória de trabalho |
| Hiperfoco avisa antes do horário das crianças e pede "onde parei" | Plano de retomada reduz o custo de trocar de tarefa ([Leroy e Glomb, 2018](https://www.washington.edu/news/2018/01/16/task-interrupted-a-plan-for-returning-helps-you-move-on/)) |
| Estimar é opcional; o "1,6x" só aparece no domingo | Às 8h30, o número soa como "você erra" antes de começar |
| Aprendizado com 1 frase só; os outros campos vão para o domingo | 3 campos na hora fazem a pessoa não registrar |
| Regra construir x usar | Construir o app pode virar o hiperfoco que toma o lugar de arrumar o caixa |
| Recompensa na hora, que nunca se perde | No TDAH, recompensa atrasada perde valor mais rápido |

## 👨‍👩‍👧‍👦 2. Designer de serviço para famílias

**Veredito:** a Central era do Romero com nome de família. Andreza já tem painel (Orçamento e Feira) e aparecia como "v2".

| Mudou | Por quê |
|---|---|
| Tabela "quem é quem": quem vê e quem mexe em cada órgão | Nenhum órgão dizia para quem servia |
| Orçamento da Andreza e Feira entram no mapa | Já existem e tinham sido esquecidos |
| Regra dos 3 bolsos (família, empresa, campanha) | Sua regra não estava escrita em nenhum documento |
| Domingo em 2 partes: a sua e a do casal | A semana da casa se decide a dois |
| Órgãos novos: Crianças, Emergência, Folha da equipe | Errar nessas partes custa mais |
| Casa (Agenda + Escritório) sobe para a fase 3 | A casa entrava só depois de tudo o que é pessoal |
| Equipe recebe passo literal: hora, verbo, coisa, lugar | Regra sua para a equipe da casa |

## 💰 3. Planejador financeiro

**Veredito:** custo de cerca de **R$ 2 por mês**. O risco é o degrau do Supabase Pro, de R$ 152/mês. A ordem antiga punha o Foco completo antes do que dá dinheiro.

| Mudou | Por quê |
|---|---|
| Ordem pela régua do dinheiro | Fase sem efeito no caixa espera o caixa ajustado |
| Mutirão do legado em planilha, sem app | Tem prazo e custa R$ 0 |
| Foco mínimo só com vencimentos, sem IA e sem push | Conta esquecida vira multa de 2% e juros |
| Haiku com teto de US$ 2/mês na API | Sem teto, um erro vira gasto sem controle |
| Tabela de custo e de ligações que valem R$ | Para saber o que é economia e o que é enfeite |
| Kit do Portfólio só entra no caixa com contrato assinado | Plano base só conta dinheiro certo |

## 🧪 4. Pesquisador de usabilidade

**Veredito:** 12 comportamentos seus estavam tratados como fato sem nenhum teste. Havia 16 contradições entre os arquivos.

| Contradição principal | Como ficou |
|---|---|
| Ordem das fases diferente em 2 arquivos | Vale a do documento mãe |
| Trava do Foco com 3 números diferentes | Uma meta só |
| Revisão "única" que nascia só no fim | Nasce com o Foco e cresce por blocos |
| "Semanas seguidas" contra a regra de nada zerar | "3 de 4 nas últimas 4 semanas" |
| 3 conjuntos de botões para o mesmo aviso | Fazer hoje, Adiar, Soltar, em todo lugar |
| 2 atalhos de captura | 1 só, a ser decidido no teste H3 |
| Metas sem número ("[confirmar: meta]") | Todas com número e com o jeito de medir |

Ele também entregou o **plano de teste de 1 semana**, sem código: `plano-teste-semana-1.md`.

---

## ⚖️ 5. Onde os especialistas discordaram e o que decidi

| Tema | Discordância | Decisão |
|---|---|---|
| Ordem das fases | Família queria a Casa cedo; Financeiro queria o Portfólio cedo por causa da receita | Casa na fase 3 (protege a família e evita multa do eSocial), Portfólio no app na fase 4. O mutirão em planilha continua na fase 1 por causa do prazo |
| Avisos | TDAH: até 3 por dia. Usabilidade: 1 por dia | 1 aviso por dia iniciado pela Central, mais o fim de ciclo que você mesmo ligou |
| Captura | Usabilidade: atalho pergunta "inspirou ou fiz?". TDAH: nunca perguntar | Porta única sem pergunta. O teste H3 confirma |
| Números no topo | TDAH: 1. Usabilidade: testar 5 contra 3 | 1 número no documento. O teste H8 compara 1 contra 5 |
| Exemplo do cartão da babá | O revisor inventou detalhes da rotina | Ficou só o molde, com [confirmar] para a rotina real |

## ⚠️ 6. O que ainda falta confirmar

1. O preço do Claude Haiku 5.5 na página oficial (o revisor achou US$ 0,10 por milhão de tokens de entrada).
2. A taxa do rotativo do mês no Banco Central e a multa do DAE doméstico.
3. A data de saída do gabinete.
4. A rotina real da casa e quem é a equipe hoje.
5. Duas fontes citadas de memória pelo revisor de TDAH: Sonuga-Barke 2002 e Lally 2010.
