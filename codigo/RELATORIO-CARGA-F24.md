# Carga inicial F24

Data: 16/11/2026. Somente dados fictícios do modo exemplo; sem migrações ou acesso ao backend.

## Resultado e método

Build de produção **com `mode: exemplo`**, não o servidor de desenvolvimento. Existe `build:exemplo` no package.json. Baseline reconstruída do HEAD original por um plugin temporário de leitura dos arquivos originais, sem desfazer a worktree; mesmos Vite 5.4.11 e opções nos dois builds. Preview Vite em 127.0.0.1:5275 (antes) e :5274 (depois). Chrome headless 157, viewport 375 × 812, DPR 1, cache HTTP desativado via CDP, sem service worker, sem throttling. Navegação `?como=ana`, seguida de Cartões → Casa → Início → Escritório → Início, 1,2 s entre abas. Scripts e perfis de teste temporários ficam fora do commit.

| Medida | Antes | Depois |
|---|---:|---:|
| Bootstrap index, KB no disco / gzip | 3,55 / 1,87 | 3,56 / 1,87 |
| Chunk partida (React + App), KB no disco / gzip | 720,65 / 223,91 | 433,24 / 141,24 |
| Banco fictício exemplo, KB no disco / gzip | 85,41 / 27,55 | 85,46 / 27,57 |
| Three tardio, KB no disco / gzip | 509,95 / 129,43 | 509,95 / 129,43 |
| Cena tardia, KB no disco / gzip | 58,39 / 22,74 | 58,40 / 22,75 |
| Loader GLB tardio, KB no disco / gzip | 45,80 / 13,87 | 46,04 / 13,97 |
| First paint | 72 ms | 40 ms |
| First contentful paint | 108 ms | 40 ms |
| Cabeçalho #titulo-tela inserido no DOM | 143,4 ms | 140,7 ms |
| Pedidos de GLB no percurso | 75 | 25 |
| URLs GLB distintas | 25 | 25 |
| Maior número de pedidos da mesma URL | 6 | 1 |
| Falhas de rede / pedidos externos | 0 / 0 | 0 / 0 |

KB = 1.000 bytes, medidos dos arquivos gerados; gzip calculado com node:zlib. O reporter do Vite apresenta 717,96 → 432,20 kB para partida; a tabela usa bytes efetivos no disco. Redução de aproximadamente 40% no JS de partida e 37% no gzip. São amostras locais, não percentis nem benchmark de celular físico: não reproduzi vários segundos de branco em produção local. O primeiro conteúdo depois é a marca/status em HTML; o tempo do cabeçalho é outra métrica, não TTI nem prova de que todas as leituras terminaram. Uma medição intermediária teve FCP 64 ms e cabeçalho 216,6 ms, ilustrando a variação e o custo do encadeamento lazy.

## O que carregava e o que mudou

O main já era pequeno: carrega relógio fictício antes de partida e mantém o tratamento de falha. O problema do pacote estava em App: importava todas as telas, formulários, backup e dependências financeiras na mesma partida. Agora as telas e a folha de Anotar usam React.lazy/import() com Suspense. Entrar permanece imediato, pois é o primeiro conteúdo de quem não está autenticado. Rotas e permissões continuam avaliadas antes da montagem.

O manifesto confirma que partida tem somente index como import estático; as telas são entradas dinâmicas. Os cartões PrecisaDeVoce e CartaoGuardado foram separados para o Início não importar as telas completas de Escritório e Guardado. A função ir mudou para rotas.ts, com reexport compatível, evitando que módulos de telas importem o App.

Three já era tardio e continua assim: não entrou no bootstrap ou em partida. Ainda pode ser solicitado na abertura quando o mini do agente está visível, por decisão existente do modo Completo. Não escondi nem removi o agente para produzir a redução. Decimal/motor e insights ainda integram o grafo financeiro usado pelo agente inicial e pelo cartão de 2029 do Início: não alego que todo cálculo financeiro tenha sido retirado da abertura. Backup e telas não visitadas ficam atrás das rotas.

Também executei build de produção normal: partida 421,57 kB no reporter, gzip 136,91 kB; Three continua 509,95 kB / 129,43 kB. Não abri backend real para medir esse modo.

## Cache e descarte 3D

Já havia um singleton com promessa e contador de usuários, mas ele apagava o modelo ao sair da última cena. As trocas de aba repetiam fetch e parse. Agora há dois níveis: bytes locais bem-sucedidos retidos em memória, e modelo decodificado/promessa compartilhados apenas entre leases ativos. Os 41 arquivos do inventário somam 430.904 bytes, sem dados de família. Não há cache persistente novo. Falhas de download/parse não ficam memorizadas e permitem nova tentativa.

