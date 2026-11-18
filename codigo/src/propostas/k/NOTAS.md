# Proposta K · Central de comando em abas

Três áreas para três perguntas. **Hoje** reúne o limite do dia e as decisões da equipe. **Escritório** mostra quem está cuidando de cada assunto. **Plano** acompanha a meta de viver de rendimentos. No celular, o controle segmentado abre uma área por vez e guarda a última escolha no `sessionStorage`. No desktop, as três trabalham lado a lado, com a coluna central mais larga e o menu em uma faixa lateral.

Abra `/src/propostas/propostas.html#/k` com o Vite em modo exemplo.

## O que entrou na síntese

- **E** — Mantive Bricolage Grotesque com Inter, o verde-folha, os ícones Lucide e a pílula ativa da navegação. A barra inferior vira uma lateral no desktop. O bento ilustrado fica concentrado nos três motores do Plano. Aplicações mostra o rendimento de hoje, Imóveis mostra o aluguel líquido estimado e Receitas mostra o previsto para o mês.
- **D** — Adaptei a mesma curva quadrática de 2026 a 2029. A trilha tem traço sólido de 15 px, marcos fixos, bandeira de destino e ponto branco na cobertura atual. A curva preenche até a proporção informada, limitada às extremidades do desenho. O percentual mostra o valor oficial do contrato, inclusive acima de 100%. A diferença mensal com margem é o valor principal. O cenário sem margem abre em um detalhe e, se os cenários coincidirem, informa isso uma vez.
- **F** — A faixa reúne quatro referências. O limite vira o cartão de 36 px. No celular, a diferença com margem aparece em Hoje e volta a aparecer em Plano ao trocar de aba. No desktop, Hoje mantém o atalho e a cifra fica junto da trilha. A fila mostra uma decisão por vez, em ordem de prioridade, com retrato de 32 px, assunto, valor disponível e ações. Agora, Depois e Feitas permitem localizar as decisões. Desfazer reverte a última ação e volta à posição original. Abrir revela o contexto da prioridade e leva à tarefa correspondente no escritório de exemplo.
- **Escritório compartilhado** — A variante grande ocupa a coluna central no desktop e toda a área útil da aba no celular. A planta geral desenha os 19 postos, com plaquinhas de nome e estado. Sete filtros e o toque nos pisos aproximam as salas. O modo Ampliar deixa a planta rolável para ler os nomes e inspecionar o mobiliário. Cada posto abre uma ficha com sala e estado de hoje. Os botões textuais da sala oferecem o mesmo acesso. Caixa e Patrimônio podem mostrar, respectivamente, o saldo em conta e o valor cadastrado dos imóveis nos balões. Os dois saem do próprio snapshot e só aparecem com a sala selecionada e o valor disponível.

## Hierarquia e linguagem visual

- **Em 2 segundos** — A faixa de estado indica se a equipe espera uma decisão e o cartão verde entrega o limite do dia. No desktop, os títulos ajudam a localizar Escritório e Plano de imediato.
- **Em 5 segundos** — O resumo completa o contexto e a fila mostra a ação de maior prioridade. No celular, basta uma troca de aba para visualizar a equipe ou a trilha.
- **Depois** — É possível percorrer decisões, abrir fichas, explorar os motores e comparar o cenário sem margem.

Bricolage Grotesque dá personalidade aos títulos e distingue as cifras pela forma e pelo peso. Inter mantém rótulos, estados e controles compactos e legíveis. A escala usa 12, 14, 16, 20, 28, 36 e 48 px, com cifras secundárias de 26 px, principais de 34–36 px e percentual com símbolo reduzido. Os números usam algarismos tabulares sem quebra.

No claro, areia `#f2eee4`, papel `#fffdf7` e verde `#34532d`. No escuro, carvão `#0c0c0b`, cartão `#131312`, menu `#1a1918` e folha clara `#b9d6a6`. Bordas e fundos de ilustração usam misturas em OKLCH. Os cantos têm 12, 8 e 6 px. A sombra aparece só no claro. O vermelho identifica dinheiro em risco. Operação e Lembrete trazem nome, ícone e orientação próprios.

## Primeira dobra medida

Chromium com as fontes locais, o CSS da casca, `medirNumeros` e o snapshot fictício de 17/11/2026.

