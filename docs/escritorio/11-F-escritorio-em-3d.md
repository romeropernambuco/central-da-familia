# 11-F · Escritório em 3D · Caderno de construção

> **ADIADO por decisão do dono em 24/11/2026.** O 3D fica pra depois. Nenhuma fase deste caderno começa sem nova ordem do dono. A cena em pixel segue como a única cena. Só a parte 6 (contrato da função `escritorio_estado`) continua valendo agora, porque a tela da ficha 11-E usa essa função.

Leia antes: `docs/escritorio/00-base-comum.md` (vale sobre este caderno) e a parte 8 de `docs/tarefa-11-escritorio-ajustes-finais.md`. Neste caderno, coordenadas e ângulos de código usam ponto decimal (ex.: `-1.4`); texto corrido usa vírgula.

## 1. Objetivo e o que não é (modo opcional; o pixel continua padrão e plano B)

**Objetivo.** Dar à cena do Escritório um 2º jeito de ver: os mesmos 8 ajudantes, nas mesmas mesas, em miniatura 3D de caixinhas. Serve pra 2 coisas: bater o olho e saber quem precisa da casa, e tocar no boneco pra cair no cartão dele.

**O que é.**
1. Um modo, ligado pelo botão "Ver em 3D" dentro da cena. A escolha fica lembrada no aparelho.
2. Uma 2ª pele da mesma informação: cena pixel, cena 3D e cartões leem 1 função de estado só.
3. Três fases, cada uma só começa com a anterior aprovada no iPhone do dono: fase 1 (modo 3D), fase 2 (ao vivo e linha do tempo), fase 3 (lugares úteis).

**O que não é.**
1. Não troca a cena pixel aprovada. O pixel continua o padrão de quem nunca tocou no botão e é o plano B quando o 3D falha.
2. Não muda a ordem dos blocos, o tamanho da caixa da cena nem os cartões. Com o 3D desligado, a tela é idêntica à de hoje.
3. Não tem andar livre com boneco próprio, girar a câmera, física, nem arquivo de modelo 3D baixado. Os bonecos são feitos em código.
4. Não mostra situação só por cor ou só por luz (toda situação é pose + objeto + palavra) nem valor em R$ (valor fica no cartão).

## 2. Antes de começar (o que aproveitar do 3D atual, função por função, com o nome real no código; o que refazer; o que apagar)

Base lida: o arquivo único do Escritório 3D atual (725 KB; three.js r160 embutido com 670 KB; cena com 35 KB em 411 linhas, tudo dentro de `montarCena()`). Não copie nome de pessoa nem valor dele: só a técnica.

**O que achei lendo e rodando o código (muda o plano):**

| Achado | Medida | Consequência |
|---|---|---|
| Tem 9 bonecos em `EQUIPE`, não 11. 2 deles não existem no produto e faltam o Auditor de Estoque e o nome certo da Agenda | contado no código e em `__escritorio.chars()` | elenco refeito do zero com os 8 ids da base comum |
| Desenha todo quadro, mesmo pausado | 11.500 chamadas de desenho em 2 s com `pausa=1` | o laço `quadro()` precisa ser refeito pra desenhar só quando muda |
| Não trata perda do contexto gráfico (a placa de vídeo "derruba" a cena) | simulei a perda: a tela fica vazia e a classe `sem3d` não entra | escrever a guarda da parte 7 |
| 123 chamadas de desenho | acima do teto novo de 100 | boneco com 6 peças móveis em vez de 10 e sombra parada |
| Câmera na diagonal (45 graus de lado) | vizinhos de mesa ficam a 29 px no celular; a etiqueta com palavra mede até 106 px | câmera de frente e de cima, como o pixel (parte 4) |
| Sol muda de lugar todo quadro (`luzDaHora`) e há 4 luzes de abajur | refaz o mapa de sombra todo quadro | luz fixa por tema; abajures saem |
| Só 4 situações (`fila`, `trabalhando`, `entregue`, `precisa`) vindas de `statusDe(e,hora)` por relógio | sem "Perguntando", "Aguardando", "Atrasado", "Resumido" | situações refeitas (parte 5) e lidas do banco (parte 6) |
| Biblioteca embutida inteira no arquivo | 670 KB sempre baixados | vira pedaço separado, baixado só ao ligar o 3D |

**Aproveitar (copiar e adaptar):**

| Nome no código atual | O que faz | Como aproveitar |
|---|---|---|
| `mesclar(lista)`, `GEO`, `BASE`, `VC` | junta muitas caixas numa peça só, com cor por vértice (1 desenho por peça) | igual. É o que segura o teto de chamadas |
| `cx(w,h,d,cor,x,y,z,pai,semSombra)`, `grupo()`, `fecha()`, `FIXO` | fábrica de caixas; o que é parado vai pra `FIXO` | igual |
| `boneco(c)`, `braco()`, `perna()`, `HIP_PE=0.555`, `HIP_SENTADO=0.325` | boneco de caixas com juntas | manter proporções e rosto; reduzir pra 6 peças móveis (parte 4) |
| `pose(ch,alvo,dt)` | leva cada junta ao alvo com suavização (`dt*9`) | igual, com a lista de juntas menor |
| `atualizaChar()` | andar por pontos (`path`), girar pro destino, sentar | manter o andar; trocar as poses pelas 7 da parte 5 |
| `vistaDe()`, `aplicaVista()`, `vAtual/vDe/vPara`, `irPara()` | câmera ortográfica (sem perspectiva) que enquadra uma caixa do mundo e desliza entre vistas | igual; duração cai de 1.200 ms pra 500 ms; `DIR` muda |
| `tela(x,y,z)` e `atualizaTags()` | projeta ponto do mundo na tela e posiciona botão HTML | manter a projeção e a trava nas bordas; etiqueta refeita (parte 4) |
| `temWebGL()` | testa suporte antes de montar | igual |
| `tamanho()` | ajusta o desenho ao tamanho da caixa | igual, chamando `pedirQuadro()` |
| `IntersectionObserver` em `#cena` | sabe se a cena está na tela | manter e passar a cancelar o laço de verdade |
| `window.__escritorio` | gancho de medição (quadros, chamadas, triângulos) | manter como `window.__escritorio3d`, com os itens da parte 7 |
| corte de qualidade em degraus (`degrau`) | baixa a nitidez e desliga a sombra se a fluidez cai | manter 1 degrau e depois cair pro pixel |

**Refazer:** `EQUIPE` e `SALAS` (viram planta e elenco da parte 4); `statusDe`, `ROTULO`, `ICONE` (viram a leitura da parte 6); o laço `quadro()`; o toque (hoje `Raycaster` nos bonecos, que não acha cadeira vazia); `setTema()` (hoje só troca 1 cor); `selecionar()`.  
**Apagar:** relógio simulado (`hora`, `pausado`, `aoVivo`, `setHora`, botões Pausar, +1 hora e Hora real); `luzDaHora`, `lampadas`, `luminaria()`; `retratos` (o cartão já tem o retrato pixel); toda a interface própria do arquivo (`atualizaUI`, `desenhaCard`, fila, cartão, barra de salas): o app já tem a dele; enfeites de sala (cofre, moedas, maquete, cartões gigantes).

## 3. Passos de construção por fase (fase 1, 2 e 3; passos numerados e pequenos; cada um com: o que fazer, onde, pronto quando, como testar)

Pastas sugeridas. Se a Tarefa 6 ou a ficha 11-E deixaram outra estrutura, siga a delas e mantenha os nomes dos arquivos: `src/telas/escritorio/estado.ts`, `src/telas/escritorio/Cena.tsx`, `src/telas/escritorio/cena3d/` (`index.ts`, `planta.ts`, `elenco.ts`, `boneco.ts`, `situacoes.ts`, `camera.ts`, `etiquetas.ts`, `guarda.ts`), `testes/dados/`.

### Fase 1 · Modo 3D

