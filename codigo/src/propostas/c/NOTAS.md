# Proposta C · Jornada do Dia · versão 2

A abertura diz quanto cabe no dia, **Agora** pede uma decisão e **Sua equipe** mostra quem trabalha por trás dos pedidos. **Esta semana** e **O caminho até 2029** completam a leitura. Fraunces Variable mantém a voz editorial da referência Oura e DM Sans Variable sustenta ações e dados.

## As 13 fraquezas que a revisão corrigiu

1. **A porta dizia apenas “bem-vindo”.** A janela ao nascer do sol, o café e o cofrinho contam o começo de um dia que envolve cuidar da casa e do dinheiro.
2. **A ilustração competia com a frase pequena.** No celular, o desenho ganhou uma área própria ao lado do botão do orçamento e o recorte eliminou margem vazia do SVG.
3. **A frase de 64 px quebrava mal no desktop.** A coluna do título comporta “Hoje você pode gastar” em uma linha a 1280 px. O valor tem linha própria de 36 px. A arte se aproxima do bloco de texto sem invadi-lo.
4. **O botão de orçamento dominava todas as decisões.** Continua ao lado da saúde do dia, em contorno. O preenchimento azul dá precedência a **Já fiz** quando há pedido.
5. **Era preciso sair do Início para responder.** O primeiro pedido elegível tem **Já fiz** e **Depois**. Dinheiro em risco vem antes de Operação e Lembrete. As pílulas usam ícone e nome do nível.
6. **Pedidos secundários tomavam o espaço do primeiro.** No celular há um pedido acionável e o caminho para a fila completa. No desktop, até dois outros pedidos aparecem como contexto.
7. **Sumir com o pedido apagaria o contexto do teclado.** A resposta avança a fila, anuncia o que aconteceu, leva o foco à mensagem e permite desfazer da última resposta para a primeira.
8. **Fila vazia parecia falha de carregamento.** “Nenhum pedido para agora” representa uma fila sem itens elegíveis. “Ainda sem dado sobre as tarefas” cobre a indisponibilidade.
9. **O cartão grafite interrompia o papel quente.** A vinheta usa a camada areia do menu no claro e o terceiro nível de superfície no escuro. Seu atalho fica no cabeçalho do cartão, junto do título.
10. **O escritório parecia uma miniatura decorativa.** O SVG ocupa toda a largura interna da vinheta, com quatro salas, oito postos e plaquinhas de nome e estado. A sala do primeiro pedido ganha destaque quando o contrato informa o vínculo.
11. **Contagens de equipe competiam com os dados que ajudam a decidir.** A vinheta fala pelos estados das pessoas. A semana mostra a próxima data disponível até domingo e distingue dados parciais. O total mensal é explicitamente de recebimentos, e o Plano 2029 usa a diferença oficial com margem.
12. **O olho precisava controlar também pistas visuais e textos livres.** Fechado, remove vencimentos, plaquinhas, destaque de sala e a geometria da barra. Os pedidos da casa usam títulos fixos e os demais recebem um rótulo seguro. A privacidade da casca prevalece sobre a prop local.
13. **O escuro precisava de acabamento próprio.** Fundo, cartão e menu partem de #0c0c0b, #131312 e #1a1918. O azul ganha luminosidade e mantém contraste com o texto do botão. Filetes e tintas de ilustração usam mistura em OKLCH. Foco continua visível e alvos têm 44 px.

## Primeira dobra

Medição da casca do laboratório no Chromium, com fontes carregadas e os snapshots fictícios de 17 e 18/11/2026 às 11h no Recife. As contagens a seguir são do quadro de prévia da integração f55, medido pelo retângulo dos textos financeiros.

- **Celular, 375 × 812, claro e escuro.** 1 número financeiro, o limite do dia. A dobra reserva espaço para o primeiro pedido e a entrada do escritório.
- **Desktop, 1280 × 800, claro e escuro.** 1 número financeiro, o limite do dia. Os recebimentos do mês, a cobertura e a diferença mensal com margem do Plano 2029, antes medidos na dobra, aparecem após a rolagem.
- **Olho fechado.** O laboratório mostra “Valores ocultos”. Os marcadores somem e a barra sai do DOM. O Assessor da Casa vê só tarefas operacionais autorizadas, com títulos fixos, sem escritório financeiro, orçamento ou Plano 2029.

Os quatro valores financeiros da página usam o contrato e aparecem uma vez. Datas e o nome Plano 2029 orientam a leitura. Os valores principais e secundários usam respectivamente 36 e 27 px, com algarismos tabulares sem quebra e símbolo de percentual menor.

## Nota por critério do briefing

As notas anteriores foram recuperadas da versão 1. As novas notas avaliam as quatro combinações e penalizam os limites que ainda importam.

