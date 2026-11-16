# Atividades dos agentes no mini

> Registro da cenografia de caixas, agora usada como fallback. A versão Kenney, seus contatos medidos, orçamentos, câmeras e validação atual estão em [escritorioMini.md](./escritorioMini.md). Na versão GLB todos os ids ficam sentados; as posturas e contagens abaixo descrevem apenas o fallback anterior.

A cenografia e as câmeras abaixo só entram com `mini: true`. O escritório completo conserva as salas, os enquadramentos, as roupas e as poses legadas. Não foram acrescentadas luzes, texturas ou sombras aos acessórios. O boneco continua voxel/low-poly, usando as roupas de `equipe.ts` e cores já presentes na cena.

## API para a frente do componente

```ts
import type { Cena, EstadoAgente } from './cenaBase'

// A referência vem de montarCena, carregada pelo import() já existente.
function comunicar(cena: Cena, id: string, estado: EstadoAgente) {
  cena.definirEstado(id, estado)
}
```

| Estado | Comportamento no mini |
| --- | --- |
| `trabalhando` | Gesto e objeto da atividade individual, sem sincronismo entre ids. |
| `chamando` | Desacelera o trabalho até parar, vira para a câmera e acena; ponto de exclamação sólido pulsa discretamente. |
| `resolvido` | Joinha durante 1,6 segundo de tempo visível; retorna automaticamente a `trabalhando`. Uma nova chamada interrompe a celebração. |
| `parado` | Consulta o relógio, alonga os ombros ou toma café, conforme o id. |

`definirEstado` não cria geometrias, materiais, câmera, renderer ou personagens. Id inexistente e chamadas depois de `destruir` são ignorados. Repetir o estado atual não reinicia seu tempo. `atualizar` continua aceitando os estados legados: `fila → parado`, `precisa → chamando`, `entregue → resolvido`, `trabalhando → trabalhando`. Snapshots repetidos de `entregue` não repetem a celebração. A API explícita também funciona no escritório completo, com as poses e o percurso legados; a volta automática vale para `definirEstado(..., 'resolvido')`, não para o estado persistido `entregue` do escritório.

A ligação com pergunta pendente/resposta foi deixada para `AgenteDaAba.tsx`, por divisão de frentes. Nenhum dado é lido ou inferido pela animação. Gráficos, células solares, maços e mostradores são ilustrações da função, não valores da família.

## Inventário e orçamento medidos

Medição pelo renderer simulado, usando os objetos reais do Three r160. Contagem por travessia de **toda** a cena de um mini com um funcionário: inclui personagem, bancada, piso, manchas existentes, peças temporariamente invisíveis, indicador e joinha. Cada `InstancedMesh` conta como um mesh, independentemente de seu número de instâncias. Estados não alteram esta contagem. Limite testado: **150**.

| Id | Atividade / objeto principal | Postura | Meshes |
| --- | --- | --- | ---: |
| `contador` | Teclas da calculadora e página articulada sobre pilha de papéis | sentado | 34 |
| `colchao` | Cofre com porta articulada, giro de mostrador e chave | sentado | 33 |
| `tesoureiro` | Carimbo sobe/desce sobre envelopes com selo | sentado | 32 |
| `folha` | Separa cédulas entre maços com cintas | sentado | 30 |
| `comprador` | Sacola com alças e mantimentos, caneta riscando lista | em pé | 37 |
| `fiscal` | Prancheta inclinada, marcação e caixotes com frutas | em pé | 36 |
| `cartao` | Cartão com chip passa pela maquininha, fatura ao lado | sentado | 35 |
| `assistente` | Carteira aberta, ficha distribuída nos compartimentos do mês | sentado | 34 |
| `guardado` | Moeda sobre pilhas e gráfico de barras crescente | sentado | 32 |
| `usina` | Medidor percorre dois painéis com células solares | em pé | 34 |
| `secretaria` | Telefone junto ao ouvido, cabo voxel e escrita na agenda | sentado | 40 |
| `presenca` | Visto percorre as células de uma grade | sentado | 38 |
| `auditor` | Ponteiro conta caixas empilhadas e etiquetadas | em pé | 30 |
| `anfitriao` | Aceno de recepção e organização das fichas no balcão com sino | em pé | 32 |
| `sonhadora` | Folheia mural articulado: casa, viagem e presente | sentado | 34 |
| `analista` | Aponta para quatro mostradores com ponteiros independentes | sentado | 39 |
| `zelador` | Chave de boca gira roda de ajuste | em pé | 36 |
| `protetora` | Arco do cadeado sobe/gira/fecha junto à pasta protegida | sentado | 33 |