| # | O que fazer | Onde | Pronto quando | Como testar |
|---|---|---|---|---|
| 1.1 | Tirar print da tela de hoje em 390x844 e 1280x800, tema claro e escuro, com a cena pixel aberta e fechada | `testes/prints/antes/` | 8 prints salvos | conferir os 8 arquivos |
| 1.2 | Conferir a função única de estado (parte 6). Quem constrói é a 11-E, no passo 16 dela, por este contrato; aqui só se conferem os campos. Se ela não existir, pare e avise | banco e `estado.ts` | cena pixel e cartões leem `lerEstadoEscritorio()`; busca por outra fonte de situação dá 0 | T-F02 |
| 1.3 | Gravar os 2 conjuntos de teste: família Silva em 24/11 e "todas as situações" | `testes/dados/` | 2 arquivos JSON iguais à parte 6 | abrir com `?dados=silva-todas` em rascunho |
| 1.4 | Botão "Ver em 3D" dentro da caixa da cena, canto de cima à direita, sem empurrar nada | `Cena.tsx` | botão de 44 px de toque; no celular só aparece com a cena aberta | T-F01 |
| 1.5 | Carregar o pedaço 3D só ao ligar: `import('./cena3d')` dentro do clique; a three.js entra só nesse pedaço | `Cena.tsx` | com 3D desligado, 0 pedido de rede do pedaço 3D | T-F03 |
| 1.6 | Planta e móveis: 8 mesas, cadeiras, parede do fundo, quadro, mesa de reunião, tudo em `FIXO` | `planta.ts` | cena parada desenha com até 3 chamadas | `__escritorio3d.info()` |
| 1.7 | Elenco: 8 bonecos com as cores e o objeto de mesa da parte 4 | `elenco.ts`, `boneco.ts` | 8 bonecos sentados nas mesas certas nas 2 plantas | print lado a lado com o pixel |
| 1.8 | Câmera fixa e enquadramento nas 2 larguras | `camera.ts` | nada cortado em 358x456 e 1148x418 | T-F06 |
| 1.9 | Luz, sombra parada e tema claro e escuro | `index.ts` | 2 luzes; sombra só refaz quando alguém anda | T-F17 |
| 1.10 | As 7 situações: pose, objeto e movimento | `situacoes.ts` | conjunto "todas as situações" mostra as 7 | T-F07, T-F08 |
| 1.11 | Etiquetas em HTML: 8 botões na ordem dos cartões | `etiquetas.ts` | 0 etiqueta sobreposta nas 2 larguras | T-F05, T-F06 |
| 1.12 | Toque: boneco, mesa ou etiqueta leva ao cartão com voo de 0,5 s | `camera.ts`, `Cena.tsx` | toque rola a página e põe o foco no título do cartão | T-F09 |
| 1.13 | Laço que desenha só quando muda e para com a aba oculta | `index.ts` | 0 quadro em 10 s de cena parada | T-F14, T-F15 |
| 1.14 | Guarda: sem suporte, fluidez baixa e perda de contexto caem pro pixel | `guarda.ts`, `Cena.tsx` | pixel visível em até 1 s, sem texto técnico | T-F10, T-F11, T-F12 |
| 1.15 | Acesso: Tab, Enter, leitor de tela, reduzir movimento | `etiquetas.ts`, `situacoes.ts` | tarefa completa só com teclado | T-F18, T-F19, T-F20 |
| 1.16 | Lembrar a escolha no aparelho | `Cena.tsx` | recarregar mantém o modo | T-F04 |
| 1.17 | Medir o orçamento e preencher a tabela da parte 7 com os números reais | relatório de entrega | 6 tetos medidos | T-F13, T-F16 |
| 1.18 | Teste no iPhone do dono e print final nas 2 larguras | aparelho real | dono reconhece 8 de 8 sem etiqueta | T-F21, T-F22 |

### Fase 2 · Ao vivo e linha do tempo

| # | O que fazer | Onde | Pronto quando | Como testar |
|---|---|---|---|---|
| 2.1 | Assinar o aviso de mudança do banco e reler a função de estado a cada aviso | `estado.ts` | conferência fechada em outro aparelho muda cena e cartão em até 5 s | T-F23 |
| 2.2 | Releitura de 5 em 5 s quando o aviso cai e a aba está visível | `estado.ts` | com o aviso desligado à força, a mudança chega em até 10 s | derrubar o canal no teste |
| 2.3 | Comemoração de 1,5 s quando passa de "Conferindo agora" pra "Entregue" | `situacoes.ts` | braços pra cima 1,5 s, depois a pilha surge | T-F23 |
| 2.4 | Função do dia: início e eventos (parte 9) | banco e `estado.ts` | devolve o JSON da parte 9 pra família Silva | comparar com o conjunto de teste |
| 2.5 | Linha do tempo arrastável embaixo da cena | `LinhaDoDia.tsx` | arrastar mostra a cena daquela hora; "Voltar pro agora" desfaz | T-F24 |
| 2.6 | Aviso falado pro leitor de tela a cada mudança | `etiquetas.ts` | 1 frase por mudança, sem repetir | VoiceOver ligado |

### Fase 3 · Lugares úteis

| # | O que fazer | Onde | Pronto quando | Como testar |
|---|---|---|---|---|
| 3.1 | Quadro de metas vira botão: mostra "N de 8 entregaram" e abre o resumo | `planta.ts`, `etiquetas.ts` | toque e Enter abrem a tela que já existe | T-F25 |
| 3.2 | Mesa de reunião vira botão "Resumo da semana" | idem | abre o resumo da semana que já existe | T-F25 |
| 3.3 | Segunda: quem está em "Entregue" vai até a mesa de reunião | `situacoes.ts` | só com resumo da semana ainda não aberto | T-F26 |
| 3.4 | Botão "Entregar documento" na cena | `Cena.tsx` | abre a tela de envio da Tarefa 12 | T-F27 |
| 3.5 | No computador, soltar um arquivo sobre uma mesa faz o mesmo que o botão | `Cena.tsx` | mesa realça ao passar; soltar abre a mesma tela, com o tipo já escolhido | T-F27 |

## 4. Especificação da cena

Unidade: 1 = 1 metro. Eixo x pra direita, z pra frente (pra câmera), y pra cima. A caixa da cena 3D tem exatamente o tamanho da caixa da cena pixel, medido na prévia aprovada: **358x456 px** no celular (cena aberta) e **1148x418 px** no computador. O 3D fica por cima do pixel, com posição absoluta, e nada na página muda de lugar.

### Planta

São 2 plantas, como o pixel já tem 2 (`WIDE` e `NARROW`): **larga** (tela com 900 px ou mais) e **estreita** (menos de 900 px). Mesmos setores e mesmos vizinhos do pixel. Uma função só, `montarPlanta(P)`, recebe a tabela.

Planta larga, 14,4 x 8 m (x de -7.2 a 7.2, z de -4 a 4):

```
z=-4.0 +-------------------[ QUADRO DE METAS x=0 ]--------------------+ parede do fundo, 2,2 m
       |  CASA                          RESERVA        DIRETORIA      |
 -2.12 |  (o)     (o)     (o)             (o)             (o)         | cadeiras
 -1.4  | [COMP]  [FOLH]  [PRES]          [GUAR]          [CONT]       | mesas
       |  CONTAS                                                      |
  1.08 |  (o)     (o)     (o)                    +-------------+      |
  1.8  | [CART]  [AGEN]  [AUDI]                  |   REUNIÃO   |      | mesa de reunião
       |                                         +-------------+      |
  3.4  |   F1      F2      F3      F4      F5      F6                 | frente
z= 4.0 +--------------------------------------------------------------+ rodapé de 0,12 m
    x=  -6.0    -3.8    -1.6     0.6     2.8     5.0          a câmera olha deste lado
```

Planta estreita, 7,4 x 10,8 m (x de -3.7 a 3.7, z de -5.4 a 5.4):

```
z=-5.4 +-------[ QUADRO DE METAS x=0 ]-------+ parede do fundo
       | DIRETORIA                  RESERVA  |
 -3.92 |  (o)      +---------+        (o)    |
 -3.2  | [CONT]    | REUNIÃO |      [GUAR]   |
       |           +---------+               |
       | CASA                                |
 -1.12 |  (o)         (o)           (o)      |
 -0.4  | [COMP]     [FOLH]        [PRES]     |
       | CONTAS                              |
  1.68 |  (o)         (o)           (o)      |
  2.4  | [CART]     [AGEN]        [AUDI]     |
  4.6  |   F1         F2            F3       | frente
z= 5.4 +-------------------------------------+
    x=  -2.45        0            2.45
```

| Ajudante (`id`) | Setor | Larga: mesa (x, z) | Estreita: mesa (x, z) | Virado pra |
|---|---|---|---|---|
| `contador` | DIRETORIA | (5.0, -1.4) | (-2.45, -3.2) | frente (+z) |
| `cartao` | CONTAS | (-6.0, 1.8) | (-2.45, 2.4) | frente |
| `vencimentos` | CONTAS | (-3.8, 1.8) | (0, 2.4) | frente |
| `comprador` | CASA | (-6.0, -1.4) | (-2.45, -0.4) | frente |
| `auditor` | CONTAS | (-1.6, 1.8) | (2.45, 2.4) | frente |
| `presenca` | CASA | (-1.6, -1.4) | (2.45, -0.4) | frente |
| `folha` | CASA | (-3.8, -1.4) | (0, -0.4) | frente |
| `colchao` | RESERVA | (1.6, -1.4) | (2.45, -3.2) | frente |

| Lugar | Larga | Estreita |
|---|---|---|
| Cadeira e boneco sentado | (x da mesa, z da mesa - 0.72) | igual |
| Frente (quem "precisa de você") | z = 3.4; 6 vagas em x = -6.0, -3.8, -1.6, 0.6, 2.8, 5.0 | z = 4.6; 3 vagas em x = -2.45, 0, 2.45 |
| Parede do quadro de metas | parede do fundo, centro (0, 1.3, -3.96), 1,6 x 0,9 m | parede do fundo, centro (0, 1.3, -5.36), 1,6 x 0,9 m |
| Sala de reunião | mesa 2,4 x 1,0 m em (3.6, 1.9) | mesa 1,8 x 0,9 m em (0, -3.4) |
| Corredor de andar | x da mesa + 1.1 (a coluna mais à direita usa - 1.1) | x da mesa + 1.22 (a da direita usa - 1.22) |