1. **Hierarquia em dois segundos · 9 → 9.** Limite e ação prioritária têm papéis distintos. O título ainda consome duas linhas a 375 px.
2. **Números acima da dobra · 9 → 10.** A casca integrada mediu 1 nos dois tamanhos. O Plano 2029 aparece depois da rolagem.
3. **Ritmo e espaçamento · 8 → 9.** O filete liga os capítulos, a arte ganhou espaço próprio e a ordem das ações segue a leitura. Pedidos muito longos podem empurrar parte da maquete para a rolagem.
4. **Tipografia · 9 → 9.** A frase usa 64 px em uma linha no desktop e a escala financeira permanece constante. As plaquinhas do SVG compartilhado ainda são pequenas a 375 px.
5. **Ícones e ilustrações · 8 → 9.** O desenho conta o começo do dia, Lucide identifica ações e alertas, e as figuras decorativas saem da árvore acessível.
6. **Organização por tarefa · 8 → 9.** A primeira resposta acontece em Agora e o destino da fila completa continua explícito. Confirmação e adiamento são locais ao exemplo.
7. **Acessibilidade · 8 → 9.** H1 único, contraste dos tokens verificado por tema, controle de 44 px, foco e status após resposta. A checagem assistiva foi estrutural e pelo foco do navegador.
8. **Privacidade · 9 → 10.** Testes passam tanto pelo olho da casca quanto pela prop local. A checagem cobre dados livres, proporções e a restrição do Assessor.
9. **Temas claro e escuro · 9 → 9.** Superfícies, hierarquia e ações foram conferidas nas quatro combinações. As legendas pequenas da maquete ainda merecem revisão quando chegar o SVG compartilhado novo.
10. **Escritório como personagem · 8 → 9.** A vinheta ficou ampla, com acesso próprio e relação entre sala e pedido. Na versão compartilhada desta worktree, a maquete cobre quatro salas e oito postos. A proposta já envia a variante média e o estado do olho para a revisão em paralelo.

## Como produtizar

- **Limite de hoje.** Adaptar o campo podeGastarHoje de app/useResumoFamilia.ts e os resultados de lib/resumo/orcamento.ts e lib/resumo/leituras.ts. Preservar saudação, relógio local e o destino #/orcamento.
- **Agora.** Usar escritorioHoje.precisa_de_voce como leitura da fila. Para **Já fiz**, mapear a operação de domínio de cada tipo autorizado, validar a permissão na API e repetir pedidos com a mesma chave de idempotência. Para **Depois**, persistir o adiamento pelo mecanismo de lembretes existente, com retorno no prazo definido para aquele tipo. Atualizar a fila após confirmação e oferecer reversão quando a operação permitir. Para Assessor, carregar somente a leitura autorizada de Casa.
- **Esta semana.** Consumir faturas e recebimentos do resumo compartilhado. Filtrar faturas abertas de hoje a domingo e encaminhar a #/cartoes. O previsto mensal leva a #/planejamento. Uma previsão semanal precisa de datas por recebimento no contrato.
- **Plano 2029.** Usar a cobertura e a diferença mensal oficial com margem do cenário garantido em lib/resumo/plano2029.ts. Preservar a cobertura oficial acima de 100% e saturar apenas a barra.
- **Escritório.** Integrar a variante média da maquete compartilhada com os estados de escritorioHoje e useEquipeCompleta. Manter o vínculo com o pedido, o atalho #/escritorio e a alternativa SVG ao escritório 3D. Conferir tamanho e contraste das plaquinhas na nova maquete.
- **Casca e privacidade.** Integrar olho, menu e permissões do app. Expor no contrato um tipo de tarefa e um título seguro para o modo privado e para Casa. Levar ao adaptador os estados de carregamento, indisponibilidade e nova tentativa do resumo.

## Verificação

Os testes da proposta cobrem ordem dos alertas, avanço da fila, adiamento, desfazer, foco, olho, Assessor, vencimento parcial, maquete, alvos e contraste dos temas.

- **TypeScript e Proposta C.** `npx tsc --noEmit` terminou com zero erros e os 26 testes da proposta passaram.
- **Chromium.** As quatro combinações da integração ficaram sem transbordamento horizontal. O SVG compartilhado mediu 301 px de largura no celular e 437 px no desktop. O teste com pedidos cobre avanço, adiamento, desfazer e foco no retorno.
- **Suíte completa.** 1.578 testes passaram, 3 falharam e 3 ficaram pendentes. O comando direto esbarrou no carregamento do Vite pelo esbuild nesta worktree. A execução programática com a mesma configuração fez a coleta completa. As falhas ficaram em `componentes/ux-cobertura.test.ts` na mensagem ao salvar um rascunho, `propostas/b/proposta.test.ts` na sentinela de privacidade da Proposta B e `propostas/isolamento.test.ts` na leitura de configuração negada ao esbuild.
- **Commit.** O Git recusou a criação de `index.lock` no diretório compartilhado da worktree. Os arquivos ficaram em `src/propostas/c/`.