`ATIVIDADES_MINI`, em `atividadesMini.ts`, é a tabela id → atividade/objeto/câmera/postura. Cada câmera tem direção própria e volume de enquadramento que inclui cabeça e objeto em 303×128 e 303×180; quem está em pé tem margem vertical maior. Não se altera a direção da câmera do escritório completo.

## Movimento, custo e descarte

- Geometria unitária de caixa e material por cor compartilhados entre acessórios. Partes rígidas do boneco continuam mescladas; apenas olhos e cabelo/coque ganham articulação no mini.
- `InstancedMesh` nas repetições: teclas, folhas, envelopes, cédulas, cintas, frutas, caixotes/caixas, moedas e células solares. Moedas compartilham um cilindro de dez lados; transformações são preparadas na montagem, sem reescrever buffers a cada frame.
- Hash estável por id desloca a fase do trabalho e das microanimações, inclusive quando o mini monta apenas um funcionário. Respiração, piscar, cabelo/coque, vapor voxel e ponteiro do relógio usam um relógio separado do trabalho.
- A primeira amostra abaixo de 24fps congela o relógio das microanimações. O gesto principal continua. Os degraus de DPR/sombra existentes permanecem; depois de entrar em modo leve as microanimações continuam congeladas.
- `prefers-reduced-motion` ou `parado: true`: pose estática da atividade, render imediato sob demanda e **nenhum RAF no mini**, inclusive na montagem, troca de estado, câmera ou resize. A celebração usa um único timeout de retorno, não um loop. Ocultar a aba, perder o contexto ou sair da área visível pausa também esse timeout.
- Sem aba visível/fora da tela não se agenda RAF. Retomar não contabiliza a pausa no FPS, no gesto ou na duração da celebração.
- Todo recurso da atividade entra no mesmo registro de descarte da cena: geometria, material e o próprio `InstancedMesh` (buffers de instância). `destruir` também remove eventos/observadores, cancela RAF/timeouts e libera renderer/contexto. Montagem parcialmente interrompida usa o mesmo caminho.
- `cenaBase.ts` permanece sem import de Three. A nova implementação só é alcançada por `cena3d.ts`, que já está atrás do import() tardio do app.

## Validação

- TypeScript: zero erros (`node node_modules/typescript/bin/tsc -p .`).
- Suíte completa: 568 testes passaram, incluindo os 504 existentes e 64 novos casos, sem JSX e com renderer simulado. Os testes incluem todos os ids, objetos/câmeras distintos, enquadramentos, quatro estados, interpolação, retorno, manutenção das identidades dos recursos, orçamento, microvida congelada em baixo FPS, visibilidade, movimento reduzido, descarte de todos os recursos e montagem interrompida.
- Contraprova: `cena3d.ts` e `cenaBase.ts` foram temporariamente repostos com o conteúdo de HEAD; os **64 casos novos falharam**. A implementação final foi restaurada e os testes da cena reexecutados.
- `npm test` encontrou acesso negado no carregamento de `vite.config.ts`. A execução válida foi pela API `startVitest`, com executor e cache temporários fora do repositório, sem configuração de build, instalação de pacotes ou scripts novos no projeto.
- Inspeção visual WebGL e FPS em celular físico **não realizados**: o host de navegador desta sessão estava indisponível. Os testes de enquadramento usam projeção real do Three e limites da cabeça/objetos; isso não substitui aprovação visual do dono.

Sem mudanças em `AgenteDaAba.tsx`, CSS, `App.tsx`, privacidade, dados, `equipe.ts` ou `Cena3D.tsx`. Sem build, commit ou publicação.
