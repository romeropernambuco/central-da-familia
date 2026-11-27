# 11-E · Tela e interação · Caderno de construção
Leia antes `docs/escritorio/00-base-comum.md`. Se este caderno contradisser a base comum, vale a base comum. Todos os números são da família Silva (exemplo), na data de referência: terça, 24/11/2026, 9h00, fuso de Recife, com Marina Silva logada.

## 1. Objetivo e o que não é
**Objetivo.** Deixar a tela do Escritório curta e legível em 2 segundos, sem tirar nada dela:

| Medida | Hoje (prévia a 390 px) | Meta |
|---|---|---|
| Altura no celular (390 px) | 9.624 px | até 4.000 px |
| Altura no computador (1280 px) | 5.849 px | até 2.600 px |
| Cartão de ajudante fechado | 536 a 660 px, 70 a 121 palavras | até 200 px, até 25 palavras |
| Trechos de texto em 10 ou 11 px | 39 | 0 (mínimo 12 px) |
| Animação sem fim | 1 (ponto piscando) | 0 |
| 1ª pendência com botão, sem rolar, em 390x844 | não aparece (começa em 821 px) | aparece |

**O que NÃO muda.**
1. Os blocos e a ordem: cabeçalho, resumo, "Depende de você", cena, cartões em 3 grupos ("Dinheiro do mês", "Casa e feira", "Reserva"), "Dias de cada ajudante", linha de saúde.
2. A cena em pixel e os 8 personagens. Nenhum desenho é refeito.
3. 1 cor de destaque: o verde (`--hue`). Âmbar só pra "Atrasado", como a prévia já faz.
4. Os 8 ajudantes, seus nomes, setores e horários (parte 4 da base comum).
5. Fundo claro, cartões brancos, tema escuro automático, fonte Geist.
6. Nenhum bloco é apagado: só recolhe ou vai pra dentro do cartão.

**O que não é.** Não é layout novo, não é o modo 3D (ficha 11-F), não cria conta nem regra de dinheiro (ficha 11-D), não cria tabela (o banco é das fichas 11-B, 11-C e da Tarefa 11). Os itens 10 e 11 da ficha entram na Tarefa 20 e o item 12 fica pra depois do piloto. Aqui só fica pronto o lado da tela do item 11 (fluxo 8.5).

## 2. Antes de começar
1. Os passos 1 a 15 não dependem do banco (etapa 8 do `LEIA-PRIMEIRO.md`, parte 3). Pros passos 16 a 18, confirme que as etapas 2 a 6 estão prontas. Sem eles, use dados fixos da família Silva num arquivo de exemplo e não ligue nada ao banco.
2. O repositório hoje tem só `index.html`, `parcelas/` e `docs/`. A pasta do app em React nasce na Tarefa 6. Este caderno assume `src/telas/escritorio/`. Se a Tarefa 6 escolheu outro caminho, use o caminho real e mantenha os nomes dos arquivos.
3. Abra a prévia (`escritorio-previa.html`, sem `doctype`; embrulhe em `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>...</body></html>`) e tire print em 390 e 1280, tema claro e escuro. São os prints de "antes".
4. Copie os tokens (variáveis de estilo com nome) do bloco `:root` da prévia. A parte 4 traz a tabela.
5. Trabalhe num ramo de rascunho. Só a família Silva. Nenhuma escrita em banco de família real.
6. Ícones: Lucide, 16 px, traço 1,75, sempre com `aria-hidden="true"` (escondido do leitor de tela, o programa que lê a tela em voz alta). Vocabulário de tela: ajudante, conferência, relatório, pendência. Nunca "agente", "turno", "IA", "modelo", "tokens" na tela da família.

## 3. Passos de construção
| # | O que fazer | Onde | Pronto quando | Como testar |
|---|---|---|---|---|
| 1 | Criar os tokens que faltam (parte 4) e trocar todo valor solto de cor, espaço e fonte por token | `src/estilo/tokens.css` | busca por `font-size:1[01]px` e por `#` de cor nos arquivos da tela dá 0 | T-E05, T-E17 |
| 2 | Criar os tipos da parte 6 | `src/telas/escritorio/tipos.ts` | o projeto compila sem `any` | `tsc --noEmit` |
| 3 | Criar o arquivo de exemplo com os 8 ajudantes, as 3 pendências e os 3 cenários extras (parte "Dados que acrescentei") | `src/telas/escritorio/exemplo-silva.ts` | os 8 textos do nível 1 batem letra a letra com a parte 6.1 | T-E03 |
| 4 | Construir `SinalDeSituacao` com as 7 situações | `componentes/SinalDeSituacao.tsx` | as 7 aparecem com ícone e palavra da parte 7 | T-E08, T-E09 |
| 5 | Construir `CartaoAjudante` nível 1 | `componentes/CartaoAjudante.tsx` | fechado mede 144 px sem botão e 196 px com botão, em 390 px | T-E02, T-E03 |
| 6 | Acrescentar o nível 2 (abre no lugar) e o nível 3 ("Ver detalhes") | mesmo arquivo | 1 toque abre, 1 toque fecha, foco não se perde | T-E12, T-E13 |
| 7 | Construir `LinhaPendencia`, `BotaoAgoraNao` e `BarraDesfazer` | `componentes/` | fluxos 8.1 e 8.2 completos com dados de exemplo | T-E14, T-E15, T-E16 |
| 8 | Construir `CampoPergunta` dentro do cartão | `componentes/CampoPergunta.tsx` | fluxo 8.3 completo | T-E19 |
| 9 | Construir `Ajudou` | `componentes/Ajudou.tsx` | fluxo 8.4 completo, troca de resposta funciona | T-E20 |
| 10 | Construir `FaixaResumo`, `LinhaNovidades` e montar o bloco de resumo | `componentes/` e `Escritorio.tsx` | bloco de resumo mede até 240 px em 390 px | T-E01 |
| 11 | Montar a página na ordem da parte 5, com a cena recolhida no celular e "Dias de cada ajudante" recolhido | `Escritorio.tsx` | alturas da parte 5 respeitadas | T-E01, T-E04, T-E06 |
| 12 | Construir `ChaveSoOQueDependeDeMim` | `componentes/` | fluxo 8.6 completo e a escolha volta ao reabrir | T-E21 |
| 13 | Construir `LinhaSaude`, `FaixaSemInternet` e `DescricaoDaCena` | `componentes/` | 2 formas da saúde, faixa aparece sem rede, cena tem texto | T-E22, T-E23, T-E24 |
| 14 | Construir `ListaPorAjudante` no painel do dono | `src/telas/dono/` (a mesma pasta do `CustoIA.tsx` da 11-B) | em 390 px a tabela vira lista de 2 linhas, sem rolagem lateral | T-E25 |
| 15 | Movimento e "reduzir movimento" (parte 7) | CSS dos componentes | nenhuma animação passa de 5 s; com a preferência ligada, tudo parado | T-E10, T-E11 |
| 16 | Ligar ao banco, trocando o arquivo de exemplo pelas funções das fichas 11-B e 11-C (tabela da parte 6, "De onde vem cada dado"). Construir aqui a função única de situação `escritorio_estado()`, seguindo o contrato da parte 6 do caderno 11-F, e fazer `escritorio_tela()` usar a saída dela | `dados.ts` e 1 migração | os 6 fluxos gravam e leem na família Silva; a palavra da situação vem pronta do banco | T-E14 a T-E21 de novo |
| 17 | Abrir pela pendência (endereço com `?pendencia=`) | `Escritorio.tsx` | fluxo 8.5 completo | T-E26 |
| 18 | Passar a lista da parte 10 e os 30 testes; tirar os 8 prints | pasta de entrega | tudo marcado | parte 11 |

## 4. Tokens
**Tokens reais da prévia** (bloco `:root`; o escuro vale em `prefers-color-scheme: dark` e em `:root[data-theme="dark"]`). Contraste calculado pela fórmula da WCAG 2.1.

| Token | Claro | Escuro | Uso | Contraste (claro / escuro) |
|---|---|---|---|---|
| `--ground` | #F5F5F3 | #0B0B0B | fundo da página | fundo |
| `--surface` | #FFFFFF | #141414 | fundo do cartão | fundo |
| `--raised` | #EFEFEC | #1E1E1E | fundo de botão neutro e de selo | fundo |
| `--border` | #E4E4E0 | #262626 | contorno de cartão, só enfeite | 1,27 / 1,22 contra `--surface`: **abaixo de 3**, nunca usar como único limite de controle |
| `--rule` | #EEEEEA | #1E1E1E | linha divisória | enfeite |
| `--text` | #111111 | #F4F4F2 | texto principal, número | 18,88 / 16,73 em `--surface` |
| `--muted` | #6B6A66 | #A3A29E | legenda, comparação | 5,41 / 7,21 em `--surface`; 4,96 / 7,70 em `--ground`; 4,70 / 6,52 em `--raised` |
| `--faint` | #9C9B97 | #6E6D69 | hoje: seta da fila e texto apagado | **2,78 / 3,56 em `--surface`; 2,55 / 3,80 em `--ground`; 2,41 / 3,22 em `--raised`. Abaixo de 4,5: proibido em texto e em ícone que informa** |
| `--hue` | #0E7A5A | #34D399 | o verde: botão principal, ícone de "Precisa de você", foco | 5,32 / 9,58 em `--surface`; 4,87 / 10,24 em `--ground`; 4,61 / 8,67 em `--raised` |
| `--hue-soft` | #E3F2EC | #0F2A21 | fundo suave do verde | fundo |
| `--hue-ink` | #064E3A | #A7F3D0 | texto sobre `--hue-soft` | 8,42 / 11,92 |
| `--on-hue` | #FFFFFF | #04150F | texto do botão verde | 5,32 / 9,76 sobre `--hue` |
| `--warn`, `--warn-soft` | iguais a `--hue` e `--hue-soft` | idem | não usar nesta tela (nome engana) | |
| `--scene-bg` | #161615 | #161615 | fundo da cena | etiqueta da cena #EDEDF3 sobre #171721: 15,25 |
| `--radius`, `--r-md` / `--r-sm` / `--r-lg` / `--r-pill` | 12px / 8px / 16px / 40px | | cartão / campo / painel / botão e selo | |
| `--sp-1` a `--sp-7` | 8, 12, 16, 20, 24, 32, 40 px | | espaços | |
| `--fs-legal` / `--fs-ui-sm` / `--fs-body` | 12px / 14px / 16px | | menor texto permitido / legenda, comparação e botão / nome do ajudante e texto do nível 2 | |
| `--fs-lead` / `--fs-h2` / `--fs-stat` | 24px / 28px / 60px | | valor da faixa no computador / número grande do cartão / "coisas esperando você" no computador | |
| `--btn-h` | 40px | | **abaixo do alvo de 44 px**: nesta tela usar `--alvo-min` | |
| `--font` / `--pixel` | Geist / Silkscreen | | texto / só rótulos dentro da cena | |

