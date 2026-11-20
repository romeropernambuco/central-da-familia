# F65 — Personagens do escritório

Na vista geral da proposta M, as 19 plaquinhas com ícones e iniciais foram retiradas. Os personagens ganharam rostos, penteados e tons de pele variados, acessórios de função e sombras de contato. Nome e função aparecem em uma única faixa abaixo da cena ao apontar, focar ou selecionar um posto.

Quem trabalha digita diante da tela acesa. Quem ainda vai começar fica sentado com a tela apagada e a caneca à mão. Após uma entrega, o personagem se alonga e relaxa, com um check sobre a mesa. Quem precisa de atenção levanta a mão e recebe um ponto âmbar pulsante. A cena compartilhada do Início usa as mesmas poses. Com movimento reduzido, ela desenha uma pose estática e a proposta M usa o SVG estático.

Conferi a proposta M no Chrome em modo desktop, na página de teste da porta 5199. O servidor estava em outro checkout, então carreguei os módulos deste worktree na sessão do navegador. A vista geral teve **12 chamadas de desenho e 42.260 triângulos**, dentro dos limites de 32 e 45.000. Em Caixa e Patrimônio, usei estados de exemplo para conferir os monitores, a mão erguida e o check. Passei pelo hover, pelo clique, pelo foco, pelo Enter, pelo toque emulado e pelo fallback com movimento reduzido.

Os detalhes dos rostos ficam pequenos na vista geral e se leem melhor ao aproximar uma sala. A validação de toque e o WebGL rodaram no Chrome desktop, com renderização por software. Celular físico ficou fora da verificação. Usei apenas dados de exemplo.

`npx tsc --noEmit` terminou com zero erros. A suíte completa passou com 104 arquivos, 1.761 testes aprovados e 3 `todo`. Executei a API do Vitest com a configuração do projeto porque o esbuild bloqueou a leitura da configuração pela CLI. Os quatro testes novos falharam quando executados contra a implementação anterior.
