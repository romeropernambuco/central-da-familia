# Contexto de produto: Foco e tempo

Fase: descoberta (nenhuma linha de código ainda). Nome provisório: **Foco e tempo**. [confirmar: nome final]
Escrito por 5 visões: Gerente de Produto (o quê e por quê), Designer de Produto (como a pessoa usa), Arquiteto de Software (como se constrói), Pesquisador de mercado (o que já existe lá fora) e Engenheiro de IA (o que a IA faz e com que limite).
Origem: post do Instagram com o prompt "Crie uma ferramenta de foco com timer pomodoro de 25/5 min. Quero cadastrar as tarefas do dia com tempo estimado, escolher qual fazer em cada ciclo e ver pra onde foi meu tempo."
Data da pesquisa: 25/11/2026.

---

## 🧭 1. Mapa mental

```
                         🎯 PROBLEMA
        o tempo some, a estimativa erra, a ideia atravessa
                              │
 🗓️ PLANEJAR ──────── [ FOCO E TEMPO ] ──────── 📊 ENXERGAR
 3 tarefas em 2 min     o relógio do corpo       pra onde foi o tempo
 IA corrige a estimativa  da Central             plano x real, sem culpa
                              │
        ⏱️ RODAR CICLO ──────────────── 💭 ANOTAÇÃO RÁPIDA
        10, 25 ou 45 min                  ideia sai da cabeça
        ou modo fluxo                     e vai pro lugar certo
                              │
 🫀 LIGAÇÕES COM OS OUTROS ÓRGÃOS DA CENTRAL
 Parcelas (tarefa de dinheiro) · Portfólio (entrega) · Jardim (ideia)
 Banco de Aprendizados (estudo) · Agenda Google (blocos fixos)
                              │
                     📏 SUCESSO EM 30 DIAS
       uso em 20 de 30 dias, estimativa errando menos,
       ideias capturadas sem quebrar o ciclo
```

**Onde o Foco entra no corpo da Central:** se o Parcelas é o bolso e o Escritório é a casa funcionando, o Foco é o **relógio e a atenção**. É o órgão que transforma o que os outros pedem (pagar, aprender, entregar) em horas de verdade no dia.

---

## 🎯 2. Problema