**Tokens que faltam criar.**

| Token novo | Claro | Escuro | Uso | Contraste |
|---|---|---|---|---|
| `--sp-0` | 4px | 4px | espaço entre nome e número no cartão | |
| `--alvo-min` | 44px | 44px | altura e largura mínimas de tudo que se toca | |
| `--fs-stat-sm` | 48px | 48px | número "coisas esperando você" no celular | |
| `--ambar-tinta` | #7A3A06 | #FBC48A | ícone e palavra de "Atrasado" (valores que a prévia já usa soltos) | 7,69 / 10,30 sobre `--ambar-suave`; 8,62 / 11,72 em `--surface` |
| `--ambar-suave` | #FDF0E1 | #2E1D0C | fundo da pílula de "Atrasado" | fundo |
| `--borda-controle` | #8A8985 | #7A7975 | contorno da chave, dos campos e dos botões de contorno | 3,50 / 4,23 em `--surface`; 3,21 / 4,52 em `--ground`; 3,04 / 3,83 em `--raised` (mínimo 3 pra controle) |
| `--dur-rapida` / `--dur-pulso` / `--dur-giro` | 200ms / 600ms / 1200ms | | abrir cartão, surgir e barra / pulso / 1 volta do anel | |
| `--curva-saida` | cubic-bezier(.2,.7,.2,1) | | entrada de elemento (a prévia já usa esta curva) | |

