# Contexto de produto: Jardim Digital + Banco de Aprendizados

Fase: descoberta (nenhuma linha de código ainda).
Visão de 3 especialistas: Gerente de Produto (o quê e por quê), Designer de Produto (como a pessoa usa) e Arquiteto de Software (como se constrói).

---

## 🧭 Mapa mental

```
                    🎯 PROBLEMA
        salvo muito, uso pouco, esqueço tudo
                         │
🌱 JARDIM ─────── [ SEGUNDO CÉREBRO ] ─────── 📚 BANCO
guarda o que inspira       DO ROMERO       guarda o que aprendi
link, print, vídeo                         ideia + como aplicar
                         │
        🔁 CICLO ─────────────── 📏 SUCESSO
  guardar → entender →        ideias que viraram
  aplicar → revisar           ação, por mês
```

---

## 💡 1. A grande decisão do Gerente de Produto

Os 2 posts parecem 2 produtos. Na prática, são **2 etapas do mesmo ciclo**:

| Etapa | Produto | Pergunta que responde |
|---|---|---|
| 1. Capturar | Jardim Digital | "O que me chamou atenção?" |
| 2. Destilar | Banco de Aprendizados | "O que eu aprendi com isso?" |
| 3. Aplicar | Banco de Aprendizados | "Onde eu uso isso amanhã?" |
| 4. Revisar | Os dois | "O que ficou parado?" |

**Recomendação (atualizada):** dentro da Central da Família, Jardim e Banco viram **2 órgãos ligados**, no mesmo banco de dados e com o mesmo login. Uma referência do Jardim vira aprendizado no Banco com 1 toque. Ver o mapa do corpo inteiro em `central-corpo-humano.md`.

---

## 🌱 2. Produto A: Jardim Digital

### 🎯 Problema
1. Referências boas ficam espalhadas: salvos do Instagram, prints na galeria, links no WhatsApp, abas abertas.
2. Nada é revisitado. O salvo vira cemitério.

### 👤 Quem usa e quando
1. Romero, no **iPhone**, rolando o Instagram à noite. Tem **10 segundos** para guardar, senão desiste.
2. Romero, no **Windows**, no fim de semana, para olhar o mapa e tirar ideias.

### 🔁 Jornada principal
1. Vê um post bom e toca em compartilhar.
2. Escolhe "Jardim" (atalho do iPhone) ou cola o link na caixa.
3. A IA lê, resume em 1 frase, escreve por que vale guardar e escolhe o tema.
4. A referência aparece no mapa, ligada ao tema.
5. Quando 2 temas acumulam referências em comum, aparece uma **ideia** ("escrita e conteúdo têm 9 refs em comum: carrossel?").
6. Referência com mais de 60 dias sem ser aberta entra em "pra revisitar".

### 📊 Números do topo (do print)
Refs salvas, temas, conexões entre temas, ideias geradas, pra revisitar.

### ✂️ Fora da versão 1
1. Compartilhar o jardim com outras pessoas.
2. Importar automático todos os salvos do Instagram (a Meta não libera isso de forma oficial).
3. Ler vídeo inteiro. Na v1, a IA usa título, legenda e o print.

---

## 📚 3. Produto B: Banco de Aprendizados

### 🎯 Problema
1. Curso, livro e palestra entram por um ouvido e saem pelo outro.
2. Não existe registro do que foi **aplicado** de verdade.

### 👤 Quem usa e quando
1. Logo depois de um curso, livro ou reunião, em 1 minuto: fonte, ideia, como aplicar.
2. Domingo, na **revisão semanal**: o que aprendi, o que apliquei, o que fica pra semana.

### 🔁 Jornada principal
1. Toca em "+ novo aprendizado".
2. Preenche 3 campos: **fonte** (livro, curso, palestra, artigo, conversa), **ideia** (1 frase) e **como aplicar** (1 ação concreta).
3. A IA sugere o tema (liderança, negociação, finanças etc.).
4. Quando aplica, marca "aplicado" e escreve em 1 linha onde.
5. No domingo, a revisão mostra: aprendidos na semana, aplicados, parados, e o **tema da semana** (ex.: "Negociação: revise 'ancoragem' antes da reunião de quinta").

### 📊 Números do topo (do print)
Aprendizados, temas, já aplicados (com %), cursos e livros em andamento, semanas seguidas de revisão.

### ✂️ Fora da versão 1
1. Fichamento completo de livro.
2. Flashcards e provas.
3. Integração com Kindle. Fica para a v2.

---

## 🎨 4. Designer de Produto: como a tela funciona

