# Proposta D · Rumo a 2029

## Conceito

O Início abre com a meta da família de viver de rendimentos a partir de 2029 e a falta mensal no cenário oficial.  
O limite de hoje e as tarefas prioritárias transformam esse objetivo em decisões para agora.  
Aplicações, imóveis e receitas previstas têm um indicador cada, com responsáveis visíveis no escritório.

## Hierarquia da primeira tela

- **Em 2 segundos.** “Rumo a 2029” e a falta mensal com margem, no maior corpo numérico.
- **Em 5 segundos.** Quanto a família pode gastar hoje, o que pede atenção e a cobertura atual da meta. O percentual representa cobertura de renda no cenário oficial. O traçado tem partida e destino fixos e usa essa cobertura para preencher a trilha.
- **Depois.** A fila pode ser expandida. No celular, o escritório vem antes dos cartões dos motores para dar mais destaque à equipe. No desktop, os três cartões aparecem lado a lado e a faixa do escritório vem em seguida.

## Sistema visual

**Manrope Variable + Inter Variable.** A Manrope em 800 aproxima o peso geométrico da Wise nos títulos e valores. A Inter mantém a leitura de rótulos e controles próxima da Revolut.

- **Escala.** 12/16 px e peso 650–700 para rótulos, 13/16 px e 650 para ações, 14/19 px e 400 para tarefas, 16/20 px e 800 para subtítulos, 22/26 px e 800 para títulos de seção. Valores em 28/31 px ou 36/40 px, peso 800, tabulares e em uma linha. O H1 usa 42/43 px no celular e 60/61 px no desktop.
- **Claro.** Fundo sálvia `#e9ede6`, cartões `#ffffff`, camadas de apoio `#e1e7dd`, texto `#17201a` e secundário `#4b564e`. O painel do plano alterna para `#15221b` com texto `#f5f8f3` e secundário `#c0cdc3`.
- **Escuro.** Fundo `#0c0c0b`, cartões `#131312`, menu `#1a1918`, painel `#1c2b21`, texto `#f1f4ee` e secundário `#b8c1b8`. Divisórias, preenchimentos discretos e a maquete usam misturas em OKLCH.
- **Destaque único.** Verde folha `#426435` no claro e sua versão clara `#b6dfa0` nas superfícies escuras. Dinheiro em risco tem vermelho semântico `#96342d` ou `#ffa69e`. Operação e Lembrete usam texto e ícones próprios em superfícies neutras. Cartões usam raio de 12 px, grupos menores 8 px e o selo 6 px. Ações usam pílulas.

## Medição e escritório

- **375 × 812, claro e escuro.** A casca mediu **4** ocorrências acima da dobra. São a falta com margem, a falta sem margem, a cobertura e o orçamento de hoje.
- **1280 × 800, claro e escuro.** A casca mediu **7** ocorrências acima da dobra. Aos quatro números do celular somam-se os três motores. As medidas são do snapshot de exemplo, com as fontes carregadas. O Vitest protege a reserva de ocorrências por bloco, enquanto a casca faz a medição geométrica.
- **Quem trabalha por você.** Avatares de 32 px com controles de pelo menos 44 px mostram Gestor do Guardado, Ajudante dos Imóveis e Tesoureiro de Receitas. Selecionar um atualiza o estado acessível e destaca sua sala na `EscritorioMaquete`. As duas funções de patrimônio compartilham a sala. As fichas da prévia mostram o estado de hoje, sem balões financeiros.
- **Privacidade.** O olho da casca ou a prop `oculto` retiram valores, marcadores e a geometria de cobertura da árvore renderizada. Os textos livres das tarefas também são ocultados porque o contrato fornece a pergunta completa em uma única string. A vista do Assessor apresenta somente tarefas operacionais da casa por tipo de pendência.

## Mudança em relação ao Início atual

O plano ganha o primeiro lugar, o orçamento vira uma decisão do dia e a fila longa passa a mostrar primeiro até duas tarefas ordenadas por risco, operação e lembrete. O selo Exemplo aparece uma vez. O plano, o dia e os motores têm papéis tipográficos distintos. Lançamentos, faturas, envelopes e demais detalhes ganham acesso por seus destinos de produto. O escritório acompanha a leitura dos indicadores com nomes e estados dos responsáveis.

## Autoavaliação