Móveis por mesa (medidas do código atual): tampo 1,1 x 0,06 x 0,6 a 0,6 m de altura; 4 pés; notebook no centro (base 0,42 x 0,28 e tampa 0,42 x 0,27 virada pra câmera); cadeira 0,44 x 0,44. Lado esquerdo do tampo (x - 0.36) é do **objeto da situação**; lado direito (x + 0.40) é do **objeto que identifica** o ajudante. Paredes: só a do fundo é alta (2,2 m); laterais com 0,7 m; frente com rodapé de 0,12 m. Nome do setor: texto HTML no piso (classe `sala` do código atual), sem toque, escondido do leitor de tela.

Regra da frente: quem entra em "Precisa de você" pega a vaga livre mais perto do x da própria mesa (empate: a da esquerda), na ordem da lista "Depende de você". Sem vaga livre, fica de pé atrás da própria cadeira, com a mesma pose.

### Elenco

Cores tiradas da tabela `P` da cena pixel da prévia (tom do meio de cada cor). A cor que mais aparece no tronco é a cor de identificação que o pixel já usa nas plaquinhas.

| `id` | Apelido na etiqueta | Tronco (identificação) | Mangas | Cabelo e corte | Pele | Calça | Objeto de mesa |
|---|---|---|---|---|---|---|---|
| `contador` | Contador | `#3E6FB0` camisa | `#3E6FB0` | `#3A281C` curto | `#EDC29A` | `#2C3350` | calculadora |
| `cartao` | Cartão | `#7A55A8` camisa, gola `#F2EADC` | `#7A55A8` | `#8A5A2B` longo | `#EBBE96` | `#2E2A3E` | 2 cartões em pé |
| `vencimentos` | Agenda | `#A3B23C` colete | `#F2EFE6` | `#2E1C12` cacheado | `#A86E48` | `#3D4D70` | calendário de mesa |
| `comprador` | Comprador | `#4E9A55` avental | `#F0E6D0` | `#5E3E26` coque | `#C98E62` | `#3D4D70` | sacola de feira com verdura |
| `auditor` | Auditor | `#C0573F` colete | `#ECEAF2` | `#2E2A34` raspado | `#E2AE84` | `#6E5B44` | prateleira com 3 potes |
| `presenca` | Presença | `#2E8B8B` colete | `#E8ECEF` | `#5E554E` curto | `#B07A52` | `#3A3F4A` | relógio de ponto com cartões |
| `folha` | Folha | `#5A6472` camisa | `#5A6472` | `#55361E` coque | `#E0B088` | `#2E3440` | pasta de holerites e carimbo |
| `colchao` | Guardião | `#6B4F3A` camisa | `#6B4F3A` | `#A8A7A1` curto | `#E3BC94` | `#3A3328` | cofre baixo |

Como montar o boneco (6 peças móveis, cada uma fechada com `fecha()` em 1 desenho):

| Peça | Caixas (largura x altura x fundo, em m) | Eixo de giro |
|---|---|---|
| Tronco | 0,46 x 0,50 x 0,26 na cor do tronco; gola 0,20 x 0,05; colete ou avental é a própria cor do tronco | quadril (`hips`) |
| Cabeça | pescoço 0,14 x 0,08; rosto 0,44 x 0,40 x 0,40 na pele; 2 olhos, 2 sobrancelhas, nariz, boca; cabelo por corte | base do pescoço, y = 0.5 |
| Braço (2) | manga 0,13 x 0,24 x 0,14 + antebraço e mão 0,12 x 0,29 na pele, numa peça só | ombro, x = +-0.30, y = 0.44 |
| Perna (2) | 0,18 x 0,48 x 0,20 na calça + sapato 0,18 x 0,07 x 0,27, numa peça só | quadril, x = +-0.12 |

Cortes de cabelo em caixas: curto (tampa 0,48 x 0,13 + nuca), raspado (tampa de 0,05 de altura), longo (tampa + 2 laterais de 0,42 + costas de 0,50), coque (curto + cubo de 0,20 no alto), cacheado (tampa + 6 cubos de 0,14 nas bordas). Altura do quadril: 0.555 de pé e 0.325 sentado. Boneco de pé mede 1,67 m.

### Câmera

| Item | Valor |
|---|---|
| Tipo | ortográfica (sem perspectiva, o tamanho não muda com a distância), `OrthographicCamera` |
| Direção | de frente e de cima: `DIR = (0, 1, 1)` normalizado. Ângulo de 45 graus pra baixo, 0 grau de lado. Fixa: o usuário não gira nem arrasta |
| Distância | 40 m ao longo de `DIR` (em câmera ortográfica só serve pra nada ficar atrás dela); perto 0.1, longe 100 |
| Enquadramento geral | `vistaDe(x0-0.2, x1+0.2, 2.3, z0-0.2, z1+0.9)` com margem 1.03 em `aplicaVista` |
| Em 390x844 (caixa 358x456, planta estreita) | 44 px por metro; boneco sentado com 53 px de altura; mesas vizinhas a 108 px |
| Em 1280x800 (caixa 1148x418, planta larga) | 50 px por metro; a cena ocupa 746 px no centro; mesas vizinhas a 111 px |
| Voo até a mesa | 500 ms, de `vAtual` até `vistaDe(x-1.7, x+1.7, 2.0, z-1.5, z+1.2)`, onde (x, z) é onde o boneco está (cadeira vazia: a mesa). Aproxima 2,3 vezes |
| Curva do voo | começa rápido e freia: `e = 1 - (1-k)^3`, k de 0 a 1. Interpola `cx`, `cy`, `hw`, `hh` |
| Volta | botão "Ver tudo" (44 px) no canto de baixo à esquerda da cena, toque no piso, ou sozinha e sem animação quando a cena sai da tela |

Medido num protótipo de enquadramento (só piso, mesas, bonecos simples e etiquetas): com as palavras mais longas em 8 de 8 etiquetas, 0 sobreposição e 0 etiqueta cortada nas 2 larguras.

### Luz e sombra

| Item | Tema claro | Tema escuro |
|---|---|---|
| Luz de ambiente (`HemisphereLight`) | céu `#FFFFFF`, chão `#B8A88C`, força 1.5 | céu `#C9D2E8`, chão `#3A3530`, força 0.9 |
| Sol (`DirectionalLight`), posição fixa (-5, 12, 7) | `#FFF2DD`, força 2.4 | `#BFCBE6`, força 1.3 |
| Fundo | transparente; a cor vem da caixa em CSS | igual |
| Tampa de notebook acesa | `#DDF3E4`, emissiva 0.6 | igual, emissiva 0.9 |

Quantidade: 2 luzes, nunca mais. Material: `MeshLambertMaterial` com cor por vértice. Mapa de sombra: 1024 x 1024 no celular e 2048 x 2048 no computador, suave (`PCFSoftShadowMap`), `bias -0.0006`, `normalBias 0.03`, caixa da sombra de 18 x 18 m. Sombra parada: `sol.shadow.autoUpdate = false` e `needsUpdate = true` só ao montar, ao trocar o tema e nos quadros em que algum boneco anda, levanta ou senta. Fazem sombra: a peça fixa, e o tronco e a cabeça de cada boneco. Trocar de tema não remonta a cena: muda 4 valores de luz e pede 1 quadro.

### Etiquetas em HTML sobre a cena: ícone + nome + palavra da situação

```html
<ul class="tags3d" role="list"><li>
  <button class="tag3d" data-id="comprador" aria-label="Comprador: Precisa de você. Abrir o cartão">
    <b><svg class="lucide" aria-hidden="true"><use href="#i-circle-alert"/></svg>Comprador</b><span>Precisa de você</span>
  </button></li></ul>
```

1. 8 botões, na ordem dos cartões: `contador`, `cartao`, `vencimentos`, `comprador`, `auditor`, `presenca`, `folha`, `colchao`. A ordem no HTML nunca muda, mesmo quando o boneco anda.
2. 2 linhas: ícone Lucide de 12 px + apelido em 12 px peso 600; embaixo a palavra da situação em 11 px. Fundo branco do cartão, raio 8 px, sem cor de situação no fundo. Largura máxima 112 px, altura visível 34 px, área de toque 44 px.
3. Posição: centrada sobre a cabeça, 4 px acima (`y do quadril + 1.12`). Boneco na frente: etiqueta 4 px **abaixo dos pés**, pra não cobrir as mesas de trás. Cadeira vazia: ancorada no encosto da cadeira.
4. Trava de 4 px nas bordas da caixa. Atualiza posição só nos quadros desenhados, com `transform: translate()`.
5. A palavra vem do campo `palavra` da função de estado, sem reescrever. O complemento ("desde 23/11", "até 01/12") vai só no `aria-label` e no cartão.
6. Ícone por situação: parte 5. São os mesmos nomes de ícone do sinal do cartão (11-E, parte 7).

## 5. Situações em 3D (as 7 da base comum: pose, objeto na mesa, movimento com duração, palavra exata; como fica com "reduzir movimento"; prova de que se distingue em preto e branco)

