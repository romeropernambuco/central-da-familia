# f59 — Integração da f53 com a f54

A base comum de `HEAD` e `MERGE_HEAD` é `2bbed9a9acced5ddd73f6a41d648c6f22b48f074`. Os quatro arquivos foram resolvidos no diretório de trabalho a partir dos relatórios das duas frentes e dos diffs de cada lado em relação à base.

## Resolução dos conflitos

1. **`DEFINICOES-PROVISORIAS.md`.** Mantive primeiro as decisões da f53 sobre saldo, faturas e Casa e seus pedidos ao banco. Acrescentei a nota da f54 sobre o compartilhamento das leituras e a ausência de novos pedidos no fim da mesma seção de banco, com um único cabeçalho.
2. **`src/api/protegida.ts`.** A f53 mantém a leitura de feira do Assessor com `semValores: true` e a remoção de `valor` antes de armazenar a resposta no cache. `config` usa a chave `config:${args[1]}`, os argumentos de `args.slice(1, 3)` e `args[3]` como opção para a leitura fresca. Da f54, `futuroEntradas` usa a API pública protegida como receptor, compartilhando o cache de configuração da sessão com Recebimentos.
3. **`src/app/useResumoFamilia.ts`.** Mantive a memoização de cada campo da f54. O Plano 2029 calcula o aviso da f53 com as conferências usadas pela projeção e retira `conferenciasPlano` do valor exibido. A data de hoje, o modo da API e os dados de conferência alimentam o cálculo. O `useMemo` do campo recebe o resultado booleano, preservando sua referência quando chegam novas datas que mantêm o mesmo aviso. `useCampo` retorna `campo` e `repetir`. A tentativa usa o ID da família para invalidar tanto as fontes quanto a leitura do campo e mantém a referência do callback entre atualizações de dados.
4. **`src/telas/inicio/ResumoFamilia.tsx`.** O mapa por chave da f54 aplica as regras da f53 para o título de estouro, os rótulos de feira e estoque da Casa, a linha “A confirmar”, o aviso de 60 dias e o detalhe “Hoje já saiu do limite”. O `BlocoResumo` memoizado mantém os detalhes e ações de cada cartão. Imóveis usa o ícone `imoveis`. A grade começa pelo orçamento na ordem visual, no DOM e na navegação por teclado em todas as larguras. `itensResumo` conserva a ordem de retorno usada por seus consumidores, com saldo e orçamento nas duas primeiras posições.

## Verificação

- `npx tsc --noEmit` terminou com zero erros.
- O teste novo em `src/lib/resumo/familia.test.ts` monta o Resumo com estouro, feira sem registro, estoque sem cadastro e Plano 2029 com ressalva e conferência antiga. Após “Tentar de novo” em Faturas, verifica a recuperação do cartão e a identidade dos campos e das props renderizadas dos outros dez cartões.
- `privacidade-global.test.ts` agora aguarda a montagem do grupo de respostas do `AgenteDaAba`. A espera fixa de 100 ms falhou durante a execução paralela, antes das asserções sobre o olho e os nomes acessíveis. Essas asserções foram preservadas.
- `npx vitest run` e a execução com arquivos explícitos receberam acesso negado do esbuild ao buscar `vite.config.ts`. Executei a suíte inteira pela API do Vitest, com a mesma configuração carregada diretamente pelo Node e o cache de resultados desativado. Para `isolamento.test.ts`, a execução em memória aplicou a mesma forma de carregar a configuração de produção. O arquivo e as asserções do teste de isolamento foram preservados.
- Resultado final em 98 arquivos e 1.699 testes. **1.688 aprovados, 3 `todo` e 8 falhas**. As falhas se limitaram às propostas C (1), D (1), E (4) e G (2), no escopo da f55. Proposta B e `ux-cobertura.test.ts`, incluindo os testes de rascunho, passaram nesta execução. Também passaram `dados-f53.test.ts`, `f54.test.ts`, `privacidade-global.test.ts`, os testes de Resumo e `isolamento.test.ts`.

## Estado do merge

`MERGE_HEAD` permanece ativo. A busca pelos marcadores de conflito nos quatro arquivos não encontrou ocorrências. O Git recusou a atualização do índice por falta de permissão para criar `index.lock`, por isso o índice ainda lista os quatro arquivos como não mesclados.
