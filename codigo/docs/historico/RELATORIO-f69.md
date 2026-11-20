# F69 · J no Início da Central

A raiz abre o Início J. As quatro referências e os cartões usam `useResumoFamilia`, e a trilha usa a projeção oficial Garantido. O escritório tem 19 postos para o casal, com foco por sala, zoom e Ampliar. Three e a cena carregam quando o visor fica visível. O SVG mantém os postos acionáveis sem WebGL ou com movimento reduzido.

**Precisa de você** usa a fila compartilhada com Escritório. Na ficha, as respostas disponíveis para a tarefa, como **Já fiz** e **Depois**, usam a API existente e atualizam a fila pela releitura. **Abrir** leva à aba do funcionário e **Ver histórico** leva ao diário na ficha do Escritório. O olho mascara valores, textos privados e a geometria da cobertura. A pessoa da família continua com o próprio orçamento e os destinos autorizados. O Assessor da Casa abre Casa, com Anotar compra e acesso à sua Privacidade.

## Funções que continuam acessíveis

- **Início** — quatro referências, 11 blocos do resumo, saldo e Informar saldo, aplicações, faturas, recebimentos, imóveis, movimentação do mês, desejos, Casa e pendências. Dívidas continuam com a indicação de cadastro ausente nessa visão. Permanecem ritmo do mês, orçamento até domingo, envelopes, placar do casal, plano com e sem margem, últimos lançamentos, reconsulta e Anotar. O Início anterior está em `/?como=bruno#/inicio-classico` no exemplo do dono.
- **Gastos e entradas** — listagem e filtros, totais, correção, exclusão e desfazer. No celular, abre em **Mais**.
- **Meu orçamento** — hoje, semana, projeção do fim do mês, ritmo e envelopes.
- **Casa** — feira e nota, compras, estoque, gás, prestadores, presença e folha.
- **Desejos** — calcular se cabe, quando cabe e acompanhar o que foi combinado.
- **Guardado** — aplicações, rendimento, simulação, movimentações, motor de aplicações e imóveis.
- **Cartões** — cadastro, faturas, conferência, compras e simulador **E se eu comprar?**.
- **Planejamento** — limites, reserva, saldo, rendas, receitas previstas e extras, parâmetros, cenários e metas de 2029.
- **Escritório** — salas, equipe, tarefas, cadastros dos funcionários, lembretes, histórico, correção e relatório.
- **Família e ajustes** — membros, nomes, convites, aparência, modo dos funcionários e cópia de segurança.
- **Privacidade, Painel do dono, Anotar, Entrar e Primeiro uso** — continuam nas entradas autorizadas. Agentes, ajuda por aba, proteção, rascunhos e desfazer permanecem disponíveis nos fluxos correspondentes.

## Verificação

- Chromium, modo exemplo na porta 5199, em 375 × 812, 1280 × 800 e 1440 × 900, em claro e escuro. Percorri as dez abas, Privacidade e Painel do dono pelo menu. Abri Anotar, filtrei a sala Cartões, usei zoom e Ampliar, abri a ficha de Cartões e segui seu destino. A fila fica na lateral no computador e abre sob a cena no celular. O Assessor abriu Casa nos seis cenários e um endereço de Guardado voltou para Casa.
- O navegador mostrou 19 postos, com 9 chamadas de desenho e 38.344 triângulos no enquadramento inicial, abaixo dos limites de 32 e 45.000. Conferi o SVG com WebGL indisponível e com movimento reduzido, o histórico, o clássico e a máscara da trilha.
- A suíte percorre o menu por papel, confere a referência, os cartões e a trilha contra as leituras das abas e exercita as respostas, a máscara, a ficha e o carregamento sob demanda. Usei dados fictícios. Celular físico, GPU móvel e sessão real com banco ficaram fora da verificação.
- `npx tsc --noEmit` terminou com zero erros. A suíte completa aprovou 1.784 testes em 104 arquivos, com três casos `todo`. A CLI do Vitest teve a leitura da configuração bloqueada pelo esbuild. A execução pela API usou o plugin React e o cache desativado.

Entrega no worktree, sem commit ou publicação.