- **375 × 812, Hoje** — 5 cifras no claro e 5 no escuro. São as quatro referências e o valor da decisão em foco.
- **1280 × 800** — 7 no claro e 7 no escuro. Cobertura e rendimento de hoje somam-se às quatro referências e à primeira decisão.
- **Outras abas no celular, tema claro** — Escritório com 0 na vista geral e Plano com 4. Um balão de valor é sob demanda. A abertura explícita do cenário sem margem também pode acrescentar uma cifra.
- As quatro combinações iniciais ficaram sem transbordamento horizontal. O teste conferiu dimensões e nomes dos alvos. A rolagem horizontal da planta ampliada é interna à maquete.

## Autoavaliação

1. **Hierarquia em dois segundos — 9/10.** A faixa e o cartão verde concentram a primeira leitura. O tempo é uma hipótese de design, sem teste com usuários.
2. **Números acima da dobra — 10/10.** A casca mediu 5 e 7 nas vistas iniciais. As referências aparecem uma vez por vista e ficaram dentro do limite.
3. **Ritmo e espaçamento — 8/10.** As áreas se distinguem pela proporção e pelo fundo. Na menor largura, o resumo precisa de duas linhas para preservar os alvos e a leitura.
4. **Tipografia — 9/10.** Títulos, rótulos e cifras têm escalas reconhecíveis. Montantes excepcionalmente longos ainda merecem ensaio.
5. **Ícones e ilustrações — 9/10.** Ícones funcionais e ilustrações distintas nos motores. Os retratos do escritório ajudam a reconhecer o remetente.
6. **Organização por tarefa — 9/10.** O desktop permite cruzar as três áreas. A fila prioriza leitura e ação sobre uma decisão de cada vez, o que exige paginação para revisar muitas.
7. **Acessibilidade — 8/10.** Alvos de 44 px, nomes, foco, contraste e troca de abas por teclado foram verificados. A maquete também tem lista por sala. Falta uma rodada com leitor de tela e aparelhos físicos.
8. **Privacidade — 10/10.** O olho retira cifras, textos livres de tarefas e geometria proporcional do DOM. O papel de Assessor da Casa recebe apenas acesso à área doméstica.
9. **Temas claro e escuro — 9/10.** As duas paletas foram renderizadas nas duas larguras. Os testes calculam contraste AA para os pares de texto e controles.
10. **Escritório como personagem — 9/10.** A equipe ocupa a maior coluna e tem uma aba própria. Na planta inteira em 375 px, as plaquinhas pedem aproximação para leitura confortável.

## Integração com o produto

1. Adaptar `app/useResumoFamilia.ts` à entrada da K, preservando a família autenticada, o papel, o olho e as distinções de `lib/resumo/tipos` entre dado vazio e falha. A composição em `lib/resumo/familia` já fornece limite, aplicações, próximas faturas, imóveis, recebimentos e Plano 2029. Manter centavos e reais explícitos e reutilizar o cálculo oficial de margem. Os vínculos locais entre fila, alerta e funcionário usam chave da tarefa e ID ou nome normalizado do funcionário. Em produção, vale devolver o ID estável do responsável em cada decisão.
2. Usar `useEscritorio` em `app/useDados2.ts` e os seletores de `lib/resumo/pendencias` para a fila integral, disponibilidade e valores. **Já fiz** e **Depois** hoje movem o cartão em memória. O contrato atual de `DadosInicio` não carrega opções autorizadas de resposta, prazo de adiamento, tipo de tarefa nem instruções da ficha. Para ações reais, acrescentar esses campos na adaptação e usar as operações de `useEscritorio` com confirmação, invalidação e desfazer do fluxo correspondente.
3. Integrar o `EscritorioIsometrico` da f38 com `superficie="inicio"` na coluna ou aba. Manter sua carga 3D tardia, o modo só texto, o escopo de papel, a atualização de atividade e a ficha autorizada. A maquete da K pode servir de vista leve quando o 3D não estiver disponível.
4. Navegação final pelo roteador do app. Orçamento abre `#/orcamento`, Faturas `#/cartoes`, Aplicações `#/guardado?secao=aplicacoes` e Casa `#/casa`. Os motores de Imóveis e Receitas podem apontar para `#/guardado?secao=imoveis` e `#/planejamento?secao=recebimentos`. A aba Plano fica no Início e o plano completo segue em `#/planejamento?secao=plano2029`. As fichas usam `#/escritorio?f=<id>` e as decisões usam `#/escritorio?secao=tarefa&entidade=<id>`. Reaplicar as permissões de rota ao integrar cada papel.
