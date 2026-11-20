# Registro da conversa: como chegamos na proposta clean

Resumo organizado, não a transcrição. Escrito em 19/11/2026. Sem dados reais da família.
A transcrição completa existe no histórico do Claude Code desta sessão (arquivo `.jsonl` da pasta de projetos do Claude); ela não foi copiada para cá por ser enorme e poder conter dados pessoais.

## Para que serve o produto

Gerir as finanças da família, imóveis de investimento, investimentos aplicados e receitas extras, para viver só de rendimentos a partir de 2029.

## Linha do tempo (resumida)

1. **Escritório 3D e funcionários:** o dono queria os agentes "dentro de um escritório, vários trabalhando", como no painel original feito pelo Claude. Foi portado para Three.js (f38).
2. **Início como resumo de tudo:** pediu uma página principal que resuma todas as abas, com números **ligados por código** (não imitados). Nasceu o Resumo da família com 11 blocos e testes de sincronia (f34 a f37, f53 a f59).
3. **Reclamação de design:** "muito número", "tipografia de bloco de notas", "bagunça", "perdeu os funcionários". Pediu skills de design, agentes designers e propostas do zero.
4. **Propostas A a H** no laboratório (`src/propostas/`). Feedback: gostou dos **menus da E**, da **trilha do Rumo a 2029 da D**, do **resumo da F** e acha **essencial o escritório desenhado com todos trabalhando**.
5. **Sínteses I, J, K** misturando essas partes.
6. **Mais espaço + 3D de verdade:** pediu "tamanho necessário", mais dois modelos e escritório em 3D real. Nasceram **L** ("Escritório 3D em palco") e **M** ("Central em duas colunas") e o componente `Escritorio3D` (f60 a f62).
7. **Refino dos personagens:** "M ficou muito melhor, mas os agentes estão feios, com letras em cima". f65 tirou as letras; f66 aproximou a câmera (uma sala por vez no celular).
8. **Celular:** "gostei muito do PC, não do celular; economizou muito; tem que ser mais longo, com mais páginas". Em andamento: f67 (página longa em telas).
9. **Comparativo:** o dono quer duas portas para comparar o que saiu e o que ficou. Ao cruzar, ficou claro que a proposta clean cobre só o Início (ver `INVENTARIO-FUNCOES.md`).

## Decisões e regras do dono (valem daqui para frente)

- Respostas curtas, **sem tabelas**.
- Nada vai para GitHub/Vercel sem ele pedir. Banco e migrações são dele (o Claude só prepara rascunhos).
- Dados reais da família **nunca** vão ao Codex.
- Design: UMA cor de destaque; vermelho só para dinheiro em risco; sem degradê roxo/azul, neon, vidro, emoji como ícone; ícones Lucide; número principal 34 a 36 px tabular; escuro em camadas; alerta em 3 níveis; olho fechado mascara tudo; Assessor da Casa nunca vê dinheiro.
- Codex é **mão de obra para aperfeiçoar o que existe**; o Claude verifica por conta própria (tipos, testes, navegador).
- **Pedido mais recente:** "preciso ter as outras funções nesse sistema". A versão clean não pode descartar abas e funções do app; só melhorar o acabamento.

## Onde está cada coisa

- Branch com todo o trabalho: `final-rodada-codex` (só local; nada enviado ao GitHub).
- Versão antiga: branch `fase-final` no GitHub (o que foi ao ar em 14/11). Ponto de partida do trabalho.
- Propostas: `src/propostas/a` a `m` (cada uma com `NOTAS.md`).
- Escritório 3D compartilhado: `src/propostas/comuns/Escritorio3D.tsx` e cena em `src/telas/escritorio/`.
- Relatórios das frentes do Codex: `codigo/docs/historico/RELATORIO-f*.md`.
- Pendências do banco e do dono: `roteiro-do-dono.md`, `banco/rascunhos-para-revisao/`, `codigo/DEFINICOES-PROVISORIAS.md`.

## O que ainda falta

- Decidir qual proposta vira o Início e **trazer o menu completo** do app para o estilo clean.
- Terminar o celular longo (f67) e olhar o desktop de novo.
- Ligar o Início escolhido aos dados reais (selectors, hooks, privacidade, papéis).
- Levar a linguagem visual às demais abas e fazer nova rodada de auditoria.
- Itens só do dono: repositório privado, cópia do trabalho, backup e migrações do banco.
