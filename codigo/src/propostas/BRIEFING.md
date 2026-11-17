# Quatro propostas para o Início

Crie uma nova experiência de Início para a Central da Família. Ao abrir a tela, a pessoa deve entender o que precisa fazer, quanto pode gastar e como está o Plano 2029. Mostre o escritório e seus funcionários como personagens do produto, com uma função clara na organização da tela.

## Diagnóstico do Início atual

O dono identificou 11 blocos de resumo, mais a seção de envelopes, o ritmo do mês e a lista, todos com praticamente o mesmo peso visual. Muitos números ocupam a primeira tela e alguns aparecem duas vezes. Os títulos são pequenos, a tipografia numérica deixa de indicar prioridades, a faixa amarela de Exemplo aparece repetida no topo e há cartões com faixa colorida na lateral esquerda.

## Entrega de cada designer

- Edite apenas o módulo da sua letra em `src/propostas/<letra>/Proposta.tsx` e seus arquivos locais. Exporte `Proposta` com `PropsProposta` de `../Propostas`. Use os mesmos `dados`, `tema` e `dispositivo` da casca. Use classes com escopo da proposta e sobrescreva tokens em `[data-proposta="a"]`, trocando a letra pela sua. Quando for preciso ajustar a densidade por largura, use o container CSS `proposta` ou a prop `dispositivo`.
- Use o laboratório em `/src/propostas/propostas.html#/a` (troque a letra pela sua). Em **Comparar**, as quatro versões usam o mesmo snapshot, dispositivo e tema. **Atual** dá acesso à referência de exemplo. Confira as duas larguras e os dois temas.
- Leia o contrato em `dadosExemplo.ts` e use os resultados da API fictícia já adaptados, com unidade, natureza e estado. Use o valor com margem como oficial do Plano 2029. Identifique aluguel líquido como estimado. Trate valores vazios e indisponíveis explicitamente.
- Renderize moedas, percentuais e números financeiros sem símbolo com `Valor` ou `NumeroFinanceiro` de `comuns/privacidade`. Use um marcador por ocorrência para a lista medir repetições, inclusive quando a moeda ficar em outro nó. Em gráficos, textos compostos, rótulos acessíveis ou atributos que revelam valores, use `DetalheFinanceiro` ou `useValoresOcultos()`. Confira que o olho tira valores da tela, da leitura assistiva e da lista de medição.
- Use a `EscritorioMaquete` compartilhada ou ilustração SVG própria. A maquete permite destacar Caixa, Casa, Cartões ou Patrimônio e exibir plaquinhas de estado e balões de valor protegidos pelo olho. A frente f38 prepara o escritório 3D.
- Use Figtree Variable (300–900) ou Bricolage Grotesque Variable (200–800), instaladas em 5.3.0, ou escolha sua dupla. Consulte o relatório para ver opções locais e como adicionar uma fonte. Use as referências em `referencias/` para estudar ritmo e organização. Crie uma identidade própria.

## Regras fixas

- Uma cor de destaque por tela. Reserve vermelho para dinheiro em risco. Evite degradê roxo/azul, neon, vidro, texto em degradê e cartões com faixa colorida na lateral esquerda.
- Use ícones Lucide. A área de ilustração pode conter SVG próprio. Emojis e ícones desenhados à mão ficam fora da interface.
- Use números principais de 34–36 px em ambos os dispositivos e secundários de 26–28 px. Aplique `tabular-nums` e `white-space: nowrap`. Mantenha o símbolo de percentual menor e colado ao valor.
- No escuro, comece com fundo `#0c0c0b`, cartão `#131312` e menu `#1a1918`. Misture tons em OKLCH e reserve sombras para o claro.
- Mantenha um H1 por tela, foco visível na cor de destaque, contraste AA e alvos de toque de 44 px. Use avatares redondos de 32 px.
- Use três níveis de alerta com pílulas que nomeiam o nível por extenso. **Dinheiro em risco**, **Operação** e **Lembrete** precisam ser distinguíveis sem a cor.
- Mostre um único selo cinza tracejado **Exemplo**, discreto. Use a classe `selo-exemplo` se servir.
- No topo, use uma faixa de saúde com uma frase de estado, um botão e até um número.
- Busque até 5 números financeiros acima da dobra em 375 × 812 e até 8 em 1280 px. Cada ocorrência visível entra na contagem, inclusive uma repetição. Mostre cada número somente onde ele ajuda a decidir.
- Resuma a lista longa em um cartão com rótulo. Mantenha quatro abas e **Mais** no menu e na navegação inferior.

## Critérios de nota

Dê de 0 a 10 em cada item e entregue a autoavaliação com evidência. O crítico confere nos quatro contextos de tema e dispositivo.

1. **Hierarquia em dois segundos.** A prioridade aparece à primeira vista.
2. **Números acima da dobra.** Registre as duas contagens do laboratório e explique as escolhas.
3. **Ritmo e espaçamento.** A disposição cria grupos reconhecíveis e espaço de leitura.
4. **Tipografia.** Títulos, texto e valores têm papéis distintos e consistentes.
5. **Ícones e ilustrações.** Ajudam a identificar tarefas, estados e áreas.
6. **Organização por tarefa.** A tela responde o que fazer, quanto gastar e como está o Plano 2029.
7. **Acessibilidade.** Contraste AA, foco visível, leitura assistiva e alvos de 44 px.
8. **Privacidade.** O olho oculta valores, inclusive em gráficos, balões e detalhes.
9. **Temas claro e escuro.** A hierarquia, o contraste e as interações se mantêm.
10. **Escritório como personagem.** Os funcionários dão contexto às tarefas e ao estado do dia.