Ângulos em radianos. "Parado" quer dizer 0 quadro desenhado depois que a pose assenta (até 400 ms).

| # | Palavra exata | Valor | Pose | Objeto na mesa | Movimento e duração | Ícone |
|---|---|---|---|---|---|---|
| 1 | Conferindo agora | `trabalhando` | sentado, tronco 0.10 pra frente, 2 braços no teclado (-0.9), cabeça 0.16 pra baixo | tampa do notebook acesa | braços alternam +-0.05 em ciclo de 480 ms, contínuo, a 30 quadros por segundo | `loader-circle` |
| 2 | Entregue | `entregue` | sentado, encostado (tronco -0.12), braços no colo (-0.25) | pilha de 3 folhas, 0,30 x 0,09 x 0,22, tampa apagada | pilha cresce de 0 a 1 em 200 ms, 1 vez; depois parado | `circle-check` |
| 3 | Precisa de você | `precisa_de_voce` | de pé na frente, virado pra câmera, braço direito erguido (2.55), cabeça -0.08 | pilha de 3 folhas e cadeira vazia | anda a 2,5 m por segundo (até 3,1 s); ao chegar, a mão dá 1 aceno de +-0.45 em 600 ms; depois parado | `circle-alert` |
| 4 | Perguntando | `sem_dados` | sentado, cabeça 0.20 de lado, braço direito à frente (-1.2) | balão branco 0,50 x 0,40 com "?" em 5 caixas escuras, acima e à direita da cabeça; tampa apagada | balão surge e pulsa de 1 a 1,15 a 1 em 600 ms, 1 vez; depois parado | `message-circle-question` |
| 5 | Aguardando | `aguardando` | sentado, reto, mãos no colo | ampulheta de 0,22 de altura (base, topo e 2 bojos); tampa apagada | parado | `hourglass` |
| 6 | Atrasado | `atrasado` | boneco escondido; cadeira puxada 0,30 pra trás e girada 0.5 | despertador de 0,20 com 2 sinos; tampa apagada | parado | `clock-alert` |
| 7 | Resumido | `resumido` | igual a "Entregue" | 1 folha só (0,03 de altura), girada 0.4, com clipe escuro `#33373D` | folha surge em 200 ms, 1 vez; depois parado | `file-minus` |

Regras:
1. A palavra da etiqueta é a da base comum. A tabela da ficha 11-F usa outras ("trabalhando", "entregou", "esperando um dado seu"); vale a base comum, que é igual ao cartão. Situação desconhecida vinda da função: pose de "Aguardando" e a `palavra` que veio.
2. Ao montar a cena ninguém anda: cada boneco já nasce no lugar da situação dele. Andar só acontece quando a situação muda com a cena aberta. Saiu de "Precisa de você": volta pra cadeira pelo mesmo caminho e senta.

**Com "reduzir movimento"** (`prefers-reduced-motion: reduce`): 0 laço contínuo. Digitar vira pose parada com a tampa acesa. Andar vira troca de lugar sem caminho. Aceno, pulso do balão, crescer da pilha e comemoração não acontecem: o objeto já aparece pronto. Voo de câmera não acontece: a página vai direto pro cartão, sem rolagem animada.

**Prova em preto e branco.** Nenhuma situação depende de cor: cada uma tem silhueta, objeto e forma de ícone próprios.

| Situação | Tem boneco na cadeira? | Silhueta | Objeto (forma) | Ícone (forma) |
|---|---|---|---|---|
| Conferindo agora | sim | curvado, 2 braços à frente | retângulo claro em pé | anel aberto |
| Entregue | sim | encostado | bloco baixo e largo | círculo com visto |
| Precisa de você | não, está de pé na frente | 1 braço pra cima | bloco baixo e largo | círculo com exclamação |
| Perguntando | sim | 1 braço à frente | balão com "?" ao lado da cabeça | balão com "?" |
| Aguardando | sim | reto | 2 bojos empilhados | ampulheta |
| Atrasado | não, ninguém | cadeira torta | cubo com 2 sinos | relógio com exclamação |
| Resumido | sim | encostado | 1 folha torta com clipe | folha com traço |

O par mais parecido é "Entregue" e "Resumido" (mesma pose): separa pela altura da pilha (0,09 contra 0,03), pelo clipe e pela palavra. Teste: T-F08.

## 6. Contrato de dados (a função única de estado que cena pixel, cena 3D e cartões leem: nome sugerido, o JSON exato de saída com exemplo dos 8 ajudantes da família Silva; como a fase 2 recebe mudança ao vivo; o que fazer se a leitura falhar)

**Nome e dono.** No banco: `escritorio_estado()`, função calculada na hora, sem tabela nova, que descobre a família e o papel pelo login (não recebe `familia_id` de fora) e recusa `membro` e `equipe_casa` com "sem acesso" (regra da 11-C). No app: `lerEstadoEscritorio()` e o gancho `useEstadoEscritorio()` em `estado.ts`. Este caderno é dono do contrato (os campos abaixo). Quem constrói a função é a 11-E, no passo 16 dela, porque os cartões precisam dela antes do 3D. A `escritorio_tela()` da 11-C usa a saída desta função pra situação. Não crie uma 2ª.

**Regras.**
1. Cena pixel, cena 3D e cartões recebem o mesmo objeto, lido 1 vez por tela. Nenhum dos 3 calcula situação.
2. `situacao` já vem resolvida, 1 por ajudante, nesta prioridade: `atrasado`, `precisa_de_voce`, `sem_dados`, `trabalhando`, `aguardando`, `resumido`, `entregue`. "Atrasado" vem primeiro porque a 11-E, dona do sinal do cartão, manda que ele vença qualquer outra (pergunta 5 da parte 13). "Atrasado" e "Resumido" são calculados no banco, como manda a base comum.
3. O JSON da cena não leva nenhum valor em R$ e nenhum texto de relatório.
4. Datas com fuso de Recife (`-03:00`). `palavra` e `complemento` já vêm prontos pra tela.

**Saída exata** (família Silva, terça, 24/11/2026, 9h00):

```json
{
  "versao": 1, "gerado_em": "2026-11-24T09:00:00-03:00", "fuso": "America/Recife",
  "resumo": { "precisam": 1, "perguntando": 1, "conferindo": 1, "entregaram": 5, "atrasados": 0 },
  "ajudantes": [
    {"id":"contador","ordem":1,"nome":"Contador da Casa","apelido":"Contador","setor":"Os orçamentos","ativo":true,"situacao":"entregue","palavra":"Entregue","complemento":null,"icone":"circle-check","status":"entregue","resumido":false,"atrasado":false,"desde":"2026-11-02T07:14:00-03:00","proxima":"2026-12-01T07:12:00-03:00","pendencias":0,"cartao":"m_contador"},
    {"id":"cartao","ordem":2,"nome":"Analista de Cartão","apelido":"Cartão","setor":"Cartões e parcelas","ativo":true,"situacao":"sem_dados","palavra":"Perguntando","complemento":null,"icone":"message-circle-question","status":"sem_dados","resumido":false,"atrasado":false,"desde":"2026-11-11T08:17:00-03:00","proxima":"2026-11-26T08:17:00-03:00","pendencias":1,"cartao":"m_cartao"},
    {"id":"vencimentos","ordem":3,"nome":"Agenda de Vencimentos","apelido":"Agenda","setor":"Contas com data","ativo":true,"situacao":"trabalhando","palavra":"Conferindo agora","complemento":null,"icone":"loader-circle","status":"trabalhando","resumido":false,"atrasado":false,"desde":"2026-11-24T08:58:00-03:00","proxima":"2026-11-25T10:19:00-03:00","pendencias":0,"cartao":"m_vencimentos"},
    {"id":"comprador","ordem":4,"nome":"Comprador","apelido":"Comprador","setor":"Feira","ativo":true,"situacao":"precisa_de_voce","palavra":"Precisa de você","complemento":null,"icone":"circle-alert","status":"precisa_de_voce","resumido":false,"atrasado":false,"desde":"2026-11-23T20:25:00-03:00","proxima":"2026-11-30T20:23:00-03:00","pendencias":1,"cartao":"m_comprador"},
    {"id":"auditor","ordem":5,"nome":"Auditor de Estoque","apelido":"Auditor","setor":"Despensa e cozinha","ativo":true,"situacao":"entregue","palavra":"Entregue","complemento":null,"icone":"circle-check","status":"entregue","resumido":false,"atrasado":false,"desde":"2026-11-24T07:43:00-03:00","proxima":"2026-12-01T07:41:00-03:00","pendencias":0,"cartao":"m_auditor"},
    {"id":"presenca","ordem":6,"nome":"Controlador de Presença","apelido":"Presença","setor":"Equipe da casa","ativo":true,"situacao":"entregue","palavra":"Entregue","complemento":null,"icone":"circle-check","status":"entregue","resumido":false,"atrasado":false,"desde":"2026-11-23T08:14:00-03:00","proxima":"2026-11-30T08:13:00-03:00","pendencias":0,"cartao":"m_presenca"},
    {"id":"folha","ordem":7,"nome":"Folha da Casa","apelido":"Folha","setor":"Empregados da casa","ativo":true,"situacao":"entregue","palavra":"Entregue","complemento":null,"icone":"circle-check","status":"entregue","resumido":false,"atrasado":false,"desde":"2026-11-03T09:38:00-03:00","proxima":"2026-12-03T09:37:00-03:00","pendencias":1,"cartao":"m_folha"},
    {"id":"colchao","ordem":8,"nome":"Guardião do Colchão","apelido":"Guardião","setor":"Reserva","ativo":true,"situacao":"entregue","palavra":"Entregue","complemento":null,"icone":"circle-check","status":"entregue","resumido":false,"atrasado":false,"desde":"2026-11-20T17:48:00-03:00","proxima":"2026-11-27T17:47:00-03:00","pendencias":0,"cartao":"m_colchao"}
  ]
}
```

