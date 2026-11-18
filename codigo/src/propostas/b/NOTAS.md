# Proposta B · Escritório em primeiro · v2

A primeira tela responde quanto dá para gastar hoje, quanto falta por mês para o Plano 2029 e quem está esperando uma ação. Os funcionários, a sala e o estado de cada posto dão contexto a essas decisões.

## Crítica da v1 e correções

1. **Título desproporcional.** Reduzi de 32 para 20 px no celular e de 40 para 24 px no desktop. O nome do escritório agora divide a barra com o selo Exemplo.
2. **Topo com camadas demais antes de chegar ao desenho.** A faixa virou uma linha curta com estado e botão de 44 px. Os controles de sala passaram para o rodapé da própria cena.
3. **Funcionários pequenos.** Reservei pelo menos 284 px para a área de desenho no celular e 490 px no desktop de 1280. A proposta pede `media` e `grande`. O SVG original aproveita as margens laterais para ganhar escala.
4. **Pisos roxos chapados.** Piso, paredes e roupa usam tons neutros. Apliquei uma linha discreta no tampo das mesas originais para separar os planos. O violeta identifica ação, foco e sala selecionada.
5. **Valores com aparência de cartões independentes.** Os quatro indicadores ocupam as bordas da mesma superfície da cena, sem bordas ou fundos próprios. A seleção da sala realça os rótulos associados.
6. **Plano difícil de localizar.** A lacuna mensal com margem está no topo da cena, junto à disponibilidade de hoje. A cobertura proporcional continua em acompanhamento.
7. **Fila importante longe do polegar.** O celular tem uma folha recolhida com acesso pela faixa e pelo rodapé. A aba traz a contagem de tarefas, que é operacional.
8. **Abrir e fechar a fila precisava funcionar pelo teclado.** O foco vai ao título da fila ao abrir. Escape devolve o foco ao acionador. A folha recolhe ao tabular para fora e ao trocar de dispositivo.
9. **Fila e escritório disputavam espaço.** No desktop, a fila tem até 312 px e abre visível ao lado da cena. Mostra até três tarefas ordenadas por urgência e o link para a fila completa.
10. **Nomes de sala se confundiam com plaquinhas.** Ajustei a posição dos rótulos Caixa e Casa no SVG original. A seleção mantém uma legenda textual com nomes e estados.
11. **Pouca separação entre superfícies no escuro.** Fundo, painel, cena e menu usam #0C0C0B, #131312, #171715 e #1A1918. Divisórias em OKLCH preservam os contornos sem sombra.
12. **Estados incompletos pouco específicos.** A proposta diferencia registro vazio de informação indisponível. O olho mascara números, percentuais e texto livre que possa conter valores. A vista do Assessor da Casa renderiza apenas os tipos domésticos permitidos.

## Dobra medida no laboratório

Medição em Chromium, com fontes locais e o retrato fictício de 17/11/2026 às 11h no Recife. O quadro do laboratório usa 375 × 812 no celular e 1280 × 800 no desktop.

- **Celular, claro e escuro, folha recolhida.** A v1 registrou 4. A v2 registra **5** pelo medidor. São os quatro indicadores da cena e o início da cobertura da meta, que o medidor inclui pelo retângulo do texto mesmo quando o rodapé sobrepõe o cartão. O escritório e seus quatro indicadores ficam inteiros acima da folha.
- **Desktop, claro e escuro.** A v1 registrou 7. A v2 registra **7**, com quatro indicadores na cena e três valores nas tarefas. A cobertura fica abaixo.
- **Celular, folha aberta.** A fila passa à frente da cena. O medidor soma 8 porque inclui os textos atrás da folha. Na captura, ficam visíveis os dois indicadores superiores e os três valores da fila.
- **Olho fechado.** A contagem zera e os valores deixam de aparecer na marcação, inclusive na fila.

## Notas por critério

As notas anteriores são as da v1.