1. **Cegueira de tempo.** No TDAH, o tempo não é sentido, só visto. Russell Barkley descreve o TDAH como um problema de autorregulação ligado ao tempo, uma "cegueira" para passado e futuro ([Barkley, 1997, PubMed](https://pubmed.ncbi.nlm.nih.gov/9276836/)). A resposta prática é **tornar o tempo visível fora da cabeça**: relógio que encolhe, cor, barra.
2. **Estimativa errada.** "Ligar pro credor, 10 min" vira 50 min com a espera, a busca do contrato e a ligação de volta. O plano do dia nasce irreal e o fim do dia vira culpa.
3. **Troca de tarefa.** Começar é caro, parar no meio é fácil. Cada troca custa minutos de "reentrada" que ninguém conta.
4. **A ideia que atravessa o foco.** No meio do ciclo surge "e se o negócio novo fosse um curso?". Ou o Romero larga a tarefa e vai atrás, ou tenta segurar na memória e perde o foco igual.
5. **25 minutos não serve pra todo dia.** Tem dia em que 25 é uma montanha (começar já é o problema) e dia de hiperfoco em que o alarme de 25 quebra o melhor momento.
6. **Fase de vida pede foco real.** Depois do mandato, sem a estrutura de gabinete (agenda, assessor, sessão), a organização do dia ficou toda com ele. A prioridade agora é a vida financeira da família e, depois, um negócio virtual. As duas pedem horas de trabalho concentrado, não só boa vontade.
7. **Ferramentas lá fora punem.** Árvore que morre, sequência que zera, meta vermelha. Pra quem tem TDAH, isso gera vergonha e abandono do app em poucas semanas.

---

## 👤 3. Quem usa, onde e quando

**Usuário da v1:** Romero, 34 anos, Recife (horário de Brasília, UTC-3), TDAH, casado com Andreza, 3 filhos. Usa iPhone e Windows. Trabalha muito com Claude.

### 📅 Um dia concreto (terça-feira, cenário provável)

| Hora | Onde | O que acontece | O que o Foco faz |
|---|---|---|---|
| 6h40 | Casa, iPhone | Café, crianças pra escola. Cabeça já cheia de pendências. | Nada. Não aparece antes da hora. |
| 8h30 | Escritório de casa, Windows | Senta pra começar. Não sabe por onde. | Abre "Planejar o dia": 2 min, 3 tarefas, IA corrige o tempo. |
| 9h00 | Windows | Ciclo 1: "Montar planilha das dívidas do cartão" (Parcelas). | Timer grande, tarefa atual, anotação rápida à mão. |
| 9h18 | Windows | Surge a ideia "curso de finanças pra ex-servidores". | 1 tecla, 1 frase, volta pro ciclo. A IA arquiva depois. |
| 10h30 | Carro, iPhone | Sai pra resolver coisa no banco. | Pausa automática não existe; ele toca em "saí" e o dia se ajusta. |
| 14h00 | Casa, iPhone no sofá | Energia baixa depois do almoço. | Sugere ciclo curto de 10 min numa tarefa fácil ("ligar pro credor"). |
| 16h00 | Windows | Hiperfoco num texto do negócio novo. | Modo fluxo: não interrompe e não conta pausa. Avisa 15 min e 5 min antes do próximo bloco fixo (horário das crianças). No aviso de 5 min, pede 1 linha de "onde parei e qual o próximo passo", que volta no topo quando ele reabrir a tarefa. |
| 18h00 | Casa | Crianças chegam, rotina da noite. | Fecha o dia com 3 perguntas e 1 frase de "o que deu certo". |
| Domingo 20h | Sofá, iPhone ou Windows | Revisão da semana (junto com o Banco de Aprendizados). | Mostra pra onde foi o tempo por área e o fator de estimativa. |

### 📍 Onde
1. **Windows (computador):** onde acontece o trabalho de foco longo. Tela principal do produto.
2. **iPhone:** planejar rápido, rodar ciclo fora da mesa, anotar ideia, fechar o dia, revisar no domingo.

---

## 🔁 4. Jornadas

### 🗓️ 4.1 Planejar o dia em 2 minutos
1. Abre "Hoje". Se não há plano, aparece um botão só: **"Planejar o dia (2 min)"**.
2. A tela já traz candidatos: tarefas que sobraram de ontem, pedidos vindos do Parcelas ("ligar pro credor do cartão X, vence sexta") e os blocos fixos da agenda Google.
3. Romero escolhe **no máximo 3 tarefas principais**. Pode adicionar mais em "se sobrar tempo", que não conta como meta.
4. Estimar é opcional. Se ele pular, a tarefa entra com 1 ciclo de 25 min. Quando ele estima, a IA sugere ao lado, só a partir da 2ª semana de dados: "ligações costumam levar 2 ciclos pra você". O multiplicador ("1,6x") nunca aparece na hora de planejar, só na revisão de domingo.
5. A tela compara plano x horas livres do dia ("3h planejadas, você tem 4h livres entre compromissos"). Se passar, avisa antes, não depois.
6. Confirma. O dia vira a lista do centro da tela.

### ⏱️ 4.2 Rodar um ciclo
1. Toca em **"Qual agora?"**. A IA sugere 1 tarefa (considerando horário, energia que ele marcou e prazo). Ele pode escolher outra.
2. Escolhe o tamanho: **10 min (começar)**, **25 min (padrão)**, **45 min (fundo)** ou **fluxo (sem fim)**. O app lembra o último usado por tipo de tarefa.
3. Timer circular grande, tempo restante visível como **área que encolhe** (não só número), nome da tarefa em cima.
4. Ao terminar: som suave e notificação. Uma pergunta só: **"Continua nessa, troca ou pausa?"**. Pausa sugerida de 5 min (ou 10 a cada 4 ciclos), pulável.
5. Se ele parar no meio, o ciclo não "morre": conta como **ciclo parcial** com os minutos feitos. Nada de vermelho.
6. Se a tarefa acabou antes, marca "feita" e os minutos reais ficam gravados. É esse dado que ensina a estimativa.

### 💭 4.3 Ideia no meio do foco
1. Durante o ciclo, a caixa **"Anotação rápida"** fica sempre visível (computador) ou a 1 toque (iPhone). Atalho de teclado no Windows. [confirmar: tecla]
2. Romero escreve 1 frase ou dita (ditado do teclado do iPhone). Enter. Some da tela. **O timer não para.**
3. A nota fica marcada "durante o ciclo de X". Ninguém pergunta nada agora.
4. Na pausa ou no fim do dia, a IA propõe o destino de cada nota: **Jardim** (ideia, referência), **Banco de Aprendizados** (algo aprendido), **tarefa** (vira item de amanhã), **Parcelas** (assunto de dinheiro) ou **descartar**. Ele confirma em lote.

### 🌙 4.4 Fim do dia
1. Às 18h (ajustável), uma notificação: "Fechar o dia? 1 minuto."
2. Mostra **o que foi feito primeiro** (tarefas feitas, minutos de foco), depois o que ficou.
3. Para cada tarefa que ficou: **amanhã**, **outro dia** ou **soltar** (apagar sem culpa).
4. Resolve as anotações rápidas pendentes (jornada 4.3, passo 4).
5. 1 pergunta opcional: "o que funcionou hoje?" (1 frase). Vira matéria pra revisão de domingo.
6. Fecha com uma frase da IA que **reconhece o esforço** e nunca compara com "devia ter feito".

### 📆 4.5 Revisão semanal (domingo, junto com o Banco)
1. A revisão de domingo já existe no Banco de Aprendizados. O Foco entra como **1 bloco a mais nela**, não como outra revisão.
2. Mostra: horas de foco por área (trabalho, finanças da família, negócio novo, estudo, conteúdo), dias com foco, melhor horário, fator de estimativa da semana.
3. Lista as entregas da semana que podem ir pro Portfólio ("3 tarefas marcadas como entrega: mandar pro Portfólio?").
4. A IA propõe **1 ajuste** pra semana seguinte, não 5 ("suas terças à tarde rendem pouco: experimente só tarefas de 10 min nesse horário").

---

## 🧩 5. Peças, dados e encaixe na tabela `docs`

### 📦 5.1 As peças

| Peça | Campos principais | Observação |
|---|---|---|
| **Tarefa** | título, área, data planejada, estimativa (min e ciclos), real (min), status (planejada, fazendo, feita, solta), é principal (sim ou não), é entrega (sim ou não), origem, destino, dificuldade (leve, média, pesada) | Peça central. Mora só aqui. |
| **Sessão (ciclo)** | tarefa, início (data e hora), fim, duração planejada, duração real, tipo (10, 25, 45, fluxo), terminou (inteira ou parcial), dispositivo, energia (1 a 3) | 1 documento por ciclo. É o diário do tempo. |
| **Anotação rápida** | texto, criada em, sessão em que surgiu, destino sugerido pela IA, destino final, status (pendente, enviada, descartada) | Some depois de enviada; o original fica no destino. |
| **Área** | nome, cor, ordem, ativa | Trabalho, finanças da família, negócio novo, estudo, conteúdo, casa. |
| **Dia** | data, plano (ids e estimativas), minutos de foco, ciclos, tarefas feitas, frase do fim do dia, fechado (sim ou não) | Resumo do dia, gravado no fechamento. |
| **Semana** | semana, minutos por área, fator de estimativa, melhor horário, ajuste proposto | Gravado no domingo. |
| **Config** | tamanhos de ciclo, pausa, horário de fechar o dia, meta mínima, som, notificações | 1 documento. |
| **Resumo atual** | números do topo prontos para a Central ler | Igual ao `parcelas / resumo / atual`. |

### 🗄️ 5.2 Encaixe na tabela `docs`

Regra da Central: tudo na tabela `docs` (chaves `painel`, `colecao`, `doc_id`, conteúdo em `dados`), **nunca tabela paralela**, e listar o que existe antes. Antes de construir, rodar a listagem de painéis e coleções no Supabase e confirmar que não existe nada de foco, tarefa ou agenda. [confirmar: listagem antes do 1º commit]

| painel | colecao | doc_id (formato) | Volume estimado |
|---|---|---|---|
| foco | tarefas | `t_2026-11-25_ab12` (data de criação + 4 letras) | 5 a 10 por dia |
| foco | sessoes | `s_2026-11-25T09-00_ab12` | 4 a 10 por dia, cerca de 2.500 por ano |
| foco | notas | `n_2026-11-25T09-18_ab12` | 0 a 10 por dia |
| foco | areas | `trabalho`, `financas`, `negocio`, `estudo`, `conteudo`, `casa` | 6 fixos |
| foco | dias | `2026-11-25` | 1 por dia |
| foco | semanas | `2026-W48` | 1 por semana |
| foco | painel | `config` | 1 |
| foco | resumo | `atual` | 1, reescrito a cada ciclo fechado |

1. **Volume cabe no plano grátis.** Uns 4 mil documentos por ano, cada um pequeno. Buscas por data funcionam bem se o `doc_id` começar pela data.
2. **Histórico de graça.** Como toda mudança em `docs` já guarda versão em `docs_historico`, uma tarefa apagada por engano volta.
3. **Ponto de atenção:** cada ciclo grava 2 vezes (início e fim). Se o `docs_historico` guardar cópia de toda atualização, ele cresce rápido. Sugestão: o início do ciclo grava só no navegador e o documento da sessão é criado **no fim** (ou na pausa). [confirmar com o Arquiteto ao olhar o gatilho do histórico]
4. **Acesso:** só Romero mexe e vê o painel `foco` na v1 (mesmo modelo de permissão por painel que já existe).

### 🔗 5.3 Como uma peça aponta pra outra (sem duplicar)
Todo documento que vem de outro órgão ou vai pra outro órgão guarda uma referência, nunca uma cópia:

```
origem:  { painel: "parcelas", colecao: "compras", doc_id: "..." }
destino: { painel: "portfolio", colecao: "entregas", doc_id: "..." }
```

A tarefa "ligar pro credor" mora no `foco`. A dívida continua morando no `parcelas`. Cada dado num lugar só.

---

## 🫀 6. Ligações com os outros órgãos da Central

| Órgão | Direção | O que passa | Como (proposta) | Versão |
|---|---|---|---|---|
| 💰 **Parcelas da Família** | Parcelas → Foco | Tarefa de dinheiro ("ligar pro credor", "renegociar cartão X", "pagar fatura até sexta") | Botão "virar tarefa de foco" numa compra ou fatura do Parcelas cria `foco / tarefas` com `origem` apontando pro documento do Parcelas e área "finanças". O Foco também lê `parcelas / resumo / atual` pra destacar vencimentos da semana no "Planejar o dia". | v1 (só leitura do resumo + botão) |
| 🏆 **Portfólio de carreira** | Foco → Portfólio | Tarefa marcada "é entrega" e feita | Na revisão de domingo, o Foco propõe a lista; Romero confirma e é criado o documento de entrega no Portfólio com `origem` apontando pra tarefa e os minutos gastos. | v1 se o Portfólio existir; senão a marca "é entrega" já fica guardada esperando |
| 🌱 **Jardim Digital** | Foco → Jardim | Anotação rápida do tipo ideia ou referência | A nota vira item no Jardim (`jardim / referencias`, nome de coleção a confirmar quando o Jardim for construído) com `origem` = nota e sessão. | v1 assim que o Jardim existir |
| 📚 **Banco de Aprendizados** | Os dois sentidos | Tempo de estudo e aprendizado capturado | Sessão com área "estudo" pode apontar pra um curso ou livro do Banco ("2h30 no livro X nesta semana"). Nota rápida do tipo aprendizado vira rascunho de aprendizado. O bloco do Foco entra na revisão de domingo do Banco. | v1 parcial (nota → Banco); tempo por curso na v2 |
| 🏠 **Escritório da Família** | Nenhuma na v1 | Turnos da casa | Tem tabelas próprias (`escritorio_funcionarios`, `escritorio_turnos`). Na v2, o turno de quem cuida das crianças pode virar bloco indisponível no dia do Romero. | v2 |
| 📅 **Agenda Google** | Google → Foco (só leitura) | Compromissos do dia | Ler o calendário pelo endereço privado iCal (sem login Google dentro do app). Os compromissos aparecem como blocos fixos e reduzem as "horas livres" do planejamento. Escrever na agenda (criar bloco de foco) fica pra v2. | v1 só leitura |

**Recomendação (fase de contenção):** na v1 só entra a ligação que vale dinheiro: **Parcelas para Foco**. Todo vencimento da semana vira tarefa com prazo. Conta paga com atraso custa multa de 2% mais juros, e no cartão o rotativo é o juro mais caro do mercado ([Banco Central](https://www.bcb.gov.br/estatisticas/txjuros)) [confirmar taxa do mês]. A anotação que iria para o Jardim e os Aprendizados fica guardada no próprio Foco até esses órgãos existirem (fase 5). Tarefa de empresa ou de campanha usa área própria e nunca aponta para o Parcelas.

### 👨‍👩‍👧‍👦 A família entra?
1. **Recomendação: o Foco continua pessoal na v1, mas já respeita a casa.** Andreza não usa o Foco. Três coisas da família entram já na v1: os horários das crianças como blocos que o Foco nunca ocupa; o fechamento do dia acontece antes da hora em que as crianças chegam; e toda tarefa vinda do Parcelas carrega o bolso (`familia`, `empresa` ou `campanha`), sem misturar.
2. **O que entra da família na v1, de forma indireta:** os compromissos fixos (escola, médico, jantar) já estão na agenda Google e aparecem como blocos indisponíveis. Isso basta pra o plano do dia não ignorar a casa.
3. **Na v2, avaliar:** "rotina das crianças" com timers visuais (o Tiimo faz isso bem) e um "modo casal" em que Andreza vê só os blocos de foco do Romero pra saber quando ele está disponível. Isso só depois de 30 dias de uso próprio.

---

## 📊 7. Números do topo

O print tem 5 números. Mantemos 5, mas ajustados pro TDAH: **nenhum número pode ficar vermelho por falha**, e toda meta tem um "mínimo bom".

| # | No print | Na Central (proposta) | Por quê |
|---|---|---|---|
| 1 | 6 pomodoros, meta 8 | **Minutos de foco hoje** + bolinhas de ciclos (cheia, meia cheia pra parcial) | Ciclos têm tamanhos diferentes; minutos é a medida honesta. Ciclo parcial conta. |
| 2 | 2h30 de foco, +40 min vs ontem | **Foco da semana** (comparado com a média das últimas 4 semanas, não com ontem) | Comparar com ontem pune dia ruim. Média de 4 semanas é mais justa. |
| 3 | 4 de 8 tarefas feitas | **Principais feitas: 2 de 3** (as "se sobrar tempo" aparecem à parte, como bônus) | Meta pequena e alcançável. Bônus é vitória extra, nunca dívida. |
| 4 | 3h planejado → 2h30 real, 83% do plano | **Fator de estimativa** ("você leva 1,4x o que estima") com tendência da semana | Transforma o erro em aprendizado. É o número que treina a cegueira de tempo. |
| 5 | 9h às 11h melhor horário | **Melhor horário** (só aparece depois de 10 dias de dados) | Antes disso é chute. Mostrar cedo demais gera dica errada. |

### 🔥 Sequência de dias sem culpa
1. Em vez de "5 dias seguidos" que zera ao falhar, mostrar **"dias com foco: 5 de 7 nesta semana"**.
2. O dia conta se tiver **1 ciclo de 10 min**. O "dia mínimo" é baixo de propósito.
3. Barra lateral: "6 de 8 pomodoros hoje" vira "**95 min de foco hoje · 5 de 7 dias na semana**".

---

## 🤖 8. O que a IA faz

Visão do Engenheiro de IA. Modelo: Claude pela API, sempre chamado por uma função no servidor (Supabase Edge Function), nunca com chave dentro da página.

| # | Tarefa da IA | Quando | Entrada | Saída |
|---|---|---|---|---|
| 1 | **Corrigir a estimativa** | Planejar o dia | Tarefa, área, histórico de sessões parecidas | Tempo sugerido + frase curta ("ligações levam 1,6x pra você") |
| 2 | **Quebrar tarefa grande** | Tarefa pesada ou acima de 3 ciclos | Título da tarefa | 3 a 5 passos com o 1º passo de 10 min |
| 3 | **"Qual agora?"** | Início de ciclo | Tarefas do dia, horário, energia, prazos, melhor horário | 1 sugestão com motivo de 1 linha |
| 4 | **Arquivar anotação rápida** | Pausa e fim do dia | Texto da nota | Destino sugerido (Jardim, Banco, tarefa, Parcelas, descartar) |
| 5 | **Frase do fim do dia** | Fechar o dia | Números do dia | 1 a 2 frases de reconhecimento, sem cobrança |
| 6 | **Dica do rodapé e ajuste da semana** | Diário e domingo | Sessões de 2 a 4 semanas | 1 dica concreta |

### 🧱 Regras da IA
1. **Tom sem culpa, sempre.** Proibido: "você falhou", "de novo", "só fez". Permitido: "fez 2 de 3", "amanhã essa vai primeiro".
2. **A conta é do código, a frase é da IA.** Fator de estimativa, melhor horário e minutos são calculados no banco. A IA só escreve a frase a partir dos números. Assim ela não inventa dado.
3. **Nada de diagnóstico.** A IA não fala de remédio, dose ou tratamento. Pode citar estratégia ("começar com 10 min"), nunca orientação médica.
4. **Sugestão, nunca decisão.** Toda sugestão tem "aceitar" e "ignorar". Sem insistir.
5. **Custo (estimativa, 25/11/2026):** com Claude Haiku 5.5, 20 chamadas curtas por dia dão cerca de **R$ 0,82 por mês** ([preço](https://platform.claude.com/docs/en/about-claude/pricing), câmbio PTAX de 24/11/2026 mais IOF). Sonnet custaria cerca de 20 vezes mais. Usar Haiku; Sonnet só se a sugestão falhar no piloto. [confirmar preço na página oficial]
6. **Claude fora do app também:** como o Romero já trabalha no Claude e a Central está no Supabase, dá pra montar o dia conversando ("Claude, monta meu dia com as pendências do Parcelas") e o Claude gravar as tarefas em `foco / tarefas` pela conexão com o Supabase. Isso é bônus, não depende de tela nova. [confirmar: se o Romero quer planejar pela conversa ou pela tela]

---

## 🎨 9. Tela

### 🧱 Estrutura (do print, adaptada)
1. **Barra lateral (computador):** Hoje, Planejar o dia, Tarefas, Histórico, Estatísticas, Áreas, Configurações. Rodapé: minutos de hoje e dias na semana.
2. **Topo:** título serifado com itálico ("Foco e *tempo*") e os 5 números da seção 7.
3. **Centro esquerdo:** timer circular grande com tarefa atual, pausar, pular, bolinhas de ciclos e últimas sessões.
4. **Centro direito:** lista de tarefas do dia com estimativa e bolinhas; caixa "Anotação rápida" logo abaixo.
5. **Faixa de baixo:** "Onde foi seu tempo" por área, gráfico da semana, mapa de foco por horário, dias com foco.
6. **Rodapé:** dica da IA e botão "+ adicionar tarefa".

### 🖌️ Linguagem visual
1. Fundo creme, cor de destaque **terracota** (foco ativo) e **verde-sálvia** (feito, pausa). Mesma família visual do Jardim e do Banco.
2. Cada área tem 1 cor suave, usada só no ponto e na barra.
3. **Sem vermelho de erro** em nenhum número de desempenho. Vermelho só pra erro técnico (ex.: sem internet).

### 📱 Celular x 💻 computador

| | iPhone (390 px) | Windows |
|---|---|---|
| Tela inicial | Timer ocupando a tela + tarefa atual + botão "anotar" | Painel completo do print |
| Planejar o dia | Cartões em sequência, 1 por tarefa | Lista + agenda lado a lado |
| Estatísticas | Rolagem vertical, 1 gráfico por vez | Faixa inteira visível |
| Anotação rápida | Botão flutuante, abre teclado com ditado | Caixa sempre aberta + atalho de teclado |
| Durante o ciclo | Tela mantida acesa se ele quiser (Wake Lock) | Janela do app instalado (Edge ou Chrome) |

### 🔒 Live Activity e tela bloqueada no iPhone: é viável numa PWA?

**Resposta curta: não.** Live Activity (o timer na tela bloqueada e na Ilha Dinâmica) só existe pra app nativo.

1. A Apple constrói Live Activities com **ActivityKit + SwiftUI + WidgetKit** dentro de uma extensão de widget do app nativo, e as atualizações por push usam um token que só o ActivityKit fornece ([Apple, ActivityKit](https://developer.apple.com/documentation/activitykit); [Apple, push de Live Activities](https://developer.apple.com/documentation/activitykit/starting-and-updating-live-activities-with-activitykit-push-notifications)). Não achei nenhuma documentação de caminho pra web. A conclusão "PWA não tem Live Activity" é dedução desses requisitos nativos, não uma frase da Apple. [confirmar se mudar em iOS futuro]
2. **O que a PWA consegue no iPhone:**
   1. **Notificação push**, desde iOS 16.4, só com o app **adicionado à Tela de Início** e com permissão pedida a partir de um toque do usuário ([WebKit, Web Push no iOS](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)). Na aba comum do Safari, não funciona.
   2. **Manter a tela acesa** (Screen Wake Lock), que chegou ao Safari 18.4 segundo resumos da época. [confirmar em teste no iPhone do Romero]
   3. No **iOS 26**, todo site adicionado à Tela de Início abre como app por padrão ([iDownloadBlog sobre iOS 26](https://www.idownloadblog.com/?p=1042117); [MacRumors, Safari no iOS 26](https://www.macrumors.com/guide/ios-26-safari-features/)). Isso facilita a instalação.
3. **O que a PWA não consegue:** rodar código com o app fechado. Sincronização em segundo plano e busca em segundo plano não são suportadas no iOS ([MagicBell, limites de PWA no iOS](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide)). Resultado: **o timer não "conta" sozinho no fundo** e o som de fim de ciclo não toca se o app estiver fechado.
4. **Como resolver na v1, sem app nativo:**
   1. **O timer é uma conta, não um contador.** Grava a hora de início e a duração. Ao reabrir, a tela calcula quanto falta. Nunca "perde" tempo.
   2. **A notificação de fim de ciclo vem do servidor.** Ao iniciar o ciclo, o app agenda no Supabase um aviso pra hora do fim; uma função no servidor manda o push. Chega com o iPhone bloqueado, como qualquer notificação.
   3. **Ponte com o próprio iPhone (Atalhos):** um botão "rodar no iPhone" pode abrir um Atalho da Apple que liga o **Modo Foco** (o Atalhos tem ação de definir Foco) e inicia o **timer do app Relógio**, que aparece na tela bloqueada. [confirmar em teste: abrir Atalho a partir da PWA e o timer do Relógio na tela bloqueada do iPhone do Romero]
5. **Se o timer na tela bloqueada virar indispensável** depois de 30 dias, aí sim vale um app nativo pequeno (só o timer) falando com o mesmo Supabase. Fica fora da v1.

---

## 🏗️ 10. Técnica

Visão do Arquiteto de Software.

### ⚙️ Pilha
1. **Tela:** mais uma página HTML no repositório `central-da-familia` (ex.: pasta `foco/`), no mesmo padrão do Parcelas, publicada no GitHub Pages. Instalável como app (PWA) no iPhone e no Windows (Edge ou Chrome).
2. **Dados e login:** Supabase que já existe (projeto `central-da-familia`), tabela `docs`, painel `foco`. Mesmo login e mesma camada de salvar e carregar (`window.NUVEM`) do Parcelas.
3. **Servidor:** Supabase Edge Functions pra (a) chamar o Claude e (b) mandar o push de fim de ciclo. Agendamento do push com `pg_cron` ou fila simples. [confirmar: se o `pg_cron` está disponível no plano grátis do projeto]
4. **Agenda:** endereço privado iCal do Google Calendar lido por uma Edge Function e guardado em cache no dia. Sem login Google na v1.
5. **IA:** Claude pela API, chave guardada só no servidor.

### ⚠️ Pontos de atenção
1. **Timer por hora de início**, nunca por contador em memória (seção 9). Isso vale também no Windows, onde a aba pode dormir.
2. **Sem internet:** o ciclo roda mesmo offline; a sessão é gravada no navegador e sobe quando voltar a conexão.
3. **Duas telas abertas ao mesmo tempo** (Windows e iPhone): só 1 ciclo ativo por vez. Quem iniciar por último assume e a outra tela mostra "ciclo rodando no iPhone".
4. **Projeto grátis pausa** depois de cerca de 7 dias sem uso. Com uso diário do Foco, isso deixa de acontecer. Os dados não se perdem se pausar.
5. **Fuso:** todas as datas em horário de Recife (UTC-3) pra o "dia" não virar à meia-noite de outro fuso.
6. **Push no iPhone exige a Central instalada na Tela de Início.** O primeiro uso precisa de um passo guiado: "adicione à Tela de Início, depois toque em ativar avisos".

### 🗺️ Ordem de construção (fases com trava)
1. **Fase 1, o relógio:** tarefas do dia, estimativa, timer flexível, sessões gravadas, anotação rápida (só guardar). Trava: 10 dias de uso.
2. **Fase 2, o espelho:** números do topo, fator de estimativa, fim do dia, "onde foi seu tempo". Trava: 20 dias de uso em 30.
3. **Fase 3, os nervos:** IA (estimativa, "qual agora?", arquivar notas), ligações com Parcelas, Jardim, Banco e Portfólio, agenda Google.

---

## 🔬 11. Concorrentes

Pesquisa feita em 25/11/2026. Preços em dólar (loja americana ou site oficial) e variam por país. Onde as fontes discordam, está marcado [confirmar].

| # | Produto | O que faz | Preço atual | Copiar | Evitar | Fonte |
|---|---|---|---|---|---|---|
| 1 | **Forest** | Timer de foco em que uma árvore cresce enquanto você não mexe no celular. | Fontes divergem: uma resenha diz que virou grátis + assinatura Forest Plus (cerca de US$ 59,99/ano) desde dez/2025; outras ainda citam US$ 3,99 compra única. [confirmar] | Recompensa visível que se acumula (a floresta). | Árvore que **morre** quando você sai: culpa pura pro TDAH. | [forestapp.cc](https://www.forestapp.cc/) · [App Store](https://apps.apple.com/app/id866450515) · [resenha Headway](https://makeheadway.com/blog/forest-app-review/) |
| 2 | **Focusmate** | Sessões de foco por vídeo com um desconhecido (25, 50 ou 75 min), o "body doubling". | Grátis: 3 sessões por semana. Plus: cerca de US$ 8/mês no anual ou US$ 12/mês no mensal. [confirmar] | Compromisso marcado com hora; dizer em voz alta o que vai fazer no início. | Depende de outra pessoa e de câmera; não organiza o dia. Evidência científica de body doubling em adultos com TDAH ainda é fraca ([arXiv 2025](https://arxiv.org/html/2509.12153v1)). | [focusmate.com](https://www.focusmate.com/) · [Lifestack](https://lifestack.ai/blog/focusmate-pricing) |
| 3 | **Sunsama** | Planejador diário com ritual guiado de planejar a manhã e "desligar" à noite, puxando tarefas de vários lugares. | Pro: US$ 17/mês no anual ou US$ 22/mês no mensal, sem plano grátis (14 dias de teste). O FAQ do próprio site ainda cita US$ 20/25. [confirmar] | **Ritual de planejar e de fechar o dia**; aviso quando o plano passa das horas disponíveis. | Preço alto; ritual longo demais pra quem tem TDAH. | [sunsama.com/pricing](https://sunsama.com/pricing) · [resenha Carly](https://www.usecarly.com/blog/sunsama-review/) |
| 4 | **Structured** | Linha do tempo visual do dia, com tarefas como blocos coloridos e caixa de entrada. | Grátis com recursos básicos. Pro: cerca de US$ 6,49/mês, US$ 19,99 a 29,99/ano ou vitalício US$ 64,99 a 99,99 (a loja mostra valores diferentes). [confirmar] | **Dia como linha do tempo visível**; reagendar automático o que ficou. | Planejar minuto a minuto vira lista de falhas quando o dia desanda. | [structured.app](https://structured.app/) · [App Store](https://apps.apple.com/app/id1499198946) |
| 5 | **Tiimo** | Planejador visual feito pra TDAH e autismo: timers visuais, rotinas, IA que quebra tarefa e estima tempo. App do Ano de iPhone 2025 na App Store. | Grátis limitado ao celular. Pro: fontes citam de US$ 5,99 a 12/mês (web costuma sair mais barato que pela loja). [confirmar] | **Timer visual que encolhe**, IA que quebra tarefa, **Live Activity e Ilha Dinâmica**, tom gentil. | Web só no pago; Windows não confirmado no site oficial. | [tiimoapp.com](https://www.tiimoapp.com/) · [funções](https://tiimoapp.com/features) · [App Store](https://apps.apple.com/app/id1480220328) · [Neurolaunch](https://neurolaunch.com/tiimo-review/) |
| 6 | **Llama Life** | Lista do dia em que **cada tarefa tem seu próprio timer** (timeboxing), feita pra TDAH. | Loja americana: US$ 6/mês ou US$ 39/ano (há também opções de US$ 4 e US$ 29 sem rótulo claro). [confirmar] | Timer por tarefa, não por ciclo fixo; mostra a hora prevista de terminar a lista. | Pouca visão de "pra onde foi o tempo" ao longo das semanas. [confirmar] | [llamalife.co](https://llamalife.co/) · [App Store](https://apps.apple.com/us/app/adhd-organizer-llama-life/id6454469750) · [Neurolaunch](https://neurolaunch.com/llama-life/) |
| 7 | **Toggl Track** | Rastreador de tempo (começa e para o cronômetro por projeto), com relatórios. Tem app de Windows. | Grátis pra uso individual. Starter cerca de US$ 9 a 10 por pessoa/mês; Premium entre US$ 14 e 20. [confirmar] | **Relatório "onde foi meu tempo" por área**; registrar tempo depois do fato. | Feito pra empresa e cobrança por hora; ninguém com TDAH lembra de apertar o cronômetro. | [toggl.com/track/pricing](https://toggl.com/track/pricing/) · [suporte Toggl](https://support.toggl.com/payment-plans-at-toggl-track) |
| 8 | **Session** | Timer pomodoro com intenção por sessão, estatísticas e bloqueio de sites (bloqueio só no Mac). | US$ 4,99/mês ou US$ 39,99/ano (loja americana). | Perguntar "qual a intenção desta sessão?" e o registro de como foi ao fim. | Bloqueio só no Mac; sem versão de Windows. [confirmar] | [stayinsession.com](https://www.stayinsession.com/) · [App Store](https://apps.apple.com/us/app/session/id1521432881) |
| 9 | **Flow** | Timer pomodoro simples e bonito pra Mac e iPhone. | Grátis básico. Pro: US$ 2,99/mês, US$ 17,99/ano ou vitalício US$ 39,99 (loja americana). | Visual limpo, poucas opções, tamanhos de ciclo ajustáveis. | Só ecossistema Apple; não serve no Windows. | [flow.app](https://flow.app/) · [App Store](https://apps.apple.com/app/id1423210932) |
| 10 | **Motion** | Agenda com IA que encaixa tarefas sozinha no calendário e reorganiza quando algo atrasa. | Fontes conflitam: de US$ 19 a 49/mês; sem plano grátis; relatos de reembolso difícil. [confirmar] | Plano que **se reorganiza sozinho** quando o dia desanda. | Caro, controle demais na mão da IA, agenda que muda o tempo todo gera ansiedade. | [usemotion.com](https://www.usemotion.com/) · [Neurolaunch](https://neurolaunch.com/motion-app-cost/) |
| 11 | **Akiflow** | Caixa de entrada única que puxa tarefas de vários apps e arrasta pro calendário (time blocking). | US$ 19/mês no anual ou US$ 34/mês no mensal. | **Caixa única** de tudo que pede atenção (é o papel do "Planejar o dia" com as tarefas do Parcelas). | Preço e curva de aprendizado; feito pra quem tem muitas ferramentas de trabalho. | [akiflow.com](https://akiflow.com/) · [Morgen, preços](https://www.morgen.so/blog-posts/akiflow-pricing) |
| 12 | **Foco do iPhone (Focus modes)** | Modos que silenciam notificações e escondem apps e telas; filtros de Foco deixam apps mostrarem só o conteúdo daquele modo. Pode ser ligado por Atalhos. | Grátis, vem no iOS. | **Ligar o Modo Foco junto com o ciclo** (via Atalho) pra silenciar o WhatsApp. | Não mede tempo nem tarefa; não fala com a web. | [Apple, API de Foco](https://developer.apple.com/documentation/appintents/focus) · [MacRumors, filtros](https://www.macrumors.com/how-to/use-focus-mode-filters-ios/) |
| 13 | **Tempo de Uso do iPhone (Screen Time)** | Mostra tempo por app e permite limites. Apps de terceiros só acessam por uma API restrita (Family Controls), com dados opacos. | Grátis, vem no iOS. | Relatório semanal automático como inspiração pro "onde foi seu tempo". | **Não dá pra puxar esses dados pra Central**: a API só serve app nativo e não exporta detalhe por app. | [Apple, WWDC21 Screen Time API](https://developer.apple.com/wwdc21/10123) · [fórum Apple](https://developer.apple.com/forums/thread/836341) |

### 🧠 O que a pesquisa diz sobre pomodoro e TDAH

1. **Não achei nenhum estudo controlado de pomodoro em adultos com TDAH.** O que circula sobre "pomodoro pra TDAH" é opinião de clínico e blog de app ([TextExpander](https://textexpander.com/blog/pomodoro-technique-adhd), [Psych Central](https://www.psychcentral.com/adhd/how-to-adapt-the-pomodoro-technique-adhd)). Esses textos sugerem começar com **10 a 15 minutos** e lembram que, pra alguns, 25 é curto porque entrar no foco demora.
2. **Em estudantes em geral, a evidência é mista:**
   1. **Biwer e colegas (2023, British Journal of Educational Psychology):** pausas fixas (24/6 e 12/3) deram melhor humor e pareceram mais eficientes (mesma entrega em menos tempo) que pausas livres ([PubMed 36859717](https://pubmed.ncbi.nlm.nih.gov/36859717/)).
   2. **Estudo de 2025 com 94 universitários** (mesmo grupo de Maastricht, comparando pausa livre, pomodoro e Flowtime): pausas fixas de 25/5 levaram a **cansaço subindo mais rápido**, e pomodoro e Flowtime levaram a **motivação caindo mais rápido** que pausas livres, sem diferença clara de desempenho ([PMC12292963](https://pmc.ncbi.nlm.nih.gov/articles/PMC12292963/); [Maastricht](https://cris.maastrichtuniversity.nl/en/publications/investigating-the-effectiveness-of-self-regulated-pomodoro-and-fl/)). [confirmar lendo o texto completo; os resumos secundários divergem]
   3. **Revisão de escopo de 2025 (Ogut, BMC Medical Education):** em 3 ensaios pequenos (87 pessoas), intervalos estruturados reduziram o cansaço em cerca de 20%; ganho de desempenho não comprovado ([BMC Medical Education](https://link.springer.com/article/10.1186/s12909-025-08001-0)). Não é meta-análise.
3. **O que tem evidência no TDAH adulto é treinar gestão de tempo e organização**, não um número mágico de minutos: ensaio com 88 adultos em terapia metacognitiva de 12 semanas ([PubMed 20231319](https://pubmed.ncbi.nlm.nih.gov/20231319/)) e piloto japonês de terapia cognitivo-comportamental focada em tempo ([PubMed 33472510](https://pubmed.ncbi.nlm.nih.gov/33472510/)).
4. **Decisão de produto:** o 25/5 fica como **padrão, não como regra**. Ciclos de 10, 25, 45 e modo fluxo, com pausa pulável. O app aprende com os dados do próprio Romero qual tamanho termina inteiro com mais frequência e sugere esse. O valor real pro TDAH está em **tornar o tempo visível e registrar plano x real**, que é onde a pesquisa aponta.

---

## ✂️ 12. Fora da v1

1. **App nativo e Live Activity.** Só se o push + Atalho não bastarem depois de 30 dias.
2. **Família.** Andreza, rotina das crianças e "modo casal" ficam pra v2 (seção 6).
3. **Escrever na agenda Google.** Na v1 a agenda é só leitura.
4. **Bloqueio de apps e sites.** O iPhone já faz com o Modo Foco; no Windows, avaliar depois. [confirmar se é dor real]
5. **Body doubling (sessão com outra pessoa).** Se quiser, usar o Focusmate grátis em paralelo.
6. **Puxar dados do Tempo de Uso do iPhone.** Não é possível pela web (seção 11).
7. **Gamificação pesada** (moedas, ranking, loja de prêmios).
8. **Ligação com o Escritório da Família** (turnos da casa como blocos).
9. **Relatórios para terceiros** (sócio, cliente do negócio novo).

---

## 📏 13. Sucesso em 30 dias

| # | Indicador | Meta do piloto | Como medir |
|---|---|---|---|
| 1 | Dias com pelo menos 1 ciclo | 20 de 30 | `foco / dias` |
| 2 | Dias com plano feito de manhã | 15 de 30 | `foco / dias`, campo plano |
| 3 | Fator de estimativa | Chegar mais perto de 1,0 entre a semana 1 e a semana 4 (ex.: de 1,6x pra 1,3x) | `foco / semanas` |
| 4 | Ciclos terminados inteiros | 60% ou mais, com o tamanho que o próprio Romero escolheu | `foco / sessoes` |
| 5 | Anotações rápidas resolvidas | 80% enviadas ou descartadas até o fim do dia seguinte | `foco / notas` |
| 6 | Revisões de domingo com o bloco do Foco | 4 de 4 | `foco / semanas` |
| 7 | Sensação (pergunta no fim do piloto) | Romero responde "sim" a: "termino o dia sabendo pra onde foi meu tempo, sem culpa?" | Conversa |

**Sinal de alarme:** 3 dias seguidos sem abrir. Nesse caso, o problema é o produto (atrito ou culpa), não o Romero. Revisar o fluxo antes de cobrar uso.

---

## ❓ 14. Perguntas em aberto

1. **Planejar pela tela ou pela conversa com o Claude?**
   Recomendação: os dois, com a tela como fonte da verdade. A tela faz o básico em 2 min; o Claude, pela conexão com o Supabase, grava tarefas em `foco / tarefas` quando o Romero preferir falar. Testar na semana 1 qual ele usa mais.
2. **Qual o "dia mínimo" que conta como dia com foco?**
   Recomendação: 1 ciclo de 10 minutos. Baixo de propósito, pra o hábito nunca quebrar por um dia ruim. Subir só se o próprio Romero pedir.
3. **Nome do órgão: "Foco e tempo", "Relógio" ou outro?**
   Recomendação: **"Foco"** no menu da Central (curto) e "Foco e *tempo*" no título da página, seguindo o padrão de itálico na 2ª palavra.
4. **O timer na tela bloqueada é indispensável já na v1?**
   Recomendação: não. Começar com push do servidor + Atalho que liga o Modo Foco e o timer do Relógio. Medir em 30 dias se o Romero sente falta; só então avaliar app nativo pequeno.