1. **Hierarquia em dois segundos — 9/10.** O H1 e a falta oficial dominam o contraste e a área do primeiro cartão. O limite imediato tem menos peso do que a meta.
2. **Números acima da dobra — 9/10.** Casca em 4 no celular e 7 no desktop. Os motores exigem rolagem no celular.
3. **Ritmo e espaçamento — 8/10.** Painel amplo, faixa de decisão, cartões e maquete têm ritmos distintos. A fila pode crescer com títulos longos.
4. **Tipografia — 9/10.** Corpo e números têm famílias, tamanhos, pesos e entrelinhas definidos. A falta sem margem fica discreta no resumo.
5. **Ícones e ilustrações — 8/10.** Lucide orienta a navegação e os tipos de tarefa, e a família duotone explica campos vazios. Os avatares usam o símbolo da função.
6. **Organização por tarefa — 8/10.** A faixa de saúde leva ao orçamento e à fila priorizada. A prévia permite revisar a fila. Responder a uma tarefa é ação da tela real.
7. **Acessibilidade — 8/10.** Pares de texto AA calculados, alvos conferidos no navegador, foco explícito e um H1. Falta uma sessão de uso com leitor de tela.
8. **Privacidade — 9/10.** Valores e preenchimento saem do DOM nos dois caminhos do olho. A granularidade dos textos livres limita o que a fila consegue revelar em modo privado.
9. **Temas claro e escuro — 9/10.** Quatro combinações medidas no navegador. O horizonte mantém a mesma linguagem cromática nos dois temas.
10. **Escritório como personagem — 8/10.** A seleção mostra quem responde por cada motor e o que está fazendo hoje. Aplicações e imóveis iluminam a mesma sala, e a maquete cobre quatro áreas da equipe.

## Como produtizar

- **Plano.** Adaptar `useResumoFamilia().resumo.plano2029` com `lib/resumo/leituras.lerPlano`. Ligar `falta_com_margem`, `falta_sem_margem` e `cobre_pct` ao cenário oficial. O destino é `#/planejamento?secao=plano2029`. O valor pode exceder a cobertura completa na leitura textual. O desenho satura na chegada.
- **Para hoje.** Ligar `resumo.podeGastarHoje` ao seletor `lerOrcamento` e ao valor com unidade de `lib/resumo/orcamento`. Destino `#/orcamento`. Ligar a fila de ações a `api.escritorioHoje`, `lib/resumo/pendencias` e `PrecisaDeVoce` em `#/escritorio`. O contrato fornece nível e ordem de origem, mas não traz um prazo em todas as tarefas. Para a fila real, expor o tipo de ação, destino, vencimento e trechos privados estruturados.
- **Motores.** Usar `resumo.aplicacoes` com `lerAplicacoes` e `totaisGuardado` para o rendimento diário, em `#/guardado?secao=aplicacoes`. Imóveis vêm de `resumo.imoveis` e `lerImoveis`, em `#/guardado?secao=imoveis`. Receitas vêm de `resumo.recebimentos` e `recebimentosDoMes`, em `#/planejamento?secao=recebimentos`. Os períodos são diferentes e os cartões não formam um total.
- **Escritório.** Manter os perfis de `telas/escritorio/equipe` e a composição de `useEquipe`. Trocar a miniatura pelo `EscritorioIsometrico` da f38, carregado sob demanda, e levar o atalho à tela `#/escritorio`. O snapshot não inclui retratos nem uma relação explícita entre funcionário e indicador. A prévia usa ícones de função e uma associação local por IDs existentes.
- **Casca e acesso.** Os atalhos da D focam seções na própria prévia. No produto, substituir pelos destinos de `app/destinos` e pelo menu autorizado de `app/rotas`, com o olho ligado ao contexto do app. Esta prévia aplica a apresentação financeira ao papel `casal`. Para `pessoa`, o app real mantém o orçamento próprio. Para `equipe`, montar somente a superfície de tarefas em `#/casa` antes de qualquer busca financeira.
- **Estados remotos.** O snapshot tem `pronto`, `vazio` e `indisponivel`. A composição do produto também carrega, restringe e pode falhar. Ligar esses estados ao texto com sua origem e ao `repetir` do hook. Um campo financeiro ausente mostra “Ainda sem dado”. Um zero é mostrado se a fonte o declarou pronto.
