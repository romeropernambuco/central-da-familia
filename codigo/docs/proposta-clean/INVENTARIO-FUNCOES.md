# Inventário de funções: app completo x proposta clean (M)

Escrito em 19/11/2026. Serve para você decidir o que a versão clean precisa ganhar.
Fonte: leitura do código (`src/app/App.tsx`, `src/propostas/m/`). Conferi o menu e os destinos; **não** testei cada tela.

## Resposta curta

- **Nada foi apagado do app.** As 10 abas e tudo o que elas fazem continuam no código e funcionam na porta 5199, na raiz (`http://localhost:5199/`).
- A proposta clean (M, L) é **só uma nova tela de Início** no laboratório (`propostas.html#/m`). Ela ainda não está ligada ao app.
- O menu da M **não navega para as abas reais**. Os botões Início, Orçamento, Faturas e Escritório só rolam a própria página até uma seção. O "Mais" tem apenas Plano 2029 e Referências.
- Ou seja: se a M virasse o app como está, **as outras abas ficariam inacessíveis**. Foi a escolha do laboratório (só desenhar o Início), mas o resultado visual dá a impressão de que as funções "sumiram".

## Abas do app real (menu atual)

1. **Início**: resumo da família (11 blocos), escritório 3D, rumo a 2029, ritmo do mês, envelopes, placar.
2. **Gastos e entradas**: lista do que foi anotado, correções, desfazer.
3. **Meu orçamento**: hoje, semana e fim do mês.
4. **Casa**: feira, prestadores, gás, folha, estoque.
5. **Desejos**: calculadora do que se quer, quando e se cabe.
6. **Guardado**: aplicações, quanto rendeu hoje, motor de aplicações.
7. **Cartões**: faturas e "E se eu comprar?".
8. **Planejamento**: limites, reserva, rendas e metas.
9. **Escritório**: equipe de agentes, salas, fichas.
10. **Família e ajustes**: quem está na família, aparência, convites.

Fora do menu principal:

- **Anotar** (botão de lançar gasto): é a função mais usada e **não existe na proposta M**.
- **Privacidade** (papel e dados), **Painel do dono** (os 4 números), **Primeiro uso**, **Entrar**.
- **Assessor da Casa** (papel `equipe`): tela única, nunca vê dinheiro.
- Agentes e ajuda por aba (`AgenteDaAba`, `AjudaDaAba`), desfazer, proteção contra erro e backup.

## O que a proposta M cobre

- Início: escritório 3D, fila "Precisa de você", faixa de 4 referências, trilha do Rumo a 2029, cartões de Orçamento, Aplicações, Faturas.
- Privacidade do Início (olho fechado) e papel Assessor da Casa.

## O que a proposta M deixa de fora (a decidir)

- Acesso às abas Gastos e entradas, Casa, Desejos, Guardado, Cartões (tela completa), Planejamento, Ajustes.
- Botão **Anotar** sempre à mão.
- Imóveis e receitas extras como áreas próprias (aparecem só em cartões do Início).
- Ritmo do mês, "até domingo", envelopes e placar do casal (o app atual tem no Início).
- Privacidade, Painel do dono, desfazer visível.

## Como resolver (sugestão, para você decidir)

1. Manter o **menu completo do app** (10 abas) e aplicar nele a **linguagem visual da E** (ícones, pilula ativa, tipografia), em vez de reduzir para 5 itens.
2. Na barra inferior do celular: Início, Anotar (botão central destacado), Orçamento, Cartões, Mais. Em "Mais": Casa, Desejos, Guardado, Planejamento, Escritório, Ajustes, Privacidade.
3. No desktop: barra lateral com as 10 abas agrupadas (Dia a dia, Patrimônio, Equipe, Conta).
4. A M vira só a tela **Início**; cada aba ganha o mesmo acabamento (próxima rodada de design).

## Como comparar nas duas portas

- **5199 (novo):** `http://localhost:5199/` é o app completo atual em modo exemplo. O laboratório com as propostas A a M está em `http://localhost:5199/src/propostas/propostas.html#/m`.
- **5200 (antigo):** `http://localhost:5200/app/` é o build de produção da `fase-final` (14/11), o que foi ao ar. **Pede e-mail e código**, então mostra dados reais depois do login. Não tem modo exemplo.
- A versão antiga em modo exemplo **não sobe**: o código-fonte da `fase-final` tem um erro de importação no 3D antigo (`Cena3D`). Para ver o antigo com dados de exemplo, use a aba **Atual** do laboratório, que mostra o Início do app com as mudanças de hoje, não o de 14/11.
