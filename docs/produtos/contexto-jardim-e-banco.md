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

**Recomendação:** 1 produto só, com 2 telas principais e o mesmo banco de dados. Uma referência do Jardim pode virar um aprendizado no Banco com 1 toque. Separados, viram 2 lugares para esquecer coisas.

Nome provisório: **Jardim** (com as áreas "Referências" e "Aprendizados"). [confirmar: nome final]

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

### ⚙️ Pilha recomendada
1. **Banco e login:** Supabase (já está entre as ferramentas conectadas e já tem skill "negocio-no-supabase").
2. **Tela:** app web que se instala no iPhone (PWA). Não precisa de App Store.
3. **IA:** Claude pela API, para resumir, classificar tema e sugerir ideias.
4. **Captura no iPhone:** Atalho do iOS na folha de compartilhar, enviando o link para o sistema.
5. **Hospedagem:** Vercel (também conectada).

### ⚠️ Pontos técnicos de atenção
1. Instagram bloqueia leitura automática de muitos posts. Plano B: a IA lê o print enviado junto.
2. Custo da IA: cerca de 1 chamada por item salvo. [confirmar: estimativa de custo mensal no piloto]
3. Dados pessoais: o banco fica privado, só com o login do Romero.

---

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