| Campo | Tipo | Quem usa | Observação |
|---|---|---|---|
| `situacao` | 1 dos 7 valores da parte 5 | pixel, 3D, cartão | única fonte de pose e de ícone |
| `palavra` | texto | etiqueta 3D, plaquinha pixel, sinal do cartão | igual nos 3, letra por letra |
| `complemento` | texto ou `null` | cartão e `aria-label` | "desde 23/11", "até 01/12" |
| `status`, `resumido`, `atrasado` | valor do banco e 2 marcas | conferência, teste e cartão | a cena não usa pra desenhar. O cartão da 11-E usa só `resumido`, pra mostrar o 2º sinal "Resumido até 01/12" quando a situação principal é outra |
| `desde` | data e hora | fase 2 | quando entrou na situação atual |
| `proxima` | data e hora | cartão | próximo horário da escala |
| `pendencias` | número | cartão | quantas pendências abertas |
| `cartao` | texto | 3D | `id` do cartão na página, pra rolar e focar |
| `ativo` | sim ou não | 3D e pixel | `false`: mesa sem boneco, sem objeto e sem etiqueta |

**2º conjunto de teste, "todas as situações"** (mesmo JSON, trocando só estes 4; os outros 4 ficam como acima):

| `id` | `situacao` | `palavra` | `complemento` | marcas |
|---|---|---|---|---|
| `comprador` | `aguardando` | Aguardando | "a 1ª nota da feira" | `status: "aguardando"`, `pendencias: 0` |
| `auditor` | `precisa_de_voce` | Precisa de você | `null` | `status: "precisa_de_voce"`, `pendencias: 1` |
| `presenca` | `atrasado` | Atrasado | "desde 23/11" | `atrasado: true` |
| `folha` | `resumido` | Resumido | "até 01/12" | `resumido: true`, `status: "entregue"` |

**Fase 1: quando lê.** Ao abrir a tela, ao voltar pra aba, e depois de qualquer ação do usuário que mude situação ("Resolvi", "Rodar agora", responder pergunta). A cena recebe o objeto novo por `cena.aplicar(estado)`.  
**Fase 2: mudança ao vivo.** O app assina os avisos de mudança do banco (Supabase Realtime) na tabela `escritorio_turnos`, filtrados pela família. O aviso serve só de campainha: ao chegar, o app espera 300 ms (junta avisos seguidos) e chama `escritorio_estado()` de novo. O dado sempre vem da função, que respeita a tranca por família e por papel; nada do corpo do aviso vai pra tela. Se o canal cair e a aba estiver visível: reler de 5 em 5 s até o canal voltar.

**Se a leitura falhar.**
1. Falhou na 1ª leitura: o 3D não monta. A tela segue com o pixel e com o aviso de erro que os cartões já têm. O 3D não cria aviso próprio.
2. Falhou depois: manter o último estado bom na cena, parar os laços contínuos e tentar de novo em 5 s, 15 s e 60 s.
3. Último estado bom com mais de 10 minutos: os 8 vão pra pose neutra (sentado, parado, tampa apagada), a etiqueta mantém a palavra e o `aria-label` da cena passa a dizer "Sem atualização desde 9h00".
4. Nunca inventar situação por relógio, nem por conjunto de teste, fora do endereço de rascunho.

## 7. Orçamento e plano B (tetos numéricos; carregamento só ao ligar o 3D; como medir quadros por segundo; as 3 condições de queda pro pixel e o código de rascunho pra tratar a perda e a volta do contexto gráfico; parar com aba oculta; desenhar só quando muda)

| Item | Teto | 3D atual (referência, navegador sem placa de vídeo) | Projeto novo (estimativa, medir no passo 1.17) |
|---|---|---|---|
| Pedaço 3D compactado (three.js + cena, gzip) | 250 KB | 186 KB a página inteira | 130 a 190 KB |
| Chamadas de desenho por quadro | 100 | 123 | 66 parado; 83 no quadro em que alguém anda |
| Triângulos | 30.000 | 5.364 | cerca de 6.000 |
| Memória de script | 60 MB | 11 MB | até 15 MB |
| Quadros por segundo no iPhone | alvo 60, piso 30 | 28 sem placa de vídeo | medir no aparelho |
| Tempo do toque em "Ver em 3D" até o 1º quadro, em wifi | 1,5 s | 0,9 s | medir |
| Quadros desenhados com a cena parada | 0 em 10 s | cerca de 280 em 10 s | 0 |
| Nitidez (pixels reais por pixel de tela) | 1,5 no celular e 2 no computador | igual | igual |
| Luzes e mapa de sombra | 2 luzes; 1024 no celular, 2048 no computador | 6 luzes | 2 luzes |

Conta das chamadas: 2 peças fixas + 8 bonecos x 6 peças (48) + 8 tampas de notebook + 8 objetos de situação = 66. No quadro com sombra refeita entram 1 peça fixa + 8 troncos + 8 cabeças = 17.

**Carregamento.** `import('./cena3d')` só dentro do clique em "Ver em 3D", ou ao abrir a tela com a escolha "3D" lembrada e a caixa da cena a menos de 200 px da área visível (no celular, só com a cena aberta). A three.js fica fixada na versão `0.160.0` (a mesma do 3D atual) e só é importada dentro de `cena3d/`. Enquanto o pedaço baixa, o pixel continua na tela, sem tela de espera. A troca acontece no 1º quadro 3D desenhado. Se passar de 4 s ou der erro de rede: fica o pixel, em silêncio, e o botão volta ao estado desligado.

**Desenhar só quando muda.** Uma marca `sujo` e uma contagem `animando`. `pedirQuadro()` marca `sujo` e agenda 1 `requestAnimationFrame` se não houver um agendado. O laço se reagenda só enquanto `animando > 0` (alguém andando, voo de câmera, pulso, alguém digitando). Laços contínuos (digitar) desenham 1 quadro sim, 1 não: 30 por segundo. Etiquetas só reposicionam em quadro desenhado.  
**Parar com aba oculta.** Em `visibilitychange` com `document.hidden`: `cancelAnimationFrame` e zerar o relógio da animação. Mesmo tratamento quando o `IntersectionObserver` diz que a cena saiu da tela. Na volta: reler o estado e desenhar 1 quadro.

**Como medir quadros por segundo.** Contar as chamadas do `requestAnimationFrame` em janelas de 1 s, só em janelas em que o laço ficou ativo o tempo todo. Os 2 primeiros segundos depois de montar não contam. `window.__escritorio3d` devolve: `fps()`, `historico()`, `quadros()` (total desenhado), `info()` (chamadas e triângulos), `motivoDaQueda()` e `simular(tipo, valor)`. No endereço de rascunho, `?medir=1` deixa o laço contínuo por 5 minutos e mostra na tela, no fim, o menor, a média e o maior valor, pra tirar print no iPhone.

**As 3 condições de queda pro pixel:**

| # | Condição | Como detectar | O que acontece |
|---|---|---|---|
| 1 | Sem suporte | `temWebGL()` falso, erro ao baixar o pedaço, ou erro dentro de `montarCena3D` | o pixel nunca sai da tela |
| 2 | Fluidez baixa | 2 janelas seguidas abaixo de 24: nitidez cai pra 1 e a sombra desliga. 4 janelas seguidas abaixo de 24 (4 s): cai | pixel em até 1 s |
| 3 | Cena derrubada | evento `webglcontextlost` no canvas | pixel em até 1 s |

Nas 3: nenhum texto técnico na tela, o botão volta pra "Ver em 3D", a escolha lembrada não é apagada e o motivo vai só pro registro do dono do produto. Caiu 2 vezes na mesma visita: o botão some até recarregar. Caiu em 3 visitas seguidas: a escolha lembrada volta pra pixel sozinha.

Pra cair em 1 s, o pixel nunca é desmontado: com o 3D na frente ele fica com `visibility: hidden` e com o laço dele pausado. Cair é esconder o 3D, mostrar o pixel e retomar o laço do pixel.

**Rascunho da guarda de contexto:**