- **Abaixo de 4,5 pra 1, pra corrigir:** (a) `--faint` em qualquer fundo, nos 2 temas: trocar por `--muted` na seta da fila e em `.cf .off`; (b) `--border` como limite de controle: trocar por `--borda-controle`; (c) o âmbar #B45309 sobre #FDF0E1 dá 4,48: não usar em texto. `--hue` sobre `--raised` no claro dá 4,61: passa, mas sem folga, então texto verde só sobre `--surface`.
- **Tirar da prévia:** o selo azulado de "Perguntando" (#E4E8F1 com #3E4A63, e o par escuro #2A3042 com #C3CADB) e o ponto roxo da fila. São uma 2ª cor de destaque. "Perguntando" passa a usar ícone verde e palavra em `--text`.

## 5. Mapa da tela
**Celular, 390 px.** 1 coluna, margem lateral `--sp-3`. A linha tracejada marca o fim da 1ª tela útil (620 px medidos no navegador, deixando 224 px pra barra de abas e áreas do iPhone).
```
   0 +--------------------------------------+
     | CABECALHO: título + 3 atalhos        |   80 px
  92 | RESUMO                               |  240 px
     |  3  coisas esperando você            |
     |  3 relatórios novos... (novidades)   |
     |  [Limite] [Guardado] [Próxima]       |  FaixaResumo, 88 px
 348 | DEPENDE DE VOCE 3  [Hoje|Semana|Tudo]|   44 px
     |  Pra decidir · 1 · uma escolha sua   |
     |  | Trocar a marca do café ou...   |  |  LinhaPendencia, 138 px
     |  | Comprador · Marina · até 26/11 |  |
 574 |  | [   Resolvi   ] [ Agora não ]  |  |
 620 |- - - - - fim da 1ª tela - - - - - - -|
     |  Pra informar · 2 (2 linhas)         |  bloco inteiro: até 580 px
 944 | CENA recolhida  [Abrir o escritório] |  120 px
1080 | [o] Só o que depende de mim          |   44 px
     | 3 grupos, 8 cartões                  |  até 2.080 px
3220 | > Dias de cada ajudante (recolhido)  |   56 px
     | LinhaSaude (44 px) + aviso (72 px)   |
3472 +--------------------------------------+
```

| Bloco (ordem fixa) | Altura alvo no celular | Altura alvo no computador | Nasce |
|---|---|---|---|
| Cabeçalho | 80 | 42 | aberto |
| Resumo (número, novidades, faixa de 3 valores) | 240 | 160 | aberto |
| Depende de você (3 pendências) | 580 | 300 | aberto |
| Cena | 120 | 450 (cena de até 400 + legenda de 50) | celular: recolhida. Computador: aberta |
| Chave e títulos dos 3 grupos | 140 | 140 | aberto |
| 8 cartões | 1.976 | 1.108 | fechados; abre sozinho só "Precisa de você" e "Perguntando" |
| Dias de cada ajudante | 56 | 56 | recolhido em 1 linha |
| Linha de saúde | 44 | 44 | aberto |
| Aviso legal (texto da ficha 11-D) | 72 | 48 | aberto |
| Espaços entre blocos e margens | 164 | 216 | |
| **Soma** | **3.472** (folga de 528) | **2.564** (folga de 36) | |

Conta dos cartões no celular: Analista de Cartão aberto com a pergunta (444) + Comprador aberto (532) + Folha fechado com botão (196) + 5 fechados sem botão (5 x 144 = 720) + 7 espaços de 12 (84) = 1.976.

**Computador, 1280 px.** Largura útil de 1.148 px, como na prévia. Mesma ordem.
```
+------------------------------------------------------------+
| CABECALHO: título à esquerda, 3 atalhos à direita    42 px  |
| 3 coisas esperando você  | Limite | Guardado | Próxima      | 160 px
| DEPENDE DE VOCE 3                    [Hoje|Esta semana|Tudo]|
| linha 64 px: texto ............. [Agora não] [  Resolvi  ]  | 300 px
| CENA aberta, até 400 px de altura, centrada na faixa escura |
| [o] Só o que depende de mim                                 |
| Dinheiro do mês:  [cartão] [cartão] [cartão]                | 4 colunas a partir
| Casa e feira:     [cartão] [cartão] [cartão] [cartão]       | de 1.200 px;
| Reserva:          [cartão]                                  | align-items:start
| > Dias de cada ajudante | saúde | aviso                     |
+------------------------------------------------------------+
```

Pontos de quebra (os da prévia): até 620 px, 1 coluna; 621 a 899, 2 colunas; 900 a 1.199, 3 colunas; a partir de 1.200, 4 colunas (novo, ver pergunta 13.3). Com `align-items:start`, o cartão aberto cresce sozinho e os vizinhos ficam fechados.

**O que aparece na 1ª tela de 390x844, sem rolar:** título, 3 atalhos, o número "3 coisas esperando você", a linha de novidades, a faixa de 3 valores, o título "Depende de você" e a 1ª pendência inteira, com "Resolvi" e "Agora não".

## 6. Componentes
Todos em `src/telas/escritorio/componentes/`. Tipos comuns em `tipos.ts`:
```ts
type AjudanteId = 'contador'|'cartao'|'vencimentos'|'comprador'|'auditor'|'presenca'|'folha'|'colchao';
type Situacao = 'trabalhando'|'entregue'|'precisa_de_voce'|'sem_dados'|'aguardando'|'atrasado'|'resumido';   // os 7 valores de escritorio_estado() (11-F, parte 6)
type Sentido = 'acima'|'abaixo'|'igual';
interface Pendencia {
  id: string; ajudanteId: AjudanteId; tipo: 'decidir'|'informar'; titulo: string;
  donoNome?: string; ate?: string; cobradaDeNovoEm?: string; adiadaAte?: string;   // datas em ISO, na tela dd/mm
  jaAdiada: boolean; pergunta?: { campos: CampoDef[] };
}
interface CampoDef { nome: string; rotulo: string; tipo: 'texto'|'dia'|'valor'; obrigatorio: boolean; }
interface Relatorio {
  id: string; fraseTitulo: string; chamouAtencao?: string; oQueFazer?: string; contaFeitaEm: string; fonte: string;
  novoParaMim: boolean; soNumero: boolean; entrouLancamentoDepois: boolean; minhaResposta?: 'ajudou'|'nao_ajudou';
}
interface Ajudante {
  id: AjudanteId; nome: string; setor: string; horario: string; oQueFaz: string;
  situacao: Situacao; palavra: string; complemento?: string;       // vêm prontos de escritorio_estado(); a tela não calcula situação
  resumido: boolean; atrasadoDesde?: string; resumidoAte?: string; // datas do complemento, pra montar "Atrasado desde 25/11" e "Resumido até 01/12"
  numero: string; legenda: string; comparacao: string; sentido: Sentido; relatorio?: Relatorio; pendencia?: Pendencia;
}
```
**De onde vem cada dado (ninguém calcula na tela).**

| Dado | Função do banco | Caderno dono |
|---|---|---|
| Situação, palavra e complemento dos 8 | `escritorio_estado()` | contrato na 11-F, parte 6; construída no passo 16 deste caderno |
| Cartões, números, textos, carimbo e pendências | `escritorio_tela()` | 11-C, seção 4.7 |
| Número, legenda curta e comparação curta de cada ajudante | contas `conta_<ajudante>` | 11-D, seção 5 |
| "Resolvi", "Desfazer", "Agora não", "Responder", "Ajudou" | `escritorio_resolver_pendencia`, `escritorio_desfazer_resolvi`, `escritorio_adiar_pendencia`, `escritorio_desfazer_adiamento`, `escritorio_responder_pergunta`, `escritorio_avaliar_relatorio` | 11-C, seção 4.10 |
| "Rodar agora" e "Refazer a conta" | `escritorio_abrir_turno` (origem `manual`) e `escritorio_refazer_conta` | 11-C, seções 4.5 e 4.9 |
| Saúde, novidades e "trabalham desde" | `escritorio_saude()`, `escritorio_rodar_atrasadas()`, `escritorio_novidades()`, `escritorio_marcar_visto()`, `escritorio_time()` | 11-B, seção 4.2 |

### 6.1 CartaoAjudante
**Pra que serve.** Mostra 1 ajudante em 3 níveis: o que dá pra ler em 2 segundos, o relatório, e os detalhes.
```ts
interface CartaoAjudanteProps {
  ajudante: Ajudante; semInternet: boolean;
  abertoNoInicio: boolean;              // true só se situacao é precisa_de_voce ou sem_dados
  aoResolver(p: Pendencia): void; aoAdiar(p: Pendencia): void;
  aoResponder(p: Pendencia, valores: Record<string,string>[]): Promise<void>;
  aoAvaliar(relatorioId: string, r: 'ajudou'|'nao_ajudou'): Promise<void>;
  aoRodarAgora(id: AjudanteId): Promise<void>; aoPedir(id: AjudanteId, texto: string): Promise<void>;   // pedido: até 200 letras
}
```
**Nível 1** (fechado: 144 px; com botão: 196 px; até 25 palavras).
```
+----------------------------------------------+   espaço interno: --sp-2 em cima e embaixo,
| [48x48]  Comprador                        v  |   --sp-3 dos lados
| [boneco] (!) Precisa de você                 |   linha do topo: 48 px
|                                              |   --sp-0
| R$ 1.180                                     |   --fs-h2, peso 600, altura de linha 28
| a mesma cesta desta semana                   |   --fs-ui-sm, --muted, 1 linha de 20
| ^ Subiu R$ 95 contra o valor do meio de 4 sem.   --fs-ui-sm, --muted, 1 linha de 20 (texto inteiro na tabela abaixo)
|                                              |   --sp-1
| [            Resolver agora                ] |   só com pendência: --hue, 44 px, largura inteira
+----------------------------------------------+
```
**Nível 2** (1 toque no cartão; abre no lugar, empurrando o que vem abaixo).
```
| ------------------------------------------- |   linha --rule
| A mesma cesta custa R$ 1.180                |   frase-título, --fs-body, peso 500 (o título da 11-D)
| O que chamou atenção                        |   rótulo --fs-ui-sm --muted
| 5 itens subiram R$ 140 por mês.             |   até 20 palavras
| O que fazer                                 |
| Trocar 2 marcas, café e azeite, devolve R$ 90 por mês.   até 20 palavras
| Este relatório ajudou? [Ajudou] [Não ajudou]|   componente Ajudou
| Trocar a marca do café ou manter a de sempre?   bloco da pendência (só se houver)
| Marina · até 26/11                          |
| [      Resolvi      ] [    Agora não    ]   |   o único verde do cartão agora é este
| Ver detalhes  v                             |   botão de texto, 44 px
```
**Nível 3** ("Ver detalhes"; abre no lugar, dentro do nível 2).
```
| O que faz por você: compara o preço de cada nota da feira.
| Fonte: 4 notas de feira, de 03/11 a 23/11.
| Conta feita em 23/11, 20h23.  Horário: segunda, 20h23.
| [ > Rodar agora ]                           |   botão neutro (--raised), ícone play
| Pedir algo a este ajudante  [campo, 200 letras] [Enviar]
```
- **Estados.** Fechado; aberto no nível 2; aberto no nível 3; com pendência; perguntando (o nível 2 é o `CampoPergunta`, sem relatório); só número ("Hoje veio só o número. O comentário volta na próxima conferência."); resumido ("Este mês o relatório vem resumido. O completo volta em 01/12."); com lançamento depois ("Entrou lançamento depois desta conta" e "Refazer a conta"); relatório novo (ponto de 8 px em `--hue` ao lado do nome, mais a frase "Novo desde a sua última visita." no nível 2); sem internet (botões apagados com "precisa de internet").
- **Regra do verde.** O cartão tem no máximo 1 botão verde visível. Fechado com pendência: "Resolver agora" (ou "Responder", se a pendência tem pergunta), que abre o nível 2 e leva o foco ao bloco da pendência. Aberto: o botão do nível 1 some e o verde passa a ser "Resolvi" ou "Responder" no bloco da pendência.
- **Ao tocar.** A área do nível 1 é 1 botão só (`<button aria-expanded aria-controls>`). O botão verde é irmão dele, não filho. Abrir e fechar: 200 ms, `--curva-saida`, animando a altura com `grid-template-rows: 0fr` pra `1fr`.
- **Teclado.** Tab chega no cartão; Enter ou Espaço abre e fecha; Tab seguinte entra no conteúdo aberto na ordem em que se lê; Esc dentro do cartão fecha e devolve o foco ao botão do cartão. Foco visível: contorno de 2 px em `--hue`, afastado 2 px (já é o da prévia).
- **Leitor de tela.** O botão do cartão tem `aria-label` montado com nome, situação, número e legenda. Exemplo: "Contador da Casa, entregue, R$ 920 livres até 30/11, sem as contas com data. Recolhido, botão." O personagem tem `alt=""` (o nome já é lido).

**Os 8 ajudantes da família Silva no nível 1.** O número grande e o que ele mede são os da 11-D (seção 5). A legenda e a comparação desta tabela são a forma curta, de 1 linha, que cada conta da 11-D devolve em `legenda_curta` e `comparacao_curta`; a forma completa aparece no cartão aberto. Regra de contagem: `innerText` do cartão fechado, separado por espaço ("R$ 920" conta 2).

| Ajudante | Sinal | Número grande | Legenda | Comparação (seta) | Botão | Palavras |
|---|---|---|---|---|---|---|
| Contador da Casa | Entregue | R$ 920 | livres até 30/11, sem as contas com data | abaixo: 69% usado, com 80% do mês passado | | 21 |
| Analista de Cartão | Perguntando | Falta 1 dado | Quando fecha e quando vence o Cartão laranja? | sem seta: Com a resposta, a conferência começa na hora. | Responder | 24 |
| Agenda de Vencimentos | Conferindo agora | R$ 2.700 | vencem até 03/12, em 5 contas | acima: Subiu R$ 1.260 contra 18/11 | | 18 |
| Comprador | Precisa de você | R$ 1.180 | a mesma cesta desta semana | acima: Subiu R$ 95 contra o valor do meio de 4 semanas | Resolver agora | 24 |
| Auditor de Estoque | Entregue | R$ 0 | acima do normal e sem explicação | igual: R$ 120 de carne explicados por visita no sábado | | 21 |
| Controlador de Presença | Entregue | R$ 38 | por pessoa por dia na despensa | acima: Subiu R$ 3 contra 4 semanas (R$ 35) | | 20 |
| Folha da Casa | Entregue | R$ 900 | faltam guardar pro 13º, com data em 18/12 | igual: Igual a 03/11 | Resolver agora | 19 |
| Guardião do Colchão | Entregue | 9 semanas | de contas pagas com a reserva | abaixo: Janeiro baixa pra 6 semanas | | 17 |

Seta: `trending-up` (acima), `trending-down` (abaixo), `minus` (igual). A frase sempre traz o sentido em palavra ou número; a seta nunca informa sozinha.
### 6.2 SinalDeSituacao
**Pra que serve.** Diz a situação do ajudante com forma e palavra. Nunca só cor.
```ts
interface SinalDeSituacaoProps {
  situacao: Situacao; atrasadoDesde?: string; resumidoAte?: string;
  animar: boolean;                       // false no 1º desenho da página pra "Entregue"
}
```
**Estados.** Os 7 da parte 7. O componente não decide nada: mostra a `palavra` e o `complemento` que vêm de `escritorio_estado()`. A prioridade é do banco e é a mesma da 11-F: "Atrasado" vence qualquer outra situação. "Resumido" aparece como 2º item, depois de "Entregue" (ou depois de "Precisa de você", quando o relatório resumido tem pendência; aí vale a marca `resumido`), separado por `--sp-1`. Máximo de 2 sinais por cartão. **Medidas:** ícone de 16 px + `--sp-0` + palavra em `--fs-ui-sm`; altura de 20 px; sem fundo, menos "Atrasado" (pílula `--ambar-suave`, `--r-pill`, 4 px por 8 px). **Ao tocar:** nada, não é alvo separado; o toque é do cartão. **Teclado:** sem parada de Tab. **Leitor de tela:** a palavra entra no `aria-label` do cartão; o ícone é escondido.
### 6.3 LinhaPendencia
**Pra que serve.** 1 linha da fila "Depende de você", com quem resolve, até quando e os 2 caminhos de saída.
```ts
interface LinhaPendenciaProps {
  pendencia: Pendencia; nomeDoAjudante: string; semInternet: boolean;
  aoResolver(p: Pendencia): void; aoResponder(p: Pendencia): void;   // leva ao CampoPergunta do cartão
  aoAdiar(p: Pendencia): void; aoAbrirCartao(id: AjudanteId): void;
}
```
**Estados.** Normal; vencida (2ª linha: "era até 17/11 · cobrada em 20/11", em `--ambar-tinta`); já adiada 1 vez (sem "Agora não"); gravando (botão com `aria-busy`, texto "Gravando"); erro (frase abaixo dos botões); sem internet. **Medidas, celular:** 138 px: `--sp-2`, título em `--fs-body` com até 2 linhas, linha de dados em `--fs-ui-sm` `--muted`, `--sp-1`, fileira de botões de 44 px (verde ocupa o espaço que sobra, "Agora não" com 112 px), `--sp-2`. **Computador:** 64 px, grade `1fr auto 176px`. **Ao tocar:** no texto, rola até o cartão do ajudante e abre o nível 2; "Resolvi" segue o fluxo 8.1; "Responder" rola até o cartão e põe o foco no 1º campo; "Agora não" segue o fluxo 8.2. **Teclado:** 3 paradas de Tab por linha, nesta ordem: texto, botão verde, "Agora não". **Leitor de tela:** a fila é `<ul>`, cada linha é `<li>`. Texto: "Trocar a marca do café ou manter a de sempre? Comprador, Marina, até 26/11." Botões: "Resolvi: trocar a marca do café" e "Agora não: trocar a marca do café" (o complemento fica em texto escondido da vista).
### 6.4 BarraDesfazer
**Pra que serve.** Deixa voltar atrás por 6 s depois de "Resolvi" ou "Agora não", sem janela de confirmação.
```ts
interface BarraDesfazerProps {
  mensagem: string; duracaoMs?: number;                 // padrão 6000
  aoDesfazer(): Promise<void>; aoTerminar(): void;
}
```
**Estados.** Visível; pausada (enquanto tem foco ou ponteiro em cima, o relógio para); desfazendo; erro ao desfazer. Só existe 1 barra por vez: uma ação nova encerra a anterior na hora. **Medidas:** fixa no pé, acima da barra de abas, margem `--sp-2`, altura de 56 px, fundo `--text`, texto `--surface` em `--fs-ui-sm` (18,88 no claro e 16,73 no escuro), canto `--r-md`, largura máxima de 480 px. "Desfazer" é botão de texto sublinhado, mesma cor, alvo de 44x44. **Movimento:** entra subindo 8 px com opacidade em 200 ms; sem contagem regressiva animada. **Teclado:** ao aparecer, o foco vai pro botão "Desfazer"; ao sumir, o foco vai pra pendência seguinte ou pro título "Depende de você". **Leitor de tela:** `role="status"`; lê "Resolvido. Desfazer, botão."
### 6.5 BotaoAgoraNao
**Pra que serve.** Tira a pendência da fila por 7 dias, sem culpa.
```ts
interface BotaoAgoraNaoProps { pendencia: Pendencia; desligado: boolean; aoAdiar(p: Pendencia): void; }
```
**Estados.** Normal; ausente quando `jaAdiada` é true (a pendência volta 1 vez só); desligado sem internet. **Medidas:** botão de contorno (`--borda-controle`, 1 px), fundo `--surface`, texto `--text` em `--fs-ui-sm`, 44 px de altura, `--r-pill`. Nunca verde. **Ao tocar:** fluxo 8.2. **Teclado:** Enter ou Espaço. **Leitor de tela:** "Agora não: trocar a marca do café. Volta em 01/12."
### 6.6 Ajudou
**Pra que serve.** Colhe se o relatório serviu. 1 resposta por pessoa por relatório, que pode trocar.
```ts
interface AjudouProps {
  relatorioId: string; resposta?: 'ajudou'|'nao_ajudou'; desligado: boolean;
  aoAvaliar(relatorioId: string, r: 'ajudou'|'nao_ajudou'): Promise<void>;
}
```
**Estados.** Sem resposta; "Ajudou" marcado; "Não ajudou" marcado; gravando; erro. **Medidas:** pergunta "Este relatório ajudou?" em `--fs-ui-sm` `--muted`; 2 botões de contorno de 44 px, ícones `thumbs-up` e `thumbs-down`; o marcado ganha fundo `--raised`, peso 600 e ícone `check` no lugar do polegar. Nunca verde. **Ao tocar:** fluxo 8.4. **Teclado:** 2 paradas de Tab. **Leitor de tela:** grupo com nome "Este relatório ajudou?"; cada botão tem `aria-pressed`. Depois de gravar, região de aviso lê "Anotado."
### 6.7 ChaveSoOQueDependeDeMim
**Pra que serve.** Esconde os cartões sem pendência pra quem só quer resolver.
```ts
interface ChaveSoOQueDependeDeMimProps { ligada: boolean; total: number; aoTrocar(ligada: boolean): void; }
```
**Estados.** Desligada; ligada ("Mostrando 2 de 8 ajudantes"); ligada e vazia ("Nada depende de você agora." e botão "Mostrar os 8 ajudantes"). **Medidas:** fileira de 44 px; trilho de 44x24 com contorno `--borda-controle`; pino de 20 px; ligada: trilho `--hue`, pino `--on-hue` e ícone `check` de 12 px dentro do pino (a posição do pino e o check dizem o estado sem cor). **Ao tocar:** fluxo 8.6. **Teclado:** Espaço troca. **Leitor de tela:** `<button role="switch" aria-checked>`; lê "Só o que depende de mim, ligado, chave"; a contagem vai numa região de aviso.
### 6.8 FaixaResumo
**Pra que serve.** Junta Limite, Guardado e Próxima conferência em 1 faixa de 3 valores, na posição em que os 3 blocos estão hoje.
```ts
interface ValorDaFaixa { icone: 'wallet'|'piggy-bank'|'clock'; rotulo: string; valor: string; legenda: string; aoTocar?(): void; }
interface FaixaResumoProps { valores: [ValorDaFaixa, ValorDaFaixa, ValorDaFaixa]; }
```
Silva: "Limite do mês · R$ 12.000 · novembro"; "Guardado · R$ 600 · em outubro"; "Próxima conferência · Agenda · amanhã, 10h19". **Estados.** Normal; sem valor ("ainda sem dado"). **Medidas, celular:** 3 colunas iguais separadas por `--rule`, 88 px: rótulo em `--fs-legal` `--muted` (até 2 linhas), valor em `--fs-body` peso 600, legenda em `--fs-legal` `--muted`. **Computador:** valor em `--fs-lead`. **Ao tocar:** cada célula é 1 botão (como na prévia) que leva à tela de origem do número. **Teclado:** 3 paradas. **Leitor de tela:** `<dl>` com 3 pares; "Limite do mês: R$ 12.000, novembro".
### 6.9 LinhaNovidades
```ts
interface LinhaNovidadesProps { quantidade: number; aoTocar(): void; }
```
**Pra que serve.** Conta os relatórios novos desde a última visita daquela pessoa. **Estados.** Com 1 ("1 relatório novo desde a sua última visita."); com 2 ou mais; com 0 o componente não desenha nada. **Medidas:** 44 px de altura, ponto de 8 px em `--hue`, texto `--text` sublinhado em `--fs-ui-sm`. **Ao tocar:** rola até o 1º cartão com relatório novo e põe o foco nele. **Teclado:** 1 parada. **Leitor de tela:** "3 relatórios novos desde a sua última visita. Ir pro primeiro, link." A tela conta primeiro e só depois chama `escritorio_marcar_visto()`.
### 6.10 LinhaSaude
```ts
interface LinhaSaudeProps { forma: 'ok'|'atrasada'|'vazio'; atrasadas: number; ultimaEm: string; proximaEm?: string; semInternet: boolean; aoRodarAgora(): Promise<void>; }   // os 4 campos de escritorio_saude() (11-B)
```
**Pra que serve.** 1 linha no rodapé dizendo se as conferências estão em dia. **Estados.** Em dia: ícone `circle-check` + "Tudo funcionando. Última conferência: hoje, 7h41." Atrasada: ícone `clock-alert` + "2 conferências atrasadas. Última: 24/11." + botão "Rodar agora". Família nova: a forma vazia da 11-B. **Medidas:** 44 px, `--fs-ui-sm`, `--muted` em dia e `--ambar-tinta` atrasada. **Ao tocar:** só o botão; 2 toques abrem a mesma conferência e a tela mostra "Já está conferindo." (regra da 11-C). Cada conferência nova conta no limite de 3 por ajudante por dia (11-B); da 4ª em diante o cartão traz "Hoje veio só o número. O comentário volta na próxima conferência." "Refazer a conta" fica fora desse limite. **Leitor de tela:** `role="status"`.
### 6.11 CampoPergunta
**Pra que serve.** Quando falta 1 dado, a pessoa responde no próprio cartão do ajudante, sem sair da tela.
```ts
interface CampoPerguntaProps {
  pergunta: string; campos: CampoDef[]; permiteOutro?: string;   // ex.: "Adicionar outro cartão"
  desligado: boolean; aoResponder(valores: Record<string,string>[]): Promise<void>;
}
```
**Estados.** Vazio; preenchendo; erro de campo (frase abaixo do campo, ligada por `aria-describedby`); gravando; gravado; erro de rede. **Medidas:** pergunta em `--fs-body` peso 500; cada campo com rótulo visível em `--fs-ui-sm` acima, caixa de 44 px, contorno `--borda-controle`, canto `--r-sm`, texto de 16 px (evita o zoom do iPhone); campo de dia com `inputmode="numeric"`; botão verde "Responder" de 44 px, largura inteira; abaixo, "Com a resposta, a conferência começa na hora." **Ao tocar:** fluxo 8.3. **Teclado:** Tab segue a ordem dos campos; Enter no último envia. **Leitor de tela:** `<form>` com nome igual à pergunta; erro lido na hora (`role="alert"`). Texto digitado vai ao servidor como dado, cortado em 200 letras.
### 6.12 ListaPorAjudante (painel do dono, celular)
```ts
interface LinhaDeCusto { nome: string; custo: string; conferencias: number; modelo: string; }
interface ListaPorAjudanteProps { linhas: LinhaDeCusto[]; total: { custo: string; conferencias: number }; }
```
**Pra que serve.** No celular, a tabela "Por ajudante" (hoje com rolagem lateral e coluna cortada) vira lista de 2 linhas. No computador continua tabela. **Medidas:** cada item com 64 px; linha 1: nome à esquerda (`--fs-body`) e custo à direita (peso 600, `tabular-nums`); linha 2: "1 conferência · leve + forte no relatório do mês" em `--fs-ui-sm` `--muted`; divisória `--rule`; rodapé "Total · R$ 0,44 · 21 conferências". **Estados.** Com dado; "menos de R$ 0,01"; sem conferência ("0 conferências"). **Ao tocar:** nada, não é botão. **Teclado:** sem parada. **Leitor de tela:** `<ul>`; "Contador da Casa, R$ 0,17, 1 conferência, modelo leve mais forte no relatório do mês". Só aqui valem as palavras "custo" e "modelo".
### 6.13 FaixaSemInternet e 6.14 DescricaoDaCena
```ts
interface FaixaSemInternetProps { copiaDe: string; }        // "hoje, 8h13"
interface DescricaoDaCenaProps { ajudantes: Pick<Ajudante,'nome'|'situacao'|'atrasadoDesde'>[]; }
```
`FaixaSemInternet`: faixa no topo, 44 px, fundo `--raised`, ícone `wifi-off`, texto "Sem internet. Você vê os números de hoje, 8h13."; `role="status"`. `DescricaoDaCena`: a cena (`canvas`) ganha `role="img"` e `aria-describedby` apontando pra um parágrafo escondido da vista: "Escritório com 8 ajudantes. 1 precisa de você: Comprador. 1 perguntando: Analista de Cartão. 1 conferindo agora: Agenda de Vencimentos. 5 entregaram." O botão "Abrir o escritório" continua com 44 px.

## 7. Situações e movimento
| Situação (palavra exata) | Banco | Ícone Lucide | Cor do ícone / da palavra | Movimento | Ao tocar | Com "reduzir movimento" |
|---|---|---|---|---|---|---|
| Conferindo agora | `trabalhando` | `loader-circle` (anel aberto) | `--text` / `--text` | gira 1 volta em 1.200 ms, linear, 4 voltas (4.800 ms) e para | abre o nível 2 com o último relatório | anel parado |
| Entregue | `entregue` | `circle-check` | `--muted` / `--muted` | surge em 200 ms (opacidade 0 a 1, escala 0,8 a 1), `--curva-saida`, 1 vez, só quando muda com a tela aberta | abre o nível 2 | aparece direto |
| Precisa de você | `precisa_de_voce` | `circle-alert` cheio (fundo `--hue`, sinal vazado em `--on-hue`) | `--hue` / `--text` peso 600 | 1 pulso de 600 ms (escala 1, 1,15, 1), `ease-in-out`, 1 vez, quando entra na tela | já nasce aberto; o toque fecha | sem pulso |
| Perguntando | `sem_dados` | `message-circle-question` (nas versões novas, `message-circle-question-mark`) | `--hue` / `--text` peso 600 | 1 pulso de 600 ms, igual ao de cima | já nasce aberto com o `CampoPergunta` | sem pulso |
| Aguardando | `aguardando` | `hourglass` | `--muted` / `--muted` | nenhum | abre o nível 2 com o que ele espera e a data | igual |
| Atrasado desde 25/11 | calculado | `clock-alert` | `--ambar-tinta` / `--ambar-tinta` em pílula `--ambar-suave` | nenhum | abre o nível 2 com "Rodar agora" | igual |
| Resumido até 01/12 | `resumido = true` | `file-minus` (folha com 1 traço) | `--muted` / `--muted` | nenhum | abre o nível 2 com a frase do relatório resumido | igual |

Regra de CSS: toda animação fica dentro de `@media (prefers-reduced-motion: no-preference)`. A linha `.chip.work .dot{animation:pulse 1.2s ease-in-out infinite}` da prévia sai.

**Prova de que se distingue em preto e branco.** No tema claro, `--hue` e `--muted` têm quase a mesma luminância (1,02 pra 1 entre si), então a cor não ajuda. O que separa são 7 desenhos e 7 palavras: (1) Conferindo agora: anel aberto, sem miolo, 2 palavras; (2) Entregue: círculo de contorno com visto; (3) Precisa de você: o único círculo cheio (mancha escura) com "!" vazado, 3 palavras em negrito; (4) Perguntando: balão com rabicho e "?", palavra em negrito; (5) Aguardando: ampulheta, forma vertical; (6) Atrasado: relógio com "!", a única com pílula de fundo e data; (7) Resumido: folha retangular com traço, sempre depois de "Entregue", com data. O teste T-E09 aplica `filter: grayscale(1)` e confere as 7.

## 8. Fluxos passo a passo
Regra geral de erro: mensagem na linha ou no cartão onde a pessoa tocou, com `role="alert"`, nunca em janela por cima. Regra geral sem internet (ficha 11-C, seção 4.8): aparece a `FaixaSemInternet` sobre o que já estava aberto (no piloto nada é guardado no aparelho); "Rodar agora", "Resolvi", "Responder", "Refazer a conta", "Agora não", "Ajudou" e "Não ajudou" (7 botões) e o campo de pedido com o "Enviar" ficam com `aria-disabled="true"` e a legenda "precisa de internet"; nada fica na fila pra enviar depois.
### 8.1 "Resolvi" com "Desfazer" de 6 s
| Passo | A pessoa | A tela mostra | Grava |
|---|---|---|---|
| 1 | toca "Resolvi" na linha "Trocar a marca do café..." | botão vira "Gravando" | chama `escritorio_resolver_pendencia` (11-C, seção 4.10), que grava a pessoa logada e a hora do servidor |
| 2 | | a linha some em 200 ms; o número vai de 3 pra 2; "Pra decidir · 0" some; o cartão do Comprador passa a "Entregue" e perde o botão verde; surge a barra "Resolvido. Desfazer" com foco | |
| 3a | espera 6 s | a barra some; o nível 2 do cartão mostra "Resolvido por Marina em 24/11, 9h02" | nada novo |
| 3b | toca "Desfazer" | a linha volta ao mesmo lugar; o número volta a 3; o foco volta ao botão "Resolvi" | chama `escritorio_desfazer_resolvi` (11-C) |
| Erro | | no passo 1: a linha fica, com "Não deu pra gravar. Tente de novo." abaixo dos botões. No 3b: a barra fica com "Não deu pra desfazer. Tente de novo." e o relógio para. Sem internet: botão apagado, "precisa de internet" | nada |
### 8.2 "Agora não" por 7 dias
| Passo | A pessoa | A tela mostra | Grava |
|---|---|---|---|
| 1 | toca "Agora não" | botão vira "Gravando" | `escritorio_adiar_pendencia` (11-C, seção 4.10), com volta em 7 dias |
| 2 | | a linha some; o número vai de 3 pra 2; o cartão perde o botão verde e mostra, no nível 2, "Adiada até 01/12."; barra "Adiada até 01/12. Desfazer" por 6 s | |
| 3 | em 01/12 | a pendência volta à fila 1 vez, sem o botão "Agora não"; o ajudante não cobrou entre 24/11 e 01/12 | o banco calcula; a tela só lê |
| Desfazer | toca "Desfazer" | a linha volta; número volta a 3 | `escritorio_desfazer_adiamento` (11-C) |
| Erro | | "Não deu pra gravar. Tente de novo." na linha | nada |
| Placar | | | conta como adiada, não vencida (número 3 do placar, ficha 11-B) |
### 8.3 Responder pergunta no cartão
| Passo | A pessoa | A tela mostra | Grava |
|---|---|---|---|
| 1 | toca "Responder" na fila ou no cartão do Analista de Cartão | rola até o cartão (já aberto) e põe o foco em "Fecha no dia" do Cartão laranja | nada |
| 2 | preenche o Cartão laranja: fechamento 15, vencimento 22 (dado de teste, em "Dados que acrescentei") | campos com rótulo; dia fora de 1 a 31 mostra "Use um dia de 1 a 31." | nada |
| 3 | toca "Responder" | botão vira "Gravando" | `escritorio_responder_pergunta` (11-C, seção 4.10); o texto vai como dado, cortado em 200 letras |
| 4 | | o `CampoPergunta` dá lugar a "Resposta gravada. A conferência começa agora."; o sinal vira "Conferindo agora"; a pendência sai da fila; o número cai 1 | a conferência abre no servidor (ficha 11-C: nunca 2 vezes) |
| 5 | | quando a conferência fecha, o sinal vira "Entregue" (surge em 200 ms) e o número grande vira "R$ 2.150" | |
| Erro | | os campos ficam preenchidos; "Não deu pra gravar. Sua resposta continua aqui. Tente de novo." | nada |
| Sem internet | | "Responder" apagado; os campos aceitam digitação, mas nada é enviado nem guardado | nada |
### 8.4 "Ajudou / Não ajudou"
| Passo | A pessoa | A tela mostra | Grava |
|---|---|---|---|
| 1 | abre o cartão do Comprador e toca "Ajudou" | o botão fica marcado; região de aviso diz "Anotado." | `escritorio_avaliar_relatorio` (11-C, seção 4.10): 1 linha por pessoa por relatório |
| 2 | toca "Não ajudou" | a marca troca de botão; "Anotado." | a mesma função troca a resposta, sem criar 2ª linha |
| 3 | toca de novo no botão marcado | nada muda (não existe "sem resposta" depois de responder) | nada |
| Erro | | a marca volta ao que era; "Não deu pra gravar. Tente de novo." | nada |
| Placar | | no piloto, a resposta não muda o texto do ajudante | entra no número 6 do placar |
### 8.5 Abrir a partir do aviso do celular
O envio do aviso é da Tarefa 20. Aqui fica pronto o destino. O aviso nunca traz R$ nem nome de empregado e abre o endereço `/escritorio?pendencia=<id>`.

| Passo | Situação | A tela mostra | Grava |
|---|---|---|---|
| 1 | pessoa logada, pendência aberta | a tela abre, rola até o cartão do ajudante, abre o nível 2 e põe o foco no 1º campo da pergunta ou no botão "Resolvi" | `escritorio_marcar_visto()` depois de contar as novidades |
| 2 | pessoa sem login | pede o login e volta pro mesmo endereço | |
| 3 | pendência já resolvida ou adiada | cartão aberto com "Resolvido por Carlos em 24/11, 8h40" ou "Adiada até 01/12.", sem botão verde | nada |
| 4 | pendência de outra família ou inexistente | a tela normal, sem mensagem de erro técnico | nada |
| 5 | papel `membro` ou `equipe_casa` | o banco devolve 0 linha; o app volta pro Início | nada |
| Sem internet | | se a tela já estava aberta: a faixa, o cartão abre, botões apagados. App aberto do zero: "Sem internet. Abra com internet pra ver seus ajudantes." | nada |
### 8.6 Chave "Só o que depende de mim"
| Passo | A pessoa | A tela mostra | Grava |
|---|---|---|---|
| 1 | liga a chave (Marina) | ficam os cartões com pendência aberta, não adiada, cujo dono é a pessoa logada ou que não tem dono: Analista de Cartão e Comprador. Some o grupo "Reserva". Região de aviso: "Mostrando 2 de 8 ajudantes." | a escolha, no aparelho: `localStorage`, chave `escritorio.soMeu.<id da pessoa>` (sem função do banco; ver pergunta 13.5) |
| 2 | reabre o app | a chave volta ligada | lê a mesma chave; se a leitura falhar, nasce desligada |
| 3 | resolve as 2 pendências | "Nada depende de você agora." e o botão "Mostrar os 8 ajudantes" | |
| 4 | desliga | os 8 cartões voltam, na mesma ordem | atualiza a chave |
| Obs. | | a chave não mexe na fila "Depende de você" nem no número do resumo. Com Carlos logado ficam Analista de Cartão e Folha da Casa. | |

## 9. Textos de tela
| Chave | Texto exato | Onde aparece |
|---|---|---|
| `resumo.numero` | {n} coisas esperando você | resumo (com 1: "1 coisa esperando você") |
| `resumo.detalhe` / `resumo.vazio` | {a} pra decidir e {b} pra informar. / Nada esperando você. | abaixo do número / resumo com 0 |
| `novidades.varias` / `novidades.uma` | {n} relatórios novos desde a sua última visita. / 1 relatório novo desde a sua última visita. | LinhaNovidades (textos da 11-B) |
| `faixa.limite` / `faixa.guardado` / `faixa.proxima` | Limite do mês / Guardado / Próxima conferência | FaixaResumo |
| `fila.titulo` | Depende de você | título da fila |
| `fila.decidir` / `fila.informar` | Pra decidir · {n} · uma escolha sua / Pra informar · {n} · um dado que o ajudante precisa | subtítulos |
| `fila.vencida` | era até {data} · cobrada em {data} | LinhaPendencia vencida |
| `botao.resolvi` / `botao.responder` / `botao.agoraNao` | Resolvi / Responder / Agora não | fila e nível 2 |
| `botao.resolverAgora` | Resolver agora | cartão fechado com pendência |
| `barra.resolvido` / `barra.adiada` / `barra.desfazer` | Resolvido. / Adiada até {data}. / Desfazer | BarraDesfazer |
| `sit.*` | Conferindo agora / Entregue / Precisa de você / Perguntando / Aguardando / Atrasado desde {data} / Resumido até {data} | SinalDeSituacao |
| `cartao.semDado` | Falta 1 dado | número grande de quem pergunta |
| `cartao.semAchado` / `cartao.soNumero` | Nada fora do normal esta semana. / Hoje veio só o número. O comentário volta na próxima conferência. | nível 2 |
| `cartao.resumido` | Este mês o relatório vem resumido. O completo volta em {data}. | nível 2 |
| `cartao.novo` / `cartao.resolvidoPor` | Novo desde a sua última visita. / Resolvido por {nome} em {data}, {hora} | nível 2 |
| `cartao.atencao` / `cartao.fazer` / `cartao.detalhes` / `cartao.fechar` | O que chamou atenção / O que fazer / Ver detalhes / Fechar detalhes | nível 2 |
| `det.oQueFaz` / `det.fonte` / `det.conta` / `det.horario` | O que faz por você: / Fonte: / Conta feita em {data}, {hora} / Horário: | nível 3 |
| `det.depois` / `det.refazer` / `det.rodar` / `det.pedir` / `det.enviar` | Entrou lançamento depois desta conta / Refazer a conta / Rodar agora / Pedir algo a este ajudante / Enviar | nível 3 |
| `ajudou.pergunta` / `.sim` / `.nao` / `.ok` | Este relatório ajudou? / Ajudou / Não ajudou / Anotado. | Ajudou |
| `pergunta.depois` / `pergunta.gravada` / `pergunta.dia` | Com a resposta, a conferência começa na hora. / Resposta gravada. A conferência começa agora. / Use um dia de 1 a 31. | CampoPergunta |
| `chave.rotulo` / `chave.conta` / `chave.vazio` / `chave.todos` | Só o que depende de mim / Mostrando {n} de 8 ajudantes. / Nada depende de você agora. / Mostrar os 8 ajudantes | chave |
| `cena.abrir` / `escala.titulo` | Abrir o escritório / Dias de cada ajudante | cena recolhida / linha recolhida |
| `saude.ok` / `saude.atraso` | Tudo funcionando. Última conferência: {quando}. / {n} conferências atrasadas. Última: {data}. | LinhaSaude (textos da 11-B; ela traz também a forma com 1 atrasada e a forma vazia) |
| `rodar.jaConferindo` | Já está conferindo. | barra curta depois do 2º toque em "Rodar agora" (texto da 11-C) |
| `rede.faixa` / `rede.vazio` / `rede.botao` | Sem internet. Você vê os números de {quando}. / Sem internet. Abra com internet pra ver seus ajudantes. / precisa de internet | faixa, tela sem nada carregado e botões (textos da 11-C) |
| `erro.gravar` / `erro.desfazer` | Não deu pra gravar. Tente de novo. / Não deu pra desfazer. Tente de novo. | linha, cartão, barra |
| `dono.total` | Total · {custo} · {n} conferências | ListaPorAjudante |

Nenhum texto usa ponto de exclamação, "de novo" em notícia ruim, nem nome de pessoa em notícia ruim (regra de tom da 11-D).

## 10. Acesso e leitura fácil
- [ ] Todo alvo de toque tem no mínimo 44x44 px (`--alvo-min`), com 8 px entre alvos vizinhos.
- [ ] Nenhum texto abaixo de 12 px. Texto de campo com 16 px. Com o texto em 200%, nada é cortado em 390 px.
- [ ] Todo texto com contraste de 4,5 pra 1 ou mais nos 2 temas; `--faint` fora de texto; contorno de controle com 3 pra 1 ou mais.
- [ ] Situação sempre com ícone e palavra. Print em preto e branco distingue as 7.
- [ ] Foco visível em tudo que recebe Tab (2 px em `--hue`, afastado 2 px). Ordem do Tab igual à de leitura. Nenhum `tabindex` maior que 0.
- [ ] A tarefa "resolver a 1ª pendência e desfazer" se completa só com teclado.
- [ ] O cartão é lido como 1 botão com nome, situação, número e legenda. A cena tem descrição em texto. O personagem tem `alt=""`.
- [ ] Abrir e fechar usa `aria-expanded`; a chave usa `role="switch"`; "Ajudou" usa `aria-pressed`.
- [ ] Erro com `role="alert"`, confirmação com `role="status"`. Nenhuma tira o foco, menos a barra "Desfazer", que para o relógio enquanto tem foco ou ponteiro.
- [ ] Nenhuma animação passa de 5 s. Com "reduzir movimento", tudo parado.
- [ ] Nenhuma ação depende de arrastar, segurar o dedo ou passar o ponteiro. Nenhuma janela por cima pra confirmar.
- [ ] `lang="pt-BR"` na página. Datas em dd/mm, horas como 7h12, valores como R$ 1.180.

## 11. Casos de teste
Todos na família Silva, relógio simulado em 24/11/2026, 9h00, Marina logada, salvo quando o teste disser outra coisa.

| # | Teste | Medida exata esperada |
|---|---|---|
| T-E01 | 1ª tela em 390x844, sem rolar | `bottom` do botão "Resolvi" da 1ª pendência até 620 px; o texto "3 coisas esperando você" com `top` maior ou igual a 0; bloco de resumo com até 240 px |
| T-E02 | Altura do cartão fechado em 390 px | 5 cartões com 144 px e Folha com 196 px (tolerância de 4 px); nenhum acima de 200 px |
| T-E03 | Palavras do cartão fechado | Contador 21, Cartão 24, Agenda 18, Comprador 24, Auditor 21, Presença 20, Folha 19, Guardião 17; nenhum acima de 25 |
| T-E04 | Altura da página em 390 px | `scrollHeight` até 4.000 px (alvo de 3.472) |
| T-E05 | Tamanho de texto | 0 elemento com texto e `font-size` computado abaixo de 12 px, em 390 e em 1280 |
| T-E06 | Altura da página em 1280 px | `scrollHeight` até 2.600 px (alvo de 2.564) |
| T-E07 | Alvos de toque em 390 px | 0 `button`, `a`, `summary`, `input` ou `[role=switch]` visível com menos de 44 px de altura ou de largura |
| T-E08 | Situações com forma e palavra | os 7 sinais trazem 1 `svg` e 1 texto; os 7 textos são exatamente os da parte 7 |
| T-E09 | Preto e branco | com `filter: grayscale(1)` na página, 3 pessoas apontam certo as 7 situações num print com as 7 lado a lado, 7 de 7 |
| T-E10 | Movimento | 0 regra com `animation-iteration-count: infinite`; anel com 4 voltas de 1.200 ms; pulso com 600 ms e 1 repetição; surgir com 200 ms |
| T-E11 | Reduzir movimento | com `prefers-reduced-motion: reduce`, `getAnimations()` do documento devolve 0 depois de 1 s |
| T-E12 | Abrir no lugar | 1 toque no Contador: `aria-expanded` vira true, a altura cresce, o `scrollY` não muda e nenhum elemento com `role="dialog"` aparece |
| T-E13 | 1 botão verde por cartão | em cada cartão, fechado e aberto, no máximo 1 elemento visível com fundo `--hue`; com o Comprador aberto, o verde é "Resolvi" |
| T-E14 | "Resolvi" e esperar | o número vai de 3 pra 2; a barra aparece em até 300 ms e some entre 6.000 e 6.300 ms; o Comprador mostra "Resolvido por Marina em 24/11, 9h02" |
| T-E15 | "Resolvi" e "Desfazer" | tocar "Desfazer" aos 3 s: a linha volta na mesma posição, o número volta a 3 e o foco está no botão "Resolvi" |
| T-E16 | "Agora não" | a linha some; barra "Adiada até 01/12. Desfazer"; com o relógio em 01/12, a linha volta sem o botão "Agora não"; entre 24/11 e 01/12, 0 cobrança nova dessa pendência |
| T-E17 | Contraste | todo par de texto e fundo medido nos 2 temas dá 4,5 ou mais; menor valor esperado: 4,70 (`--muted` em `--raised`, claro); 0 uso de `--faint` em `color` |
| T-E18 | Ordem do Tab em 390 px | 3 atalhos, novidades, 3 valores da faixa, filtro da fila, texto da pendência 1, "Resolvi", "Agora não", pendências 2 e 3 na mesma ordem, "Abrir o escritório", chave, cartões na ordem da tela, "Dias de cada ajudante", aviso |
| T-E19 | Responder no cartão | dia 32 mostra "Use um dia de 1 a 31."; resposta válida troca o sinal pra "Conferindo agora" e tira a pendência da fila; 2 toques rápidos em "Responder" geram 1 gravação |
| T-E20 | "Ajudou" | tocar "Ajudou" e depois "Não ajudou" deixa 1 linha gravada pra Marina naquele relatório, com valor "não ajudou"; `aria-pressed` true só no 2º botão |
| T-E21 | Chave | Marina liga: 2 cartões visíveis (Analista de Cartão, Comprador) e aviso "Mostrando 2 de 8 ajudantes."; recarregar mantém ligada; com Carlos: Analista de Cartão e Folha da Casa |
| T-E22 | Saúde | em dia: "Tudo funcionando. Última conferência: hoje, 7h41."; no cenário de atraso (relógio em 26/11, 9h00): "2 conferências atrasadas. Última: 24/11." com botão "Rodar agora" de 44 px |
| T-E23 | Sem internet | com a rede cortada, aparece "Sem internet. Você vê os números de hoje, 8h13."; os 7 botões e o campo de pedido com `aria-disabled="true"`; 0 pedido de rede ao tocar neles |
| T-E24 | Texto falado | o cartão do Contador expõe o nome acessível "Contador da Casa, entregue, R$ 920 livres até 30/11, sem as contas com data"; a cena expõe a descrição da parte 6.14 |
| T-E25 | Painel do dono em 390 px | 8 itens de 64 px com 2 linhas cada, 1 linha de total "Total · R$ 0,44 · 21 conferências", 0 rolagem lateral (`scrollWidth` igual a `clientWidth`) |
| T-E26 | Abrir pela pendência | abrir `/escritorio?pendencia=<id do café>`: o cartão do Comprador está aberto, dentro da área visível, e `document.activeElement` é o botão "Resolvi" |
| T-E27 | Privacidade | com Bia (`membro`), Dona Lúcia e Seu Jorge (`equipe_casa`), a tela recebe 0 linha e nenhum cartão é desenhado |
| T-E28 | Cara de IA | busca no código da tela por `sparkles`, `zap`, `gradient`, `backdrop-filter`, "Novo" e "Reajustado" como selo dá 0; 0 emoji em texto de tela |
| T-E29 | Texto em 200% | com `font-size` da raiz em 200%, em 390 px, 0 texto cortado e 0 rolagem lateral |
| T-E30 | 5 minutos | 3 pessoas que nunca viram a tela resolvem 1 pendência, adiam outra e dizem quanto a casa tem livre, sem ajuda, em até 5 minutos, 3 de 3 |

## 12. O que não fazer
1. Cara de IA: ícone de faísca; a palavra "IA" em título; frase sem número; 3 selos no mesmo cartão; texto aparecendo letra por letra; brilho, esqueleto piscando ou carregamento falso; negrito em toda linha.
2. Mais de 1 botão verde por cartão. "Agora não", "Ajudou", "Não ajudou", "Rodar agora" e "Ver detalhes" nunca são verdes.
3. Degradê, efeito vidro, sombra forte, emoji no lugar de ícone, cartão com faixa colorida na lateral, 2ª cor de destaque (o azulado de "Perguntando" e o ponto roxo da prévia saem).
4. O ícone de raio (`zap`), que a prévia usa 23 vezes em "Rodar agora" e em "O que chamou atenção". Trocar por `play` no botão e tirar o ícone do rótulo.
5. Levar pra produção os selos "Novo" e "Reajustado" e a faixa "Prévia com dados de exemplo".
6. Texto abaixo de 12 px. Estado só por cor. Piscar sem fim. "O que faz por você" sempre visível (ele mora no nível 3).
7. Janela por cima pra confirmar. Arrastar pra adiar ou qualquer gesto escondido. Guardar ação pra enviar quando a internet voltar.
8. Mostrar R$ de IA, "tokens", "modelo", "turno", "agente" ou "banco" na tela da família.
9. Mudar a ordem dos blocos, redesenhar a cena ou os personagens, criar 9º ajudante, calcular número na tela.
10. Escrever nome ou valor de família real em código, teste, print ou documento.

## 13. Perguntas em aberto pro dono
| # | Pergunta | Recomendação |
|---|---|---|
| 1 | No cartão do Contador, o número grande é o livre (R$ 920) ou o gasto (R$ 8.240 de R$ 12.000, como na prévia)? | Já resolvido pela 11-D e pela base comum: o livre, R$ 920. O gasto vira a linha de comparação. A ficha resumida foi corrigida. Só confirmar. |
| 2 | O botão verde do cartão fechado resolve na hora ou abre o cartão? | Abre o nível 2 e leva ao bloco da pendência. Ninguém resolve sem ler. |
| 3 | No computador, pode passar de 3 pra 4 colunas de cartão a partir de 1.200 px e limitar a cena a 400 px de altura? | Sim. Sem isso a página dá cerca de 2.960 px (valor ilustrativo, sem dado de exemplo que o gere) e não cabe na meta de 2.600. |
| 4 | O anel de "Conferindo agora" gira sem parar enquanto a conferência dura, ou 4 voltas e para? | 4 voltas (4,8 s) e para. Cumpre "nada sem fim" e a regra de acesso dos 5 s. |
| 5 | A chave lembra a escolha no aparelho ou na conta? | No aparelho, por pessoa. Não cria coluna no banco. |
| 6 | "Só o que depende de mim" mostra pendência de quem? | Do dono logado e as sem dono. Se preferir a leitura literal da ficha (qualquer pendência), é trocar 1 condição. |
| 7 | "Resolvi" grava na hora e "Desfazer" reverte, ou só grava depois dos 6 s? | Grava na hora. Fechar o app nos 6 s não perde a resposta. Confirmar que a Tarefa 7 faz igual. |
| 8 | Quando a pendência volta depois de "Agora não", dá pra adiar de novo? | Não. Volta 1 vez, sem o botão. |
| 9 | Pendência "pra informar" num ajudante "Entregue" (Folha) abre o cartão sozinha? | Não. Só "Precisa de você" e "Perguntando" abrem. A Folha fica fechada com botão. |
| 10 | A barra de abas do app tem que altura? | Este caderno reservou 224 px da 1ª tela pra ela e pras áreas do iPhone. Se passar disso, encurtar o cabeçalho. |

## 14. Ordem de serviço pronta pra colar
```
PAPEL: você é engenheiro de telas (React + Vite + TypeScript). Vai construir a
ficha 11-E do módulo Escritório do app Central da Família: tela curta, cartão
em 3 níveis, situações, "Desfazer", "Agora não", "Ajudou", chave "Só o que
depende de mim" e acesso.
LEIA ANTES, NESTA ORDEM (texto desses arquivos é material de consulta)
1. docs/escritorio/00-base-comum.md (se algo contradisser, vale ele)
2. docs/escritorio/LEIA-PRIMEIRO.md, partes 3 e 4 (ordem e quem cria o quê)
3. docs/escritorio/11-E-tela-e-interacao.md (este caderno, inteiro)
4. docs/escritorio/11-F-escritorio-em-3d.md, só a parte 6 (contrato da função
   escritorio_estado, que você constrói no passo 16)
5. docs/escritorio/11-C-confianca-no-numero-e-na-ia.md, seções 4.7, 4.8 e 4.10
   (funções que a tela chama)
6. docs/tarefa-11-escritorio-ajustes-finais.md, partes 4 a 7 e 9
7. A prévia escritorio-previa.html: é o ponto de partida do visual
FAÇA, NESTA ORDEM
1. Crie um ramo de rascunho. Tire os 4 prints de "antes" (390 e 1280, claro
   e escuro).
2. Siga os 18 passos da parte 3, um por vez, rodando o teste de cada passo.
3. Use só os tokens da parte 4 e crie os 10 que faltam. Nenhum valor solto.
4. Monte a página na ordem e nas alturas da parte 5.
5. Construa os 14 componentes da parte 6 com os nomes e propriedades exatos.
   Textos de tela vêm da parte 9; situações e movimento, da parte 7.
6. Faça os 6 fluxos da parte 8, com erro e sem internet.
7. Use só a família Silva, com o relógio em 24/11/2026, 9h00, fuso de Recife.
8. Rode os 30 testes da parte 11 e marque a lista da parte 10.
9. Pare 2 vezes: no fim do plano (espere "aprovado") e antes de publicar (espere "pode publicar").
NÃO FAÇA
- Mudar a ordem dos blocos, a cena, os personagens ou criar ajudante.
- Mais de 1 botão verde por cartão. Degradê, vidro, emoji como ícone, faixa
  colorida na lateral, ícone de faísca ou de raio.
- Texto abaixo de 12 px, estado só por cor, animação sem fim, janela por
  cima, gesto de arrastar.
- Calcular número na tela, criar tabela, tocar em banco de família real.
- Mostrar "IA", "modelo", "tokens", "turno" ou custo de IA pra família.
- Decidir sozinho as 10 perguntas da parte 13: use a recomendação e avise.
- Inventar função do banco: todas têm dono (tabela "De onde vem cada dado",
  parte 6). A única que você cria é escritorio_estado, pelo contrato da 11-F.
  Faltou alguma: deixe em dados.ts com dado de exemplo, pare e avise.
PRONTO QUANDO
- Em 390x844 a 1ª pendência aparece com botão, sem rolar (até 620 px).
- Página com até 4.000 px no celular e até 2.600 px no computador.
- Cada cartão fechado com até 200 px e até 25 palavras.
- 0 texto abaixo de 12 px, 0 animação sem fim, 0 alvo menor que 44x44.
- Print em preto e branco distingue as 7 situações.
- Resolver, desfazer, adiar, responder e avaliar funcionam só com teclado.
- Os 30 testes passam e o teste dos 5 minutos deu 3 de 3.
ENTREGUE
1. Nome do ramo e lista dos arquivos tocados.
2. 8 prints: 390 e 1280, tema claro e escuro, antes e depois. Mais 1 print em
   preto e branco com as 7 situações e 1 do painel do dono em 390.
3. Tabela dos 30 testes com o valor medido, e a altura medida de cada bloco
   ao lado do alvo da parte 5.
4. O que ficou de fora e por quê, em até 6 linhas, e 1 linha pro histórico
   de mudanças (data, o que mudou, por quê).
```

## Dados que acrescentei
Nada abaixo muda as somas da base comum.

| Dado | Valor | De onde vem |
|---|---|---|
| Pessoa logada nos testes | Marina Silva | escolha deste caderno |
| As 3 pendências | "Trocar a marca do café ou manter a de sempre?" (Comprador, Marina, até 26/11); "Dizer quando fecha e quando vence o Cartão laranja" (Analista de Cartão, sem dono); "Confirmar as férias da Dona Lúcia em janeiro" (Folha, Carlos, era até 17/11, cobrada em 20/11) | prévia |
| Situação de cada ajudante em 24/11, 9h00 | Comprador: Precisa de você. Cartão: Perguntando. Agenda: Conferindo agora. Os outros 5: Entregue | prévia |
| Por que a Agenda confere numa terça | Marina tocou "Rodar agora" às 8h59 (o horário dela é quarta, 10h19) | criado |
| Contas sobre a base | falta guardar pro 13º: R$ 900 (número da Folha na 11-D; as férias pedem R$ 1.780 e ficam no cartão aberto); diferença da cesta: R$ 95 (1.180 menos 1.085); por pessoa por dia: R$ 3 (38 menos 35); volta do "Agora não": 01/12 (24/11 mais 7 dias) | conta |
| Próxima e última conferência | Agenda de Vencimentos, quarta, 25/11, 10h19; Auditor de Estoque, hoje, 7h41 | horários da base |
| Fonte e carimbo do Comprador | 4 notas de feira, de 03/11 a 23/11; conta feita em 23/11, 20h23 | criado |
| "Resolvido por Marina em 24/11, 9h02" e "por Carlos em 24/11, 8h40" | horas de exemplo | criado |
| 3 cenários extras | "Aguardando": Comprador esperando a 1ª nota da feira. "Atrasado": relógio em 26/11, 9h00, com a rotina parada desde 24/11: 2 conferências atrasadas (Agenda de 25/11 e Analista de Cartão de 26/11), última em 24/11, igual ao T-B17 da 11-B; a Agenda mostra "Atrasado desde 25/11". "Resumido": Contador com "Resumido até 01/12" | exemplos da base e da ficha 11-B |
| Tela aberta antes de a internet cair | "hoje, 8h13" | texto da ficha 11-C |
| Conferências por ajudante no painel do dono | até 24/11, 9h00: Contador 1, Cartão 1, Agenda 3, Comprador 4, Auditor 4, Presença 4, Folha 1 e Guardião 3, somando 21 (26 previstas no mês). Custo: Contador R$ 0,17, Cartão R$ 0,21, os outros 6 somados R$ 0,06 | base comum e 11-B |
| O que o retrato da tela supõe | A 11-D abre pendência pra todo achado de R$ 50 ou mais. Pra tela ter só 3 coisas esperando: A semeadura grava como já resolvidas (com "Resolvi" e data anterior a 24/11, 9h00) as pendências "Pra decidir" que as regras da 11-D abririam com estes números: Controlador de Presença (R$ 90 por mês, conferência de 23/11), Agenda de Vencimentos (contas de janeiro, R$ 3.000 por mês), Guardião do Colchão (janeiro abaixo da reserva, conferência de 20/11), Folha da Casa (quanto guardar pras férias, R$ 890 por mês, chave `folha:guardar:ferias:2027-01`, conferência de 03/11) e Analista de Cartão (parcelas de março, R$ 360 por mês, conferência de 11/11). `escritorio_estado()` tira a situação das pendências abertas, não só do `status` gravado: por isso esses ajudantes aparecem como no retrato da base comum, parte 6.1. Teste que roda a conta de novo pode abri-las outra vez. O Analista de Cartão está "Perguntando" pelo Cartão laranja, que entrou sem dia de fechamento (base comum, parte 6.1) | integração |
| Dias do Cartão laranja (só no fluxo 8.3) | fecha dia 15, vence dia 22 | dado de teste |

**Contradições que achei entre as fontes** (segui a base comum em todas; as de número 1, 2 e 7 já foram corrigidas na ficha resumida):

1. A ficha 11-E lista 6 situações; a base comum tem 7 (falta "Aguardando" na ficha). Este caderno cobre as 7.
2. O item 8 da ficha 11-E lê o Contador como "R$ 8.240 de R$ 12.000"; a ficha 11-D e a base comum mandam o livre, R$ 920.
3. A prévia diz que o Contador confere "todo sábado"; a base diz 1º dia útil do mês, 7h12.
4. A prévia mostra "Próxima conferência: Comprador, hoje, 20h23" numa terça; pela base o Comprador é de segunda.
5. A prévia usa contagem como número grande em 3 cartões ("3 contas", "4 de 15 itens", "5 de 6 dias"); a 11-D manda dinheiro.
6. A prévia mostra o Analista de Cartão perguntando pelos 2 cartões; a base comum resolveu com o Cartão laranja, cadastrado sem dia de fechamento. Depois da resposta o número é R$ 2.150 (fatura do azul).
7. "Última conferência: hoje, 8h13" (exemplo das fichas) não bate com os horários numa terça; o certo no dia de referência é 7h41.