1. **Hierarquia em dois segundos, 9 → 9.** Orçamento e próximo passo aparecem no topo. A cena ocupa a maior superfície. Escalas de títulos e valores se distinguem mesmo no escuro.
2. **Números acima da dobra, 9 → 9.** Cinco e sete pelo medidor, dentro dos limites. A sobreposição do rodapé ainda afeta a leitura da contagem móvel.
3. **Ritmo e espaçamento, 8 → 9.** A cena começa perto de 105 px no celular e de 119 px no desktop. Acompanhamento vem depois do escritório.
4. **Tipografia, 9 → 9.** Geist nos títulos e numerais. Inter nos textos. Valores de 35 e 27 px com algarismos tabulares, sem quebra e símbolo percentual a 65%. As plaquinhas seguem pequenas no SVG original para acomodar todos os postos.
5. **Ícones e ilustrações, 8 → 8.** Lucide indica salas, avatares e níveis de alerta. As ilustrações do projeto reforçam estados vazios. A geometria simplificada continua limitada ao desenho disponível nesta worktree.
6. **Organização por tarefa, 8 → 9.** Faixa, folha e link da fila resolvem a descoberta de pendências. Orçamento e Plano estão na cena. A ação final acontece na ficha do aplicativo.
7. **Acessibilidade, 8 → 9.** Foco visível, contraste dos tokens verificado, controles com pelo menos 44 × 44 px e suporte a movimento reduzido. Falta uma sessão manual com leitor de tela.
8. **Privacidade, 9 → 9.** Valores, percentuais e identificadores de tarefa potencialmente financeiros saem da marcação com o olho fechado. Texto genérico preserva a instrução, com menos detalhe.
9. **Temas claro e escuro, 9 → 9.** A mesma hierarquia funciona em superfícies claras e escuras. O destaque é discreto e os níveis de alerta também têm texto.
10. **Escritório como personagem, 9 → 9.** A cena é o centro da navegação por sala. Legendas e fila ligam as funções a trabalho concreto. A maquete atual ainda mostra postos e poses estáticos.

## Produtização

- Adaptar `useResumoFamilia` para `DadosInicio`, preservando unidade, natureza e disponibilidade. Obter disponível de hoje em orçamento, lacuna com margem em plano2029, previsão em faturas e saldo em guardado. Manter o aluguel líquido identificado como estimado.
- Integrar a maquete da frente f44 pelos parâmetros já enviados. Depois da integração, conferir novamente as duas larguras, a seleção por sala e o posicionamento das plaquinhas. A implementação compartilhada presente nesta worktree ainda renderiza a geometria original e ignora variante e oculto como props adicionais. O contexto de privacidade já protege os valores da proposta. A cena 3D existente pode abastecer a exploração em tela inteira depois de ligar a seleção ao foco de câmera e às fichas.
- Ligar a fila ao motor de tarefas ou a `api.escritorioHoje`. Fornecer assunto público para olho fechado, público permitido e destino da tarefa na origem. Para o Assessor da Casa, consultar as tarefas autorizadas no servidor e abrir a rota Casa.
- Ligar os atalhos de acompanhamento a Planejamento, Lançamentos, Guardado e Desejos via `enderecoDestino`. Aplicar as permissões de `app/rotas` e o contexto de privacidade do aplicativo.

## Validação nesta worktree

- TypeScript com zero erros. Os 12 testes da proposta passaram, incluindo geometria em Chromium, dobra, contraste, alvos de 44 px e privacidade.
- O Vitest rodou com a configuração do projeto carregada pelo Node porque o sandbox negou a leitura do caminho absoluto ao esbuild. A execução completa registrou 1.572 aprovações, 3 testes pendentes e 2 falhas fora da proposta B.
- O teste de rascunho em `ux-cobertura.test.ts` voltou a falhar isolado. Ele espera a etapa de confirmação de gasto, mas o formulário segue para salvar e mostra `Lancar is not a function`. O teste `isolamento.test.ts` para ao carregar a configuração do Vite pelo esbuild, com acesso negado.