```ts
// cena3d/guarda.ts (rascunho)
export function guardarContexto(canvas: HTMLCanvasElement, cena: Cena3D, cair: (motivo: string) => void) {
  const perdeu = (ev: Event) => {
    ev.preventDefault();          // sem isto o navegador nunca devolve o contexto
    cena.pausar();                // cancelAnimationFrame e animando = 0
    cair('contexto');             // Cena.tsx mostra o pixel na hora e soma 1 queda
  };
  // Na volta, não religa sozinho (evita piscar no meio da leitura): o toque em "Ver em 3D" desmonta e monta de novo.
  const voltou = () => cena.marcarParaRemontar();
  canvas.addEventListener('webglcontextlost', perdeu, false);
  canvas.addEventListener('webglcontextrestored', voltou, false);
  return () => { canvas.removeEventListener('webglcontextlost', perdeu, false); canvas.removeEventListener('webglcontextrestored', voltou, false); };
}
// Cena.tsx (rascunho)
function cair(motivo: 'suporte' | 'fluidez' | 'contexto') {
  mostrarPixel();                 // tira o visibility:hidden e retoma o laço do pixel
  esconder3D();                   // display:none no canvas 3D e nas etiquetas 3D
  quedasNaVisita += 1;
  registrarQueda(motivo);         // só registro; nada na tela
  if (quedasNaVisita >= 2) esconderBotao3D();
}
```

Ao remontar depois de uma perda: `desmontar()` solta geometrias, materiais e o `renderer` (`dispose()` e `forceContextLoss()`), tira os ouvintes e cria tudo de novo. Não tentar consertar a cena antiga: a sombra parada e as etiquetas ficariam erradas. Teste da perda: extensão `WEBGL_lose_context` (`loseContext()` e `restoreContext()`), que `simular('contexto')` chama.  
**Lembrar a escolha.** `localStorage`, chave `cf.escritorio.modo`, valores `pixel` ou `3d`; sem a chave, vale `pixel`. Quedas em visitas seguidas: chave `cf.escritorio.quedas3d`, zerada numa visita sem queda. Nada disso vai pro banco.

## 8. Acesso (teclado, leitor de tela, reduzir movimento, lista equivalente)

1. **Teclado.** Tab entra no botão "Ver em 3D", depois nas 8 etiquetas na ordem dos cartões, depois em "Ver tudo" (se a câmera estiver perto). Enter ou Espaço numa etiqueta faz o mesmo que o toque: voo, rolagem e foco no título do cartão. Esc com a câmera perto volta pra vista geral. Anel de foco de 2 px, visível nos 2 temas.
2. **Leitor de tela.** O canvas 3D tem `aria-hidden="true"`. A caixa da cena é `role="group"` com `aria-label="Escritório em 3D com os 8 ajudantes"`. Cada etiqueta lê "Apelido: palavra, complemento. Abrir o cartão". O botão do modo usa `aria-pressed`. Na fase 2, uma região `aria-live="polite"` fala 1 frase por mudança, por exemplo "Auditor de Estoque: Entregue às 7h43".
3. **Lista equivalente.** As 8 etiquetas são uma lista de verdade (`ul` com 8 `li`), na ordem dos cartões, e existem mesmo quando o boneco está escondido ("Atrasado"). Tudo que a cena mostra está também nos cartões e na lista "Depende de você": a cena nunca é o único caminho pra nada. Na fase 3, quadro de metas, reunião e "Entregar documento" são botões de verdade nessa mesma ordem de Tab.
4. **Reduzir movimento.** Regras da parte 5. Vale também com o 3D já ligado: se a preferência do aparelho mudar, a cena obedece no quadro seguinte.
5. **Toque.** Alvo de 44 px nas etiquetas e nos botões. O toque no boneco ou na mesa usa a caixa (mesa + cadeira + boneco) projetada na tela, com folga de 6 px; toque que andou mais de 10 px é rolagem da página e não abre nada.
6. **Contraste.** Texto da etiqueta em 4,5 pra 1 ou mais sobre o fundo dela nos 2 temas. Situação nunca só por cor: ícone + palavra na etiqueta, pose + objeto na cena.
7. **Zoom do navegador em 200% ou letra grande do sistema.** A etiqueta cresce até 132 px de largura; passando disso, o apelido corta com reticências e a palavra nunca corta. Se 2 se sobrepuserem, a de trás sobe 38 px.

## 9. Fase 2: ao vivo e linha do tempo (especificação)

**Ao vivo.** Como na parte 6. Quando um ajudante passa de `trabalhando` pra `entregue` ou `resumido` com a cena aberta: comemoração de 1,5 s (2 braços pra cima, cabeça -0.2), depois a pilha surge em 200 ms e a etiqueta troca. Outras passagens trocam pose e objeto em até 400 ms, e andam quando a parte 5 manda. Se chegarem 2 mudanças do mesmo ajudante em menos de 1,5 s, vale a última, sem fila de animações. Com a aba oculta nada anima: na volta, a cena aparece já no estado atual.

**Linha do tempo do dia.** Faixa de 44 px de altura logo abaixo da caixa da cena, só no modo 3D, da largura da cena.
1. Vai de 6h00 a 22h00 do dia de hoje, fuso de Recife. Uma marca por evento, na posição da hora, com a cor de identificação do ajudante e um ícone de 12 px (o da situação em que ele entrou).
2. O controle é um `input type="range"` de verdade (passo de 1 minuto, setas do teclado andam 5 minutos), com `aria-valuetext` "8h17, 2 ajudantes já entregaram".
3. Arrastar pra trás mostra a cena daquela hora: poses e objetos trocam sem andar e sem comemorar. Acima da faixa aparece "Vendo o dia às 8h17. Os cartões mostram agora." e o botão "Voltar pro agora". Soltar não volta sozinho; sem tocar por 30 s, volta pro agora.
4. Tocar numa marca leva o controle àquela hora e destaca a etiqueta do ajudante.
5. Dia sem evento: a faixa aparece vazia com o texto "Nenhuma conferência hoje ainda. A próxima é às 10h19."

Dados: função calculada `escritorio_linha_do_dia(p_dia date)`, mesma tranca da função de estado, sem valor em R$:

```json
{"dia":"2026-11-24",
 "inicio":{"contador":"entregue","cartao":"sem_dados","vencimentos":"entregue","comprador":"precisa_de_voce","auditor":"entregue","presenca":"entregue","folha":"entregue","colchao":"entregue"},
 "eventos":[
  {"hora":"2026-11-24T07:41:00-03:00","id":"auditor","situacao":"trabalhando","palavra":"Conferindo agora"},
  {"hora":"2026-11-24T07:43:00-03:00","id":"auditor","situacao":"entregue","palavra":"Entregue"},
  {"hora":"2026-11-24T08:58:00-03:00","id":"vencimentos","situacao":"trabalhando","palavra":"Conferindo agora"}]}
```

A situação de um ajudante na hora T é a do último evento dele até T; sem evento, a de `inicio`. O app não refaz conta nenhuma: só escolhe o evento.

## 10. Fase 3: lugares úteis (quadro de metas, reunião de segunda, entregar documento; o que cada um abre; o que é enfeite e fica fora)

| Lugar | Como aparece | O que abre (tela que já existe) | Equivalente fora da cena |
|---|---|---|---|
| Quadro de metas | na parede do fundo; texto HTML sobre ele: "N de 8 entregaram", com N de `resumo.entregaram` | o resumo do topo do Escritório: rola pro topo e põe o foco no número "coisas esperando você" | o próprio topo da página |
| Sala de reunião | mesa de reunião; etiqueta "Resumo da semana" | o resumo da semana (Domingo do casal, ficha 11-E item 10) | o atalho que a 11-E já põe na página |
| Entregar documento | botão "Entregar documento" (ícone `file-up`) no canto de baixo à direita da cena | a tela de envio da Tarefa 12 (foto de nota ou fatura), que sempre pede confirmação antes de salvar | o mesmo botão: ele é o caminho principal |

**Reunião de segunda.** Só na segunda-feira, das 6h00 até o resumo da semana ser aberto ou até 12h00, o que vier antes. Vão pra mesa só os ajudantes em "Entregue"; quem está em qualquer outra situação fica onde a situação manda. Na mesa, ficam de pé em volta (4 atrás e 4 nas pontas, a 0,9 m do tampo), e a etiqueta de cada um encolhe pra 1 linha (ícone + apelido, 22 px), empilhada à direita da mesa. A etiqueta da mesa diz "Reunião de segunda: N entregaram". A pilha de folhas continua na mesa de cada um.

**Entregar documento arrastando** (só no computador; no iPhone vale o botão). Ao arrastar um arquivo sobre a cena, a mesa mais perto do ponteiro (até 1,5 m) ganha um contorno de 2 px e o nome dela aparece em "Entregar pro Comprador". Soltar abre a tela da Tarefa 12 com o arquivo já anexado e o tipo escolhido: `comprador` é cupom da feira, `cartao` é fatura, as outras mesas abrem sem tipo. Nada é salvo sem a confirmação daquela tela. Arquivo que a Tarefa 12 não aceita: a recusa é dela, com o texto dela.

**Enfeite, fica fora:** andar pelo escritório com boneco próprio; girar, arrastar ou aproximar a câmera com os dedos; física e objetos que caem; copa, café e bebedouro com animação; luz que muda com a hora do dia; sons; clima na janela; roupas e mesas que o usuário escolhe; bonecos conversando entre si. Móvel parado que ajuda a reconhecer o lugar (planta, estante) pode entrar na peça fixa, até 20 caixas por planta.