### 🧱 Estrutura (igual nos 2 prints)
1. **Barra lateral**: nome do produto, filtros por tema ou tipo e um contador no rodapé.
2. **Topo**: título, de 5 a 6 números grandes e um selo de status ("17 novas na semana", "revisão de domingo pronta").
3. **Centro**: no Jardim é o mapa mental; no Banco são os cards por tema, com barra de progresso ("9 de 22 aplicados").
4. **Rodapé**: 1 frase de sugestão da IA + o botão principal.

### 🖌️ Linguagem visual (tirada dos prints)
1. Fundo creme, papel, cor de destaque verde-sálvia. 1 cor de destaque por tela.
2. Título com fonte serifada e itálico na 2ª palavra ("Jardim *digital*").
3. Etiqueta pequena de tipo em cada item: post, vídeo, livro, curso, podcast, palestra.
4. Cada tema tem 1 cor suave, usada só no ponto e na barra.

### 📱 Regras de uso
1. **Celular primeiro na captura**: guardar em 1 toque e 10 segundos, sem preencher nada obrigatório além do link.
2. **Computador primeiro na leitura**: o mapa e a revisão são telas de olhar com calma.
3. O mapa no celular vira lista por tema (o mapa não cabe em 390px).
4. Estado vazio: na primeira vez, exemplo pronto ("cole aqui o link do último post que você salvou").

---

## 🏗️ 5. Arquiteto de Software: como se constrói

### 🧩 As peças (o que o sistema guarda)

| Peça | Campos principais |
|---|---|
| **Referência** | link, print, tipo, resumo, por que vale, tema, data, última abertura |
| **Aprendizado** | fonte, tipo da fonte, ideia, como aplicar, tema, aplicado (sim ou não), onde apliquei, data |
| **Tema** | nome, cor, ordem |
| **Conexão** | tema A, tema B, quantas refs em comum |
| **Ideia** | texto, temas de origem, virou ação (sim ou não) |
| **Revisão** | semana, aprendidos, aplicados, tema da semana |

Ligação chave: **Aprendizado.origem → Referência** (é o que une os 2 produtos).

### ⚙️ Pilha (a mesma da Central, nada novo)
1. **Banco:** Supabase, projeto `central-da-familia`, tabela única `docs`. Jardim grava em `painel = "jardim"`, Banco em `painel = "banco"`. Nenhuma tabela nova.
2. **Coleções do Jardim:** `referencias`, `temas`, `conexoes`, `ideias`, `painel/config`, `resumo/atual`.
3. **Coleções do Banco:** `aprendizados`, `fontes` (livro, curso, palestra em andamento), `revisoes`, `painel/config`, `resumo/atual`.
4. **Tela:** páginas `/jardim/` e `/banco/` neste repositório (GitHub Pages), usando a mesma camada `window.NUVEM` do Parcelas. Instaláveis no iPhone pela Tela de Início.
5. **Prints e imagens:** Supabase Storage, bucket privado `jardim-anexos`.
6. **IA:** Claude pela API, chamada por uma Edge Function do Supabase (a chave nunca fica na página).
7. **Ligações entre órgãos:** guardam só a referência `{painel, colecao, doc_id}`, nunca cópia. Ex.: aprendizado com `origem = jardim/referencias/123`.

