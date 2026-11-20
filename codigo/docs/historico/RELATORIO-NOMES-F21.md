# Nomes informáveis e editáveis — f21

Implementação sobre a worktree `codex/f21-assessor-da-casa`, preservando as alterações que já estavam sem commit. Nenhum dado real foi consultado; todos os testes usam dados fictícios.

## Mapa da busca inicial e resultado por lugar

Busca em `src/api`, `src/app`, `src/componentes` e `src/telas`, incluindo `normaliza.ts`, `normaliza2.ts`, `useMembros.ts`, `Parametros.tsx`, `Ficha.tsx`, `Lancamentos.tsx`, `Casa.tsx`, `Ajustes.tsx` e `escritorio/*`. Foram buscados nomes vazios, `alguém/alguem`, `Alguém do casal`, `Equipe`, `outro adulto`, `outra pessoa`, `convidado`, `pessoa`, `Responsável não identificado`, nomes de titular/dono e autoria omitida. “Outro adulto”, “pessoa” e “alguém” também aparecem legitimamente em explicações, perguntas de primeiro uso e comentários; esses usos não representam uma identidade ausente. O literal “Responsável não identificado” não estava nas telas pesquisadas; o componente e os testes cobrem esse legado se vier do banco.

| Lugar | Onde era anônimo/omitido | O que virou | Gravação e dependência |
|---|---|---|---|
| `app/useMembros.ts` | Erro de consulta ignorado; nome ausente devolvia null sem estado de erro | Estado de falha, “Não foi possível carregar os nomes” e “Tentar de novo”; cache compartilhado por API/família/versão, invalidado ao salvar | Só leitura; alteração de membro no exemplo. Falta RPC de identidade no real |
| `api/normaliza.ts` | `dono`, `dono_nome`, votos/faltantes com nome vazio; lançamento sem autor | Preserva ausência e ids; telas consumidoras oferecem `NomeDaPessoa` | Não fabrica nome nem vínculo. Autoria antiga exige RPC/vínculo |
| `api/normaliza2.ts` | Titular sem nome, `respondido_por`, `feita_por`, `contado_por` ausentes | Telas exibem chamado com id canônico quando existe ou chave local do registro no exemplo | Falta autoria por membro nos registros legados reais |
| `api/real.ts`, avisos da Casa | Fallback `Equipe` | Preserva ausência, sem inventar identidade | Não escreve nomes de acesso; falta RPC |
| `api/exemplo.ts` | Fallback `Convidado`; identidade e referências textuais sem alteração | Grava nome no estado do exemplo; atualiza sessão, membros, convites, cartões, rendas, presença e chamadas pelo primeiro nome | Só memória. Não cria migração |
| `api/exemplo2.ts`, Guardado | Titular traduzido por nomes fixos Ana/Bruno/Cláudia | Resolve nome atualizado na lista de membros | Exemplo; real já consulta membros |
| Ajustes | Nome próprio vazio; lista de convites sem edição; nenhum cadastro geral de membros fora de convites | Nome próprio editável, lista “Pessoas da família”, “Editar nome” em cada membro e convite; erro e repetição de consulta | Membros/convites: exemplo. Real mostra pedido ao administrador. Falta API de convites e relação convite→membro |
| Casa / Assessores / Folha | Assessor ou prestador com nome vazio; nenhum “Editar nome”; saudação vazia; `alguém pôs…` | Chamado compartilhado junto ao cadastro, nome/função em folha própria; autoria dos gastos identificada com ação | Cadastro em `casa_folha`/`casa_prestadores`: real e exemplo via API existente. Nome de acesso: exemplo; falta vínculo com membro no real |
| Início | Saudação vazia; autoria omitida se o nome não fosse encontrado | Nome informável na saudação e no autor de lançamento | Membro/autor: exemplo; falta RPC no real |
| Lançamentos | Autor omitido se não houvesse membro; titular de fatura como `outra pessoa` | Chamado no autor e no titular da fatura | Exemplo; falta RPC de identidade/autoria no real |
| Planejamento / Parâmetros, antigo ponto 168 | `Alguém do casal` no histórico | Nome informável junto à data; não presume quem alterou | Exemplo no registro do histórico; falta id estável de autor e RPC no real |
| Planejamento / Rendas e Ficha do Contador | `dono` textual, ausente ou sem ação | Chamado/edição no dono da renda, sem mostrar valores no formulário | Real e exemplo: `config_familia`, chave `rendas`, campo `dono`. Falta `dono_membro` canônico |
| Ficha: diário, feira, contagem e cartões | Autor omitido; titular ausente | Chamado junto ao registro com chave própria; titular com membro quando disponível | Exemplo. Real depende da identificação canônica e RPC |
| Escritório / relatório | “Respondeu” desaparecia com autoria ausente | Chamado junto ao registro do diário | Exemplo; falta RPC/vínculo real |
| Reajuste | Votos e faltantes com nome vazio | Nome informável por `membro_id` ao lado do voto/faltante | Exemplo; falta RPC no real |
| Cartões / Meu orçamento | `outra pessoa`, dono vazio ou ocultado na ausência de nome | Chamado no titular/dono | Exemplo; falta RPC no real |
| Guardado / Imóveis / Desejos / Recebimentos | `outra pessoa`, titular/dono ausente | Chamado junto ao dono; em cards clicáveis fica fora do botão principal, sem botão aninhado | Exemplo; falta RPC no real. “Do casal” permanece quando a aplicação realmente não tem titular |