## 11. Casos de teste (numerados T-F01..., mínimo 18, com medida exata; inclua: 3D desligado deixa a tela idêntica; 8 de 8 etiquetas iguais ao cartão; queda de contexto volta pro pixel em 1 s; abaixo de 24 quadros por 4 s cai pro pixel; aba oculta para de desenhar; Tab percorre os 8; teste no iPhone de verdade do dono)

Sempre na família Silva, no endereço de rascunho. "Print" quer dizer 390x844 e 1280x800.

| # | Teste | Medida exata de aprovado |
|---|---|---|
| T-F01 | 3D desligado deixa a tela idêntica | print de página inteira antes e depois, tapando só o retângulo do botão: 0 pixel diferente nas 2 larguras e nos 2 temas; altura da página igual, diferença de 0 px |
| T-F02 | 1 fonte de estado | busca no código por cálculo de situação fora de `estado.ts` e do banco: 0 resultado; trocar 1 situação no conjunto de teste muda pixel, 3D e cartão juntos |
| T-F03 | Biblioteca só ao ligar | com o 3D desligado, 0 pedido de rede do pedaço 3D em 30 s de uso; ao ligar, 1 pedido |
| T-F04 | Escolha lembrada | ligar, recarregar: abre em 3D. Desligar, recarregar: abre em pixel. Aparelho novo: pixel |
| T-F05 | 8 de 8 etiquetas iguais ao cartão | em 20 recargas, alternando os 2 conjuntos de teste, o texto da palavra de cada etiqueta é igual, letra por letra, ao sinal do cartão do mesmo `id`: 160 de 160 |
| T-F06 | Enquadramento e etiquetas | nas 2 larguras, com "Conferindo agora" nos 8: 0 par de etiquetas sobreposto, 0 etiqueta fora da caixa, 0 boneco cortado |
| T-F07 | As 7 situações aparecem | conjunto "todas as situações": print mostra as 7 poses e os 7 objetos da tabela da parte 5 |
| T-F08 | Preto e branco | print do T-F07 em tons de cinza, com as etiquetas escondidas: 3 pessoas que não viram a tabela separam 7 de 7 situações; com as etiquetas, 7 de 7 pela palavra |
| T-F09 | Toque leva ao trabalho | tocar no boneco, na mesa e na etiqueta de cada um dos 8: voo de 500 ms (+-50 ms), o cartão certo fica visível e o foco vai pro título dele: 24 de 24 |
| T-F10 | Queda de contexto volta pro pixel em 1 s | `simular('contexto')`: pixel visível em até 1.000 ms, 0 texto técnico na tela, botão em "Ver em 3D"; tocar de novo remonta o 3D |
| T-F11 | Abaixo de 24 quadros por 4 s cai pro pixel | `simular('fps', 20)`: em 2 s a nitidez cai e a sombra desliga; em 4 s (+-1 s) o pixel aparece. Com `simular('fps', 26)`: não cai em 60 s |
| T-F12 | Sem suporte | com `?sem3d=1` e com o pedaço 3D bloqueado na rede: o pixel nunca some e nenhum erro aparece na tela |
| T-F13 | Tetos | pedaço 3D até 250 KB compactado; até 100 chamadas de desenho em qualquer quadro; até 30.000 triângulos; até 60 MB de memória de script depois de 5 minutos |
| T-F14 | Desenhar só quando muda | com os 8 em "Entregue": `quadros()` sobe 0 em 10 s. Com 1 em "Conferindo agora": de 28 a 32 por segundo |
| T-F15 | Aba oculta para de desenhar | esconder a aba por 30 s com 1 ajudante digitando: `quadros()` sobe 0; rolar a cena pra fora da tela: sobe 0; ao voltar, 1 quadro em até 200 ms |
| T-F16 | Liga e desliga 20 vezes | memória de script no fim até 10 MB acima do início; 1 canvas 3D na página, nunca 2 |
| T-F17 | Sombra parada | com todos sentados, 0 refação do mapa de sombra em 10 s; ao trocar o tema, 1 |
| T-F18 | Tab percorre os 8 | com o 3D ligado, 8 Tabs seguidos passam pelas 8 etiquetas na ordem dos cartões; Enter em cada uma abre o cartão certo: 8 de 8; nenhum foco preso |
| T-F19 | Leitor de tela | VoiceOver lê "lista, 8 itens" e, em cada item, apelido, palavra e complemento; o canvas não é lido |
| T-F20 | Reduzir movimento | com a preferência ligada: 0 laço contínuo (`quadros()` sobe 0 em 10 s com alguém em "Conferindo agora"), ninguém anda, sem voo; o toque ainda leva ao cartão |
| T-F21 | iPhone de verdade do dono | no iPhone do dono, pela tela de início: `?medir=1` por 5 minutos mostra menor valor de 50 ou mais; o aparelho não esquenta na mão; bateria cai até 3 pontos; print do resultado |
| T-F22 | Reconhecer sem etiqueta | com as etiquetas escondidas e o conjunto de 24/11, o dono aponta 8 de 8 ajudantes pelo boneco e pelo objeto da mesa |
| T-F23 | Ao vivo (fase 2) | fechar uma conferência em outro aparelho: sem recarregar, a cena e o cartão mudam em até 5 s, com comemoração de 1,5 s (+-0,2 s); 5 de 5 tentativas |
| T-F24 | Linha do tempo (fase 2) | arrastar até 7h42 mostra o Auditor em "Conferindo agora"; em 7h44, "Entregue"; "Voltar pro agora" devolve as 8 etiquetas iguais aos cartões |
| T-F25 | Lugares (fase 3) | toque e Enter no quadro de metas e na mesa de reunião abrem a tela da tabela da parte 10: 4 de 4 |
| T-F26 | Reunião de segunda (fase 3) | com a data de teste numa segunda às 9h00 e resumo não aberto: só os "Entregue" estão na mesa; abrir o resumo manda todos de volta |
| T-F27 | Entregar documento (fase 3) | botão e arquivo solto sobre a mesa do Comprador abrem a mesma tela da Tarefa 12, com o tipo cupom; cancelar não grava nada no banco (0 linha nova) |
| T-F28 | Papéis e dinheiro | logado como Dona Lúcia (`equipe_casa`) e como Bia (`membro`): `escritorio_estado()` responde "sem acesso", 0 linha, e a cena não monta. Logada como Marina (`casal`): a cena e o JSON não têm nenhum "R$" nem número de dinheiro |

## 12. Casos de borda e decisões já tomadas

**Decisões já tomadas (não reabrir sem ordem do dono):**
1. 3D é modo opcional; o pixel é padrão e plano B (decisão 5 do dono). Depois de perder o contexto, o 3D não volta sozinho.
2. As palavras das situações são as da base comum, iguais às do cartão. São 7 situações, incluindo "Aguardando", que a tabela da ficha 11-F não trazia.
3. Câmera de frente e de cima, fixa, nas 2 larguras (escolha deste caderno; espera o "sim" do dono na pergunta 1 da parte 13); 2 plantas, como o pixel. Luz fixa por tema, sem luz por hora do dia.
4. Etiqueta de 2 linhas com a palavra sempre visível; nada de etiqueta só com ícone.
5. Bonecos e objetos em código; three.js fixada em `0.160.0`.
6. O aviso do banco é só campainha; o dado sempre vem da função de estado.

**Casos de borda:**

| Caso | O que fazer |
|---|---|
| Mais gente em "Precisa de você" do que vagas na frente (3 no celular, 6 no computador) | os primeiros da lista "Depende de você" pegam as vagas; os outros ficam de pé atrás da própria cadeira, mão erguida, mesma palavra |
| Tela gira ou a janela cruza 900 px | desmontar e montar com a outra planta, sem animação; a escolha e a câmera geral se mantêm |
| Cena pixel fechada no celular | o botão "Ver em 3D" não aparece e o pedaço 3D não baixa |
| Ajudante com `ativo: false` | mesa e cadeira sem boneco, sem objeto de situação e sem etiqueta |
| Função devolve menos de 8 ou `id` desconhecido | desenhar os que vieram; `id` desconhecido é ignorado e registrado pro dono do produto |
| Situação muda enquanto o boneco anda | termina o trecho atual e segue pro destino novo; nunca atravessa mesa |
| App volta do fundo no iPhone depois de muito tempo | se o contexto caiu: pixel. Se não: reler o estado e desenhar 1 quadro |
| Modo de pouca bateria do iPhone (o aparelho limita a 30 quadros) | não é queda: 30 está acima de 24. Os tetos seguem valendo |
| Papel `membro` ou `equipe_casa` | a função de estado recusa esses papéis (11-C) e a tela do Escritório nem abre pra eles; a cena não decide acesso |

## 13. Perguntas em aberto pro dono (com recomendação) e o que não foi medido