### 📲 Captura do Instagram: o que dá e o que não dá (pesquisado)
| Caminho | Funciona? | Por quê |
|---|---|---|
| API oficial lendo post de outra pessoa | ❌ Não | A Meta desligou a API de contas pessoais em 04/12/2024 ([fonte](https://developers.facebook.com/blog/post/2024/09/04/update-on-instagram-basic-display-api)) |
| oEmbed (incorporar o post) | ⚠️ Pouco | Desde 2026 não pede token, mas não devolve mais miniatura nem autor ([fonte](https://developers.facebook.com/blog/post/2025/04/08/oembed-updates/)). [confirmar em teste] |
| Robô copiando a página | ❌ Não usar | Proibido pelos termos do Instagram |
| **Atalho do iPhone + print** | ✅ Sim | Compartilhar → Atalho "Jardim" manda o link; o print vai junto e a IA lê a imagem ([fonte](https://support.apple.com/guide/shortcuts/apd7644168e1/ios)) |

**Decisão:** na v1, a captura é **link + print**. A IA lê o texto do print (autor, legenda, ideia). Sem print, guarda só o link e pede o print na revisão.

### ⚠️ Pontos técnicos de atenção
1. Custo da IA: 1 chamada por item salvo. [confirmar: estimativa mensal no piloto]
2. Dados privados, só com o login do Romero.
3. **Exportar tudo desde o dia 1.** O Pocket, da Mozilla, fechou em 08/07/2025 e apagou os dados de quem não exportou ([fonte](https://support.mozilla.org/en-US/kb/future-of-pocket)). Aqui os dados são seus, no seu Supabase, com botão de exportar.

---

## 🔎 5b. Pesquisador: o que já existe no mercado

### 🌱 Para o Jardim
| Produto | Preço | Copiar | Evitar |
|---|---|---|---|
| [mymind](https://mymind.com/) | ~US$ 6/mês [confirmar] | IA classifica sozinha, zero pasta. Modo "Serendipity" devolve item esquecido | Instagram sem suporte oficial |
| [Recall](https://recall.it/pricing) | Grátis; Plus ~US$ 7 [confirmar] | Mapa de conexões automático + perguntas sobre o que salvou | Não lê Instagram |
| [Heptabase](https://support.heptabase.com/en/articles/12990121-pro-and-premium-plans-pricing-faq) | US$ 11,99/mês | Quadro visual de ideias (o "mapa mental") | Tudo à mão, cansa |
| [Obsidian](https://obsidian.md/pricing) | Grátis; sync US$ 4 | Mapa de ligações | Vira "bola de pelos" ilegível |
| [Raindrop](https://help.raindrop.io/ai-suggestions) | ~US$ 28/ano [confirmar] | Barato; IA sugere tag | IA não cria tema novo |
| [Saner.ai](https://apps.apple.com/app/id6738684403) | Grátis; US$ 12 | Feito pra TDAH: a IA lembra por você | Limite baixo no grátis |

### 📚 Para o Banco
| Produto | Preço | Copiar | Evitar |
|---|---|---|---|
| [Readwise](https://docs.readwise.io/readwise/guides/mastery) | US$ 9,99/mês | Revisão curta: no máximo 5 itens, o mais esquecido primeiro; intervalo 7, 14, 28 dias | Mede lembrança, não aplicação |
| [Blinkist](https://www.blinkist.com/magazine/posts/how-much-do-blinkists-premium-subscriptions-cost) e [Shortform](https://www.shortform.com/pricing) | US$ 99,99 e 197/ano | Resumo curto e acionável por capítulo | Vira coleção de resumos sem ação |
| [Anki](https://apps.apple.com/app/id373493387) | Grátis; iOS US$ 24,99 | Repetição espaçada | Serve pra decorar, não pra aplicar |
| Método PARA / Segundo Cérebro ([resumo](https://thomasjfrank.com/productivity/books/the-para-method-by-tiago-forte-summary-and-book-notes/)) | Livro | Organizar por "onde vou usar isso" | Virar só arrumação de pasta |
| Zettelkasten ([fonte](https://zettelkasten.de/posts/concepts-sohnke-ahrens-explained/)) | Grátis | 1 ideia por nota, nas suas palavras | Disciplina diária pesada |

### 🕳️ O buraco que ninguém ocupa
Ninguém mede **aplicação**. Todos medem quanto você guardou ou lembrou. O diferencial da Central é a pergunta "usou?" com a prova de onde usou. Esse é o coração do Banco.

### ✨ 5 ideias que entram por causa da pesquisa
1. **"Por que salvei" na hora:** depois de compartilhar, 1 campo opcional de 1 frase (pode ditar pelo teclado do iPhone). Se pular, a IA sugere. Nenhum concorrente pede a intenção na captura.
2. **Print vira item completo:** a IA lê o print e extrai @autor, tema e ideia. Contorna o bloqueio da Meta.
3. **1 coisa por dia, não caixa infinita:** 1 aviso por dia com 1 item salvo e 3 botões: **Aplicar hoje**, **Adiar**, **Soltar**. Soltar é saudável, não é fracasso.
4. **Prova de aplicação:** aprendizado aplicado ganha data e 1 linha (ou foto) de onde usou. A revisão de domingo mostra só "aprendido e não aplicado".
5. **Mapa podado:** o mapa mostra só os 5 a 7 temas mais ativos do mês e destaca a ligação nova ("este post conecta com o livro X").

## 📏 6. Como saber se funcionou (30 dias)

| Indicador | Meta do piloto |
|---|---|
| Itens guardados | [confirmar: meta] |
| Aprendizados aplicados | 30% ou mais |
| Revisões de domingo feitas | 4 de 4 |
| Ideias que viraram ação | 5 ou mais |

---

## 🗺️ 7. Ordem de construção (fases com trava)

1. **Piloto (Banco primeiro):** registrar e revisar. Mais simples, sem depender do Instagram. Trava: 4 domingos seguidos de revisão.
2. **Jardim:** captura por link e print, com a IA classificando. Trava: 50 referências guardadas.
3. **Mapa e conexões:** mapa mental, ideias automáticas, lembrete de 60 dias.

---

## 🚫 8. O que ainda falta decidir (Romero)

1. Os temas iniciais. Sugestão: finanças da família, negociação, liderança, IA no trabalho, conteúdo, negócio novo.
2. Uso só seu ou com Andreza também.
3. Nome final do produto.
