# F67 · Proposta M no celular

Conferi a página inteira no Chrome com toque emulado em 375 × 812 e 390 × 844. A moldura usou toda a largura disponível e ofereceu 812 e 844 px de área útil. A rolagem interna chegou ao último cartão com o menu inferior visível.

- **Abertura.** Saudação, estado do dia e quatro referências em cartões separados. Na amostra, três têm números e Saldo em conta mostra «Ainda sem dado».
- **Escritório.** A cena mediu 552 e 574 px nos dois tamanhos. As setas mudaram a sala. «Ver todos» mostrou 19 postos em uma planta de 940 px. Arrastei a planta e abri uma ficha por toque. O estado de trabalho vem do exemplo.
- **Precisa de você.** O exemplo abriu com a fila vazia. Uma amostra sintética com seis decisões confirmou a fila completa, os cartões de ação e a máscara com o detalhe aberto.
- **Rumo a 2029.** Trilha vertical com quatro marcos, destino e legenda. Conferi em tema escuro com o olho fechado, sem ponto de posição nem trecho proporcional.
- **Motores da família.** Orçamento em largura total, seguido dos pares Aplicações e Imóveis, Receitas e Faturas. Os cinco cartões ilustrados ficaram acessíveis na rolagem.

Em 1280 e 1440 px, comparei o HTML e as medidas do desktop da M com a referência anterior em movimento reduzido. Conferi também a cena WebGL de 440 px e a navegação lateral nos dois tamanhos. A L recebeu blocos móveis com a mesma escala de altura e uma cena maior, com seus controles próprios.

A porta 5199 já servia outra cópia. Usei uma instância temporária do laboratório desta worktree em modo exemplo. Celular físico, leitor de tela e desempenho em GPU móvel ficam por verificar.

**Testes.** `npx tsc --noEmit` com zero erros. Vitest com 104 arquivos, 1.770 testes aprovados e 3 `todo`. Usei a API porque o esbuild bloqueou a leitura de `vite.config.ts` pela CLI. Os testes cobrem altura das seções e do palco, panorama, privacidade, contraste, alvos e geometria desktop.