Enquanto N cenas usam uma URL, há um fetch e um parse. Cada instância de escritório clona o grafo e gera suas próprias geometrias fundidas/instanciadas e materiais, registrados no destruidor da mini-cena. Os clones temporários leem os recursos compartilhados, sem alterá-los nem descartá-los individualmente. O último lease libera geometria, materiais e agora também texturas do original, deduplicados por Set. Uma cena sair não invalida as outras. Ao voltar depois de zero usuários, há novo parse dos bytes retidos, necessário porque os recursos anteriores foram descartados; não há novo download. Cargas abandonadas são abortadas e resultados tardios descartados.

Os GLBs atuais não têm imagens/texturas (teste do inventário). O descarte de texturas protege também futuros modelos. O cache não contém valores, identidades ou estados de família. `esquecerBytes()` é uma limpeza explícita permitida somente sem leases ativos, usada para isolar os testes que simulam rede quebrada.

Testes existentes validam 12 abas × 4 perfis, 20 trocas, descartes, falhas, rollback, privacidade, contato e limites de **40 draw calls, 60.000 triângulos e 150.000 bytes de GLB por mini**. Elenco de gestão medido em 40 desenhos e 5.467 triângulos; caixa em 32 desenhos e 3.762 triângulos. Nenhum modelo ou orçamento foi ampliado.

## Rede e erro sem URL

Não reproduzi ERR_CONNECTION_REFUSED no app durante o percurso mobile. Inspecionei fetch, URLs http(s), localhost/127.0.0.1, WebSocket, sendBeacon, imagens, CSS/fontes, scripts/sw.mjs, src/sw.modelo.js, partida e seleção da API:

- API exemplo escolhe exclusivamente o módulo em memória; o import de real/Supabase é eliminado nesse build.
- O fetch de backend/Edge Function está em api/real.ts, não executado em exemplo.
- Fontes vêm de @fontsource e são assets locais. Nota fictícia usa data URL; fotos são dados locais.
- wa.me é link acionado pelo usuário, não requisição automática.
- GLBs usam BASE_URL e nomes validados, sem CDN/Draco remoto.
- SW não é registrado em modo exemplo; o gerador exclui GLBs e chunks Three/cena/loader do precache. Fetch do SW é restrito à pasta da aplicação, sem dado de backend em cache.
- No preview não há cliente HMR do Vite nem conexão com outra porta. A lista CDP teve somente a origem do preview, zero Network.loadingFailed.

Logo não atribuo causa à mensagem original. Em dev, um websocket HMR de um servidor parado é uma hipótese, não uma causa confirmada. Não alterei URLs sem evidência.

## Carregamento e validação

HTML inicial já contém a marca, “Abrindo a Central da Família...”, role=status e aria-live=polite antes de qualquer JS. CSS inline reserva a altura da viewport e adapta a paleta escura. Sem animação, portanto respeita prefers-reduced-motion. React usa o mesmo conteúdo na espera inicial e nas rotas, com espaço mínimo reservado. Layout das telas tem alturas diferentes; não afirmo CLS zero nem que Suspense elimina todo deslocamento. ProtecaoCarga mostra falha com Tentar de novo se um chunk lazy falhar depois da abertura, preservando também o tratamento original do main.

A suíte revelou useAdultos atualizando estado depois da desmontagem durante trocas rápidas. Adicionado cancelamento lógico no cleanup, tanto para sucesso quanto rejeição.

Todos os quatro casos novos foram executados vermelhos antes das respectivas correções: cache/textura e HTML/lazy; sucesso/rejeição tardios de useAdultos. Testes são *.test.ts, sem JSX. Os testes de mini existentes receberam apenas limpeza explícita dos bytes no beforeEach, conservando as simulações e asserções de falha.

- `npx tsc --noEmit`: zero erros.
- Suíte completa: 65 arquivos, 1.256 testes aprovados, 3 todo existentes, zero falhas/erros não tratados.
- Builds exemplo e normal concluídos.
- `git diff --check`: sem erros.

Restrição do ambiente: `npx vite build --mode exemplo` e a carga convencional do vite.config.ts falham no bundler de configuração com “Cannot read directory ../../../../..: Acesso negado”. Os builds foram executados pela API build do Vite com configFile:false, base './', outDir correspondente, manifesto e o mesmo gravarSw. Sem mudanças no Vite/configuração versionada. Para Vitest, a CLI foi executada com workspace JSON temporário, extends:false, root absoluto de codigo, include src/**/*.test.ts, cache:false e testTimeout 30000; assim não precisa empacotar vite.config.ts. Comando, dentro de codigo:

```powershell
$arquivosF24 = rg --files src -g '*.test.ts'
npx vitest run $arquivosF24 --root .. --workspace ../.f24-workspace.json --cache false --maxWorkers 2 --minWorkers 1
npx tsc --noEmit
```

Nenhum npm test, dado real, migração, dist ou cache de Vitest incluído no commit.
Commit: git add codigo e git commit foram tentados; ambos bloqueados ao criar .git/worktrees/f24-carga-inicial/index.lock (Permission denied). Alterações preservadas na worktree, sem commit. A revisão automática também rejeitou a limpeza final de arquivos temporários; esses arquivos ficam fora de codigo e do commit.