`Sem nome` de descrição de lançamento, item de compra, nome de banco/aplicação e outros objetos não representa uma pessoa e continua sendo tratado como descrição de objeto.

## Regras e atualização

`componentes/NomeDaPessoa.tsx` é o único formulário de identidade. `app/useEdicaoNome.ts` centraliza a escolha da API, validação, invalidação de membros, atualização da sessão, versão dos dados e leitura do Escritório. O nome é obrigatório, aparado e limitado a 60 caracteres; nome só com espaços e duplicado de outro membro ativo são recusados com explicação. Casal pode alterar nomes da família; pessoa e assessor somente o próprio membro. O exemplo também verifica permissão na API, não somente no botão.

A edição de um cadastro JSON real não promete alterar o login: o formulário explica essa separação. O modo real não habilita gravação de membro, convite nem autoria antiga sem capacidade explícita na API. RPCs/colunas sugeridas, permissões, validações e limitações concorrentes estão em `DEFINICOES-PROVISORIAS.md`.

O olho fechado mantém os nomes mascarados, não inclui o nome no aria-label do botão de edição e impede abrir campos com conteúdo privado visível. O formulário tem apenas nome e, para assessor, função. Não lê valores para assessores. Os chamados usam o estilo neutro `lnk`, com alvo mínimo de 44 px e foco existente do app.

As falas dos funcionários usam a sessão e referências atualizadas do exemplo; a loja compartilhada do Escritório é relida explicitamente após salvar, sem esperar recarregar a página.

## Verificação

Testes novos em `nome-pessoa.test.ts`, `nomes-formulario.test.ts` e `nomes-varredura.test.ts`, apenas TypeScript e `createElement`, sem JSX nos testes. Cobrem fallbacks, formulário real montado pelo React, privacidade, validação, permissões na UI/API, armazenamento de exemplo, configuração real simulada, falha/repetição de consulta, atualização de lista e fala viva, além de varredura de código.

Mutação feita somente na transformação em memória do Vitest (sem desfazer arquivos da worktree): retirar a ação, ignorar validação/permissão/gravação e injetar fallback novo produziu **23 falhas esperadas**, incluindo a varredura. Com o código normal, os mesmos testes passam.

O comando solicitado `npx vitest run <arquivos>` foi tentado, inclusive com configuração mínima: esbuild recebeu “Acesso negado” ao percorrer diretórios superiores antes de iniciar os testes. A alternativa existente `node scripts/testar-acabamento.mjs <arquivos>` executa a mesma versão do Vitest, com `config:false`, JSX automático, somente `*.test.ts`, sem cache e sem alterar permissões. Não foi usado `npm test`.

Resultado final: `npx tsc --noEmit` com código de saída 0; **59 arquivos aprovados, 1.209 testes aprovados, 3 `todo` preexistentes**, nenhuma falha. A suíte inteira foi rodada novamente após os ajustes finais de presença. `git diff --check` sem erros.

## Commit bloqueado pelo ambiente

Foi executado `git add codigo` na branch `codex/f21-assessor-da-casa`. O Git recusou criar `C:/Users/Romero Albuquerque/Documents/GitHub/central-da-familia/.git/worktrees/f21-assessor-da-casa/index.lock` com `Permission denied`. Esse índice está fora da raiz com escrita permitida para a sessão. Nenhuma tentativa de contornar a restrição foi feita; não há commit criado nesta entrega. As alterações anteriores e novas continuam na worktree. Em um terminal com acesso de escrita ao índice: `git add codigo` e `git commit -m "Permite informar e editar nomes de pessoas na familia"`.