| # | Pergunta | Recomendação |
|---|---|---|
| 1 | A câmera do 3D novo. Opção A: de frente e vista de cima, como o pixel (é o que este caderno especifica). Opção B: na diagonal, como o 3D que o dono já viu; nesse caso, no celular, a etiqueta fica só com ícone e apelido e a palavra da situação sai da cena | Opção A. Na diagonal as etiquetas com palavra não cabem em 390 px (29 px entre vizinhos pra etiqueta de até 106 px), e tirar a palavra quebra a regra "situação = pose + objeto + palavra". Aprovar pelo print do passo 1.8, antes do passo 1.9 |
| 2 | Texto do botão com o 3D ligado | "Ver em pixel". Desligado: "Ver em 3D" |
| 3 | O quadro de metas abre o quê? | O resumo do topo do Escritório. Alternativa: Planejamento, bloco de metas |
| 4 | Vagas na frente: 3 no celular e 6 no computador bastam? | Sim. Mais que isso ao mesmo tempo é raro e a regra de sobra já cobre |
| 5 | Prioridade quando 1 ajudante tem 2 situações (ex.: atrasado e com pendência antiga) | Ficou como a 11-E manda, porque ela é dona do sinal do cartão: "Atrasado" primeiro, depois "Precisa de você" e "Perguntando". A pendência continua na fila "Depende de você". Alternativa, se o dono preferir: primeiro o que depende da casa. Trocar é mudar 1 linha da função de estado |
| 6 | Reunião de segunda: de 6h00 até abrir o resumo ou 12h00 | Sim. Sem resumo da semana pronto, não há reunião |

**O que não foi medido:**
1. iPhone de verdade: quadros por segundo, calor, bateria e memória (só existe medida em navegador sem placa de vídeo), e se ele derruba o contexto ao mandar o app pro fundo por mais de 5 minutos.
2. Tema escuro do 3D (contraste dos bonecos contra o piso e das etiquetas) e leitor de tela (VoiceOver no iPhone, NVDA no Windows).
3. Tamanho real do pedaço 3D depois de empacotado pelo Vite (130 a 190 KB é estimativa).
4. Chamadas de desenho e triângulos da cena final (66, 83 e 6.000 são conta de projeto; o protótipo de enquadramento não tinha bonecos com juntas).
5. Tempo do aviso ao vivo do banco até o aparelho, e quantos avisos o plano do Supabase permite.
6. As 2 tabelas de cor da prévia divergem em tons (a do retrato e a do desenho do personagem); usei a do desenho. Conferir com o dono no print.

## 14. Ordem de serviço pronta pra colar (uma por fase, em bloco de código, pro agente programador: papel, o que ler, o que fazer em ordem, o que não fazer, pronto quando, o que entregar)

```
ORDEM DE SERVIÇO: 11-F fase 1, modo 3D do Escritório
PAPEL: engenheiro de telas com experiência em 3D na web (three.js) e em iPhone.
ENTRA: só depois da 11-E aprovada no iPhone do dono.
LEIA ANTES, NESTA ORDEM: docs/escritorio/00-base-comum.md;
docs/escritorio/LEIA-PRIMEIRO.md, partes 3, 4 e 6; este caderno inteiro
(docs/escritorio/11-F-escritorio-em-3d.md); as partes 6 e 7 de
docs/escritorio/11-E-tela-e-interacao.md (o cartão e o sinal de situação que
a cena acompanha); o Escritório 3D atual (só
a técnica; não copie nome nem valor dele); a cena pixel da tela Escritório,
aberta em 390x844 e 1280x800.
FAÇA, NESTA ORDEM: passos 1.1 a 1.18 da parte 3. Um passo por vez; só avance
com o "pronto quando" do passo cumprido. Use a família Silva e os 2 conjuntos
de teste da parte 6. Trabalhe no endereço de rascunho. Depois do passo 1.8,
pare e mostre ao dono o print da câmera (pergunta 1 da parte 13).
NÃO FAÇA:
- Mudar a cena pixel, a ordem dos blocos, os cartões ou o tamanho da caixa.
- Calcular situação no app: ela vem pronta da função de estado.
- Importar a three.js fora da pasta cena3d, ou carregá-la com o 3D desligado.
- Situação só por cor ou só por luz. Valor em R$ na cena. Aviso técnico na
  tela quando o 3D cai. Nome ou valor de família real em qualquer arquivo.
- Andar livre, girar a câmera, física, arquivo de modelo 3D, luz por hora.
PRONTO QUANDO: T-F01 a T-F22 e T-F28 passam, com T-F21 e T-F22 feitos pelo
dono no iPhone dele.
ENTREGUE: prints antes e depois nas 2 larguras e nos 2 temas, lado a lado;
tabela da parte 7 com os números medidos no lugar das estimativas; print do
resultado de ?medir=1 no iPhone do dono; lista dos arquivos tocados; 1 linha no
histórico de mudanças; como voltar pra versão anterior em 1 clique.
```

```
ORDEM DE SERVIÇO: 11-F fase 2, ao vivo e linha do tempo
PAPEL: engenheiro de telas com experiência em 3D na web e em Supabase.
ENTRA: só com a fase 1 aprovada no iPhone do dono e depois do piloto.
LEIA ANTES: docs/escritorio/00-base-comum.md; partes 6 e 9 deste caderno; o código da fase 1;
as regras de acesso das tabelas escritorio_turnos e escritorio_escala.
FAÇA, NESTA ORDEM: passos 2.1 a 2.6 da parte 3.
NÃO FAÇA:
- Usar o corpo do aviso do banco como dado de tela: ele só manda reler.
- Criar tabela nova: as 2 funções são calculadas na hora.
- Mudar os cartões enquanto a linha do tempo está no passado.
- Animar com a aba oculta. Enfileirar comemorações. Deixar passar valor em
  R$ ou texto de relatório no JSON.
PRONTO QUANDO: T-F23 e T-F24 passam; T-F01, T-F05, T-F10, T-F11, T-F14 e
T-F15 continuam passando; teste de isolamento entre 2 famílias e avisos de
segurança do Supabase zerados.
ENTREGUE: vídeo de 20 s com 2 aparelhos lado a lado; print da linha do tempo
nas 2 larguras; resultado do teste de isolamento; tabela da parte 7 medida de
novo; 1 linha no histórico de mudanças.
```

```
ORDEM DE SERVIÇO: 11-F fase 3, lugares úteis
PAPEL: engenheiro de telas com experiência em 3D na web.
ENTRA: só com a fase 2 aprovada no iPhone do dono, e com o resumo da semana
(11-E item 10) e a tela de envio da Tarefa 12 já no ar.
LEIA ANTES: docs/escritorio/00-base-comum.md; partes 8 e 10 deste caderno; a tela de envio
da Tarefa 12; a tela do resumo da semana.
FAÇA, NESTA ORDEM: passos 3.1 a 3.5 da parte 3. Antes do 3.1, confirme com o
dono a pergunta 3 da parte 13.
NÃO FAÇA:
- Criar tela nova: cada lugar abre uma tela que já existe.
- Salvar documento sem a confirmação da Tarefa 12.
- Deixar algum lugar sem botão equivalente no teclado.
- Qualquer item de "Enfeite, fica fora" da parte 10. Passar dos tetos.
PRONTO QUANDO: T-F25, T-F26 e T-F27 passam; T-F01, T-F13, T-F18 e T-F19
continuam passando; aprovado no iPhone do dono.
ENTREGUE: prints dos 3 lugares nas 2 larguras; tabela da parte 7 medida de
novo; lista dos arquivos tocados; 1 linha no histórico de mudanças.
```

## Dados que acrescentei

Nada aqui muda soma em dinheiro: este caderno não usa nenhum valor em R$.
1. **Situação de cada ajudante da família Silva em 24/11, 9h00.** Agora está na parte 6.1 da base comum. É o mesmo retrato da 11-E (ver lá "O que o retrato da tela supõe"). Copiei da prévia aprovada: Contador, Auditor, Presença, Folha e Guardião em "Entregue"; Cartão em "Perguntando"; Agenda em "Conferindo agora"; Comprador em "Precisa de você".
2. **Horas de `desde`.** Criadas a partir do horário da escala mais 1 ou 2 minutos (ex.: Auditor entregou às 7h43, 2 minutos depois das 7h41). A Agenda está conferindo desde 8h58, por "Rodar agora", já que o horário dela é quarta.
3. **2º conjunto de teste, "todas as situações".** Criado pra exercitar as 7 de uma vez: Presença atrasada desde 23/11, Folha resumida até 01/12, Comprador aguardando a 1ª nota da feira, Auditor precisando de você.
4. **Da prévia aprovada, sem inventar:** apelidos das etiquetas, `id` dos cartões (`m_` + id), cores, cortes de cabelo e objetos de mesa (tabela `P` e rótulos dos retratos da cena pixel).
5. **Campos novos no JSON** que a base comum não lista: `apelido`, `ordem`, `palavra`, `complemento`, `icone`, `desde`, `proxima`, `cartao`, `resumo`, `versao`, `gerado_em`. E a função `escritorio_linha_do_dia`, com 3 eventos de exemplo de 24/11.
6. **Medidas das plantas, das vagas da frente e da câmera,** definidas aqui a partir das posições das mesas no pixel e conferidas num protótipo de enquadramento; e as chaves de `localStorage` `cf.escritorio.modo` e `cf.escritorio.quedas3d`.
