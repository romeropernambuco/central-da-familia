# Proposta L · Escritório 3D em palco

O Início apresenta quatro referências e leva direto à equipe. O escritório tem a largura útil da página, com 528 px de altura no celular e 640 px no desktop. A fila inteira, o Rumo a 2029 e os cinco motores seguem em seções independentes.

## O que veio das referências

- **E** · Menu inferior com Início, Orçamento, Faturas, Escritório e Mais, pílula ativa, tipografia Bricolage Grotesque + Inter e bento com ilustrações em musgo. Na L, o menu continua ao alcance no desktop e abre as seções da própria prévia sem alterar `#/l`.
- **F** · A faixa mantém limite diário, diferença mensal com margem, total aplicado e previsão de faturas. A fila mantém **Já fiz**, **Depois** e **Abrir**. Cada pasta mostra todos os seus itens, com risco primeiro e ações reversíveis na sessão. **Abrir** revela a orientação e dá acesso à ficha quando o remetente é identificável.
- **D** · A trilha grossa tem os marcos de 2026 a 2029, a cobertura em **Você está aqui** e a bandeira **Viver de rendimentos**. A cobertura vem do plano e os anos dão contexto de calendário. O olho remove o trecho preenchido e a posição do marcador.
- **I, J e K** · A lista legível por sala acompanha os postos do palco, o foco segue a navegação e o orçamento pessoal tem um escopo próprio. As ações e o estado da fila são locais ao laboratório.

## Hierarquia

- **2 segundos** · A saudação situa a pessoa. O cartão musgo da faixa responde quanto pode gastar hoje.
- **5 segundos** · A faixa de estado aponta a fila e o escritório mostra onde a equipe está trabalhando. Os filtros aproximam uma sala e as fichas mostram o estado registrado de cada pessoa.
- **Depois** · A fila resolve decisões, a trilha mostra a cobertura da meta de renda e os motores detalham cada fonte. O bento usa disponível até domingo, rendimento de hoje, aluguel líquido estimado, recebimentos previstos e maior fatura com valor disponível. Cifras iguais têm uma ocorrência na vista, com prioridade para a faixa e a pasta aberta.

## Fontes e paleta

Bricolage Grotesque Variable nos títulos e algarismos e Inter Variable no texto e nos controles. Cifras principais de 35 px, secundárias de 27 px, algarismos tabulares sem quebra e símbolo de percentual menor.

No escuro, fundo `#0c0c0b`, cartão `#131312`, menu `#1a1918` e palco `#1b2118`. O destaque musgo é `#c0d6a7`. No claro, fundo `#f5f4ef`, cartão `#fffdfa` e musgo `#40582d`. O vermelho indica dinheiro em risco. Os demais alertas têm ícone e rótulo textual. A L adota escuro quando montada sem tema. A casca compartilhada inicia em claro e passa esse tema explicitamente.

## Escritório no palco

`Escritorio3D` recebe os funcionários do snapshot, altura, variante grande, sala em foco, plaquinhas, papel, privacidade e seleção. Os botões dos postos e a lista de equipe abrem a mesma ficha modal, com nome, sala e estado de hoje. Enter ou Espaço abre a ficha. Escape fecha e devolve o foco ao controle de origem. O estado ausente aparece como **Ainda sem dado**. A animação depende do estado registrado. A lista doméstica do Assessor usa rótulos controlados para tarefas da Casa.

Nesta worktree, a API compartilhada exibe o fallback isométrico SVG. A panorâmica móvel desse fallback rola dentro do palco para preservar os alvos. A frente f60 substitui o renderizador compartilhado pela cena real em Three.js sob a mesma API. A L já entrega ao componente a altura do palco, o foco por sala e o callback de seleção.

## Autoavaliação

1. **Hierarquia em dois segundos · 9/10.** Saudação e limite de hoje lideram. O tempo de leitura ainda é uma hipótese.
2. **Números acima da dobra · 9/10.** O medidor da casca contou quatro cifras em 375 × 812, 1280 × 800 e 1440 × 800 nos dois temas. A primeira dobra usa as quatro referências da F.
3. **Ritmo e espaçamento · 8/10.** O palco ganha área própria. A equipe inteira usa rolagem interna em celular para poupar espaço entre palco e fila.
4. **Tipografia · 9/10.** Títulos, cifras e legendas têm pesos e tamanhos distintos. A checagem de encaixe cobriu os valores do exemplo.
5. **Ícones e ilustrações · 9/10.** Lucide nos controles e cinco figuras decorativas para leitura rápida dos motores.
6. **Organização por tarefa · 9/10.** A fila completa conserva adiamentos e conclusões na sessão. O texto curto disponível em `DadosInicio` limita a orientação de cada decisão.
7. **Acessibilidade · 8/10.** Chromium verificou alvos de 44 px, nomes, contraste dos pares de cores principais, movimento reduzido e a abertura da ficha pelo teclado. Falta teste com leitor de tela e celular físico.
8. **Privacidade · 9/10.** Os testes injetam moeda, percentual e razão no assunto e conferem a marcação, a trilha e a vista do Assessor.
9. **Temas · 9/10.** Os dois temas passaram pela mesma verificação de geometria, contraste e primeira dobra.
10. **Escritório como personagem · 8/10.** Os 19 postos do exemplo têm ficha e estado. A experiência WebGL aguarda a f60 e o fallback panorâmico exige deslize no celular.

## Como levar ao produto

1. Adaptar a saída de `useResumoFamilia` com os seletores de `lib/resumo` para o contrato de apresentação. Preservar unidade, natureza, escopo e estado das fontes de orçamento, guardado, faturas, imóveis, recebimentos e plano. Continuar usando a diferença mensal oficial com margem e a cobertura oficial. Usar a releitura de cada fonte para recuperação de erros.
2. Ligar a fila autorizada a `useEscritorio` e às funções de `lib/resumo/pendencias`. Usar IDs estáveis de tarefa e responsável. Conectar as mutações de **Já fiz** e **Depois** às opções do produto, atualizar os dados após a resposta e usar o fluxo de correção disponível para **Desfazer**. Levar **Abrir** ao formulário ou registro autorizado.
3. Integrar `EscritorioIsometrico` com `superficie="inicio"` no palco, reaproveitando o carregamento tardio de Three.js, o filtro por papel em `dadosIsometricos`, as atividades, a lista de contingência e as fichas autorizadas. Conectar o foco por sala e manter o retorno de foco ao posto.
4. Substituir os destinos locais pelo roteador do app e ligar o olho ao estado de privacidade de `useApp`. Aplicar o papel antes de consultar dados financeiros e preservar a máscara em texto livre, nomes acessíveis, gráficos e detalhes.

## Verificação

- `npx tsc --noEmit` terminou com zero erros. Passaram os 10 testes da L e os 18 testes direcionados à maquete compartilhada e à cena isométrica.
- O esbuild recebeu acesso negado ao carregar a configuração pela CLI do Vitest e ao otimizar dependências no servidor de desenvolvimento. O Vitest executou pela API com JSX automático e cache desativado. A rota do laboratório abriu em Chromium com uma compilação temporária da entrada em modo exemplo e a condição de desenvolvimento habilitada.
- A rodada combinada aprovou 148 testes em 11 arquivos, incluindo as propostas B, C, D, E e G, a cobertura de interações e o isolamento. O isolamento atingiu o limite inicial de cinco segundos e passou com os 30 segundos da configuração do projeto.
- O Git bloqueou a criação de `index.lock` no diretório de metadados da worktree. Os arquivos da L ficaram salvos localmente.
