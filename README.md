# Central da Família

Painéis de dinheiro da família do Romero, com dados guardados no Supabase.
Leia este arquivo inteiro antes de mexer em qualquer coisa aqui.

## Endereços

| O quê | Onde |
|---|---|
| Parcelas da Família (oficial desde 07/11/2026) | https://romeropernambuco.github.io/central-da-familia/parcelas/ |
| Banco de dados | Supabase, projeto `central-da-familia` (id `kcwaxvvivdckebjmjbkb`, São Paulo, plano grátis) |
| Painel antigo do Parcelas (só exemplos, virou arquivo) | https://claude.ai/artifact/86sps3B7z2KJcKcAN33i4G |
| App novo da Central (produto), quando publicado | https://romeropernambuco.github.io/central-da-familia/app/ |

## App novo da Central (desde 12/11/2026)

| Pasta | O que tem |
|---|---|
| `app/` | O app pronto pra abrir no navegador. É o que o GitHub Pages publica |
| `codigo/` | O código-fonte do app (Vite, React, TypeScript). Pra gerar `app/` de novo: `npm install` e `npm run build` dentro de `codigo/`, depois copiar `dist/` pra `app/` |
| `banco/migracoes/` | Cópia de todas as mudanças já feitas no banco, em ordem de data. Serve de backup da estrutura |
| `banco/sql/RODAR_NO_SUPABASE.sql` | Comandos que só o dono roda no painel do Supabase (apagar e consertar) |
| `banco/funcoes/ia-ler-cupom/` | A função de servidor que lê a foto do cupom |

- O app novo usa a área `produto` do mesmo Supabase. Não mexe nas tabelas do Parcelas (`docs`, `convites` etc.).
- Os dados ficam só no Supabase. Este repositório guarda as telas e a estrutura, nunca os dados da família.
- A chave que aparece no código é a publicável (`sb_publishable_...`). Pode ser pública: ela só abre o que a tranca do banco deixa. A chave secreta nunca entra aqui.

## Regra de ouro: 1 lugar pra cada coisa

1. **Telas:** só neste repositório. Toda mudança vira um commit, então nenhuma versão se perde.
2. **Dados:** só no Supabase. Nunca dentro do código.
3. **Mudar um painel:** editar o arquivo daqui em cima do que existe (mesmas telas, ordem e blocos). Nunca fazer um painel novo no lugar.

## Regra contra duplicar (pedido do Romero, 07/11/2026)

1. **Antes de criar qualquer tabela ou painel, listar o que já existe** no Supabase e neste repositório. Se já existe, usar o que existe.
2. **Cada dado mora num lugar só.** Painel migrado pro Supabase: a página antiga dentro do Claude vira só um aviso "mudou de endereço", sem botão de lançar.
3. **Migração em 3 passos, sempre nessa ordem:** copiar os dados reais da página antiga pro Supabase, conferir que os números batem, só então trocar a página antiga pelo aviso.
4. **Cada conversa cuida da sua parte:** o Escritório da Família tem as tabelas `escritorio_funcionarios` e `escritorio_turnos`; os painéis usam `docs`. Ninguém cria tabela paralela pro mesmo assunto.

Tabelas que existem hoje: `pessoas`, `convites`, `docs`, `docs_historico`, `escritorio_funcionarios`, `escritorio_turnos`.

## Como os dados ficam guardados

Tudo grava numa tabela só, `docs`, com 3 chaves: `painel`, `colecao`, `doc_id`, e o conteúdo em `dados`.

| Painel | Coleções |
|---|---|
| parcelas | compras, cartoes, espera, faturas, painel (doc `config`), resumo (doc `atual`) |
| andreza | ainda não migrado |
| feira | ainda não migrado |
| caixa | vazio até existir 1 Caixa oficial |

Pastas pra olhar no Supabase (mesmos dados, mesmos acessos): `parcelas_dados`, `andreza_dados`, `feira_dados`, `caixa_dados`.

**Resumo pra Central:** o Parcelas grava sozinho em `parcelas / resumo / atual` o livre do mês, o farol, as parcelas do mês, o dia a dia e o "pode comprometer". Quem monta a Central lê esse documento; não refaz a conta.

## Quem vê e quem mexe

| Pessoa | Mexe em | Vê |
|---|---|---|
| Romero | tudo | tudo |
| Andreza | andreza | andreza e feira |
| Givaldo (no lugar de Jobson, desde 11/11/2026) | feira | feira |
| Sem login | nada | nada |

- Só cria conta quem está na tabela `convites`. E-mail estranho é barrado.
- Conta nova: `select public.criar_acesso('email@exemplo.com');` devolve a senha provisória. O painel obriga a trocar na 1ª entrada. Não depende de e-mail (o e-mail grátis do Supabase só manda pro dono da conta).
- Tudo que é mudado ou apagado guarda a versão anterior em `docs_historico`.

## Como o painel fala com o banco

O Parcelas é o mesmo arquivo do painel antigo. Só a camada de salvar e carregar foi trocada (`window.NUVEM` no topo do script), então as contas, telas e regras são idênticas. Regras de cálculo: ver a memória `orcamento-pessoal-casal`.

## Antes de publicar uma mudança

1. Testar numa cópia local com banco simulado (nunca no banco real).
2. Conferir celular (390 px) e computador, sem rolagem de lado.
3. Commit com mensagem clara do que mudou.

## Pendências

- Migrar Orçamento da Andreza e Feira da Casa (precisa do e-mail da Andreza e do Jobson).
- Rotinas "atualiza a Central" e "fecha o mês" ainda leem o painel antigo do Parcelas; trocar pra ler `parcelas / resumo / atual` no Supabase.
- Projeto grátis pausa depois de cerca de 7 dias sem uso: se pausar, os dados ficam; é só reativar.
