# Inventário do que saiu

Escrito em 20/11/2026. Sem dados reais da família: só funções.

Serve para o dono marcar o que volta. A tela principal nova (Início J) fica como está e é o modelo: o que voltar entra no estilo dela.

## Como foi feito

- Quatro leituras de código, lado a lado, da versão nova (`final-rodada-codex`) contra:
  - o Escritório 3D original (`paineis/escritorio3d/index.html`, 12/11);
  - os painéis Finanças, A Receber e Parcelas;
  - o painel Assistentes da Família;
  - as telas do app de 14/11 (commit `d941d8e`).
- Depois conferi por busca os pontos principais. Os itens marcados **(suspeita)** não foram conferidos dos dois lados.
- Não foi testado na tela item por item.

## Leitura geral

- **Grupo A, cortado na rodada do Codex:** existia no app de 14/11 ou no nosso Escritório 3D e saiu, encolheu ou ficou escondido.
- **Grupo B, nunca trazido:** existia nos painéis originais e não entrou no app, nem em 14/11. Não foi o Codex que tirou.
- O app novo também ganhou muita coisa (lista no fim).

## Grupo A: cortado na rodada do Codex

### A1. Escritório 3D

Achado que barateia a volta: o porte fiel do nosso escritório ainda está no código (`telas/escritorio/Cena3D.tsx` e `cena3d.ts`), mas nenhuma tela o mostra. Só o mini de cada aba usa o motor, com a hora travada em meio-dia.

- A1.1 Etiqueta visível em cima de cada funcionário, com estado e nome.
- A1.2 Selo verde com o valor em quem precisa de você.
- A1.3 Funcionário que precisa de você levanta, anda até a frente da sala e acena; volta quando resolve.
- A1.4 Comemoração de braços para cima ao entregar.
- A1.5 Pilha de papel na mesa e tela do notebook com 3 níveis de brilho.
- A1.6 Luz pela hora de Recife: sol, céu, lâmpadas acesas à noite.
- A1.7 Chão e luz da cena acompanham o tema claro ou escuro.
- A1.8 Relógio do dia: dia acelerado, Pausar, +1 hora, Hora real.
- A1.9 Horário em que cada funcionário começa ("começa às 11h") e estado tirado do relógio.
- A1.10 Legenda dos 4 estados.
- A1.11 Manchete "N coisas precisam de você hoje", com o primeiro da fila.
- A1.12 Frase com número de cada funcionário na lista "sala por sala" (hoje só aparece o estado).
- A1.13 "De onde vem" o número de cada funcionário (o campo existe, nenhuma tela mostra).
- A1.14 Medidor de fluidez visível.
- A1.15 Celular: ao tocar num funcionário, a câmera vai para a sala dele.
- A1.16 Funcionário selecionado destacado na cena.
- A1.17 Botão "Responder [funcionário]" e a explicação da aba Hoje.
- A1.18 Fila "Precisa de você" ordenada pelo maior valor (hoje vem na ordem do banco).
- A1.19 Detalhes do cenário: moedas na sala Caixa, ícone nos botões de sala.

### A2. Início

O Início de 14/11 não existe mais. A proposta não é trazê-lo de volta, e sim expandir o novo com o que fazia falta.

- A2.1 "De onde veio esse número?" no limite de hoje.
- A2.2 "Por que mudou?": quanto era ontem, quanto é hoje e o motivo.
- A2.3 "Hoje já saiu X. Ainda pode hoje Y."
- A2.4 Frase da virada do mês (dias 1 a 3) e aviso dos 2 últimos dias.
- A2.5 "Do seu combinado, sobram X até [data]."
- A2.6 Explicação da reserva na linha da Casa.
- A2.7 Cartão "Até dezembro de 2028" (o componente existe, ninguém usa).
- A2.8 Saudação com o nome.
- A2.9 Ritmo do mês e "até domingo" à vista (hoje atrás de "Ver detalhes").
- A2.10 Placar do casal à vista no celular, com as frases de quem passou do combinado.
- A2.11 Frase completa do estouro: quanto passou, de que mês sai, com quanto o próximo começa.
- A2.12 Últimos lançamentos com limite, dono, data e parcela.
- A2.13 Responder a primeira pendência direto no Início.

### A3. Outras telas

- A3.1 Lançamentos: linhas de parcela de compras antigas são filtradas **(efeito na tela: suspeita)**.
- A3.2 Lançar: aviso depois de salvar no cartão perdeu o "ainda pode hoje"; o parcelado perdeu as datas de vencimento.
- A3.3 Meu orçamento: meta "Quero juntar pra…" perdeu o cálculo automático de quando dá para comprar.
- A3.4 Planejamento: gráfico do caixa até dez/2028 ficou recolhido.
- A3.5 Privacidade: saíram "não guardamos senha de banco nem número de cartão", "a conta é do banco, nunca da IA" e a menção à LGPD.
- A3.6 Barra do celular: Lançamentos e Casa foram para "Mais".
- A3.7 Textos encurtados em Entrar, Primeiro uso e Ajustes.

Sem perda, conferido: Cartões, Casa, Desejos, Guardado, Imóveis, Reajuste, Recebimentos, Painel, ficha do funcionário, Relatório e Lembretes.

## Grupo B: nunca trazido dos painéis originais

### B1. A Receber (o painel inteiro)

- B1.1 Motor da dívida com juros: principal, juros em aberto, parcela em parte, meses só de juros, projeção até zerar.
- B1.2 Tela Hoje: quanto deve, quanto sobe por dia, próximo vencimento.
- B1.3 "Quanto ele pagou?": efeito na dívida na hora e lançamento com um toque.
- B1.4 Mapa mês a mês das parcelas.
- B1.5 Demonstrativo de débitos e recibo de pagamento.
- B1.6 Diário de cobrança e mensagem pronta.
- B1.7 Negociador: simula a proposta e diz quanto se ganha ou perde.
- B1.8 Nota de pagador, promessas cumpridas, atraso médio.
- B1.9 Comprovantes ligados a cada parcela.
- B1.10 Histórico de alterações que não se apaga.

### B2. Parcelas e cartões (visão de 12 meses)

- B2.1 "Pode comprometer por mês" e o mês mais apertado.
- B2.2 Barras dos 12 meses, por compra.
- B2.3 "Quando alivia": mês em que cada parcelamento acaba e quanto libera.
- B2.4 Lista de parcelas ativas ("n de N", quanto falta).
- B2.5 "E se eu comprar?" testando os 12 meses e sugerindo alternativa (hoje só o mês atual).
- B2.6 Antecipar, cancelar, estornar; assinatura que repete; fatura diferente da calculada **(parte suspeita)**.
- B2.7 "Guardar pra pensar" e "Em espera".
- B2.8 Limite usado do cartão.
- B2.9 Total do banco x anotado, com "Lançar a diferença".

### B3. Finanças (dia a dia)

- B3.1 Categorias de gasto e "Pra onde foi o dinheiro".
- B3.2 Busca e filtros nos lançamentos.
- B3.3 Contas que repetem todo mês e agenda de vencimentos.
- B3.4 Exportar planilha (hoje sai arquivo técnico).
- B3.5 Plano em 3 passos quando falta dinheiro no mês.
- B3.6 Metas com "chega em" e potes de datas **(suspeita)**.
- B3.7 Folha da Casa com INSS, IR, 13º e "Paguei" que lança.
- B3.8 Feira: teto por categoria, consumo pela contagem, lista automática, preço por unidade com alerta **(parte suspeita)**.
- B3.9 Hábito: sequência, jardim, Domingo do casal, cartão da semana **(suspeita)**.
- B3.10 Pergunta em português sobre os lançamentos **(suspeita)**.

### B4. Assistentes da Família

Observação: no original as rotinas rodavam num agente no Claude, fora do painel. O painel só mostrava o resultado.

- B4.1 Clara, a chefe: lê e-mail e agenda, resumo das 7h, fechamento das 21h, "quem busca as crianças".
- B4.2 Sílvia (escola) e Lia (saúde): sem substituto.
- B4.3 Pedido livre por voz, texto ou foto, com fila.
- B4.4 "Já decidido": a equipe não pergunta de novo (hoje só no exemplo).
- B4.5 Limites visíveis de cada assistente: Sempre, Nunca, até onde pode ir.
- B4.6 Atalhos: Google Agenda preenchido, "Não reconheço" (antigolpe), desfazer em 15 segundos.
- B4.7 "O dia da equipe" e "o que fizeram sem te chamar" num lugar só.
- B4.8 Silêncio das 22h às 7h no banco real.
- B4.9 Cena viva: placas com números por mesa, chefe andando e cobrando com balões **(suspeita)**.

## O que o app novo ganhou

- Início J, Resumo da família, Rumo a 2029, menu agrupado, visual único nas abas.
- 19 funcionários em 7 salas, com dados reais, ficha, relatório e lembretes.
- Desfazer, backup, rascunhos, proteção ao salvar, privacidade por papel.
- Imóveis, Recebimentos com fontes e cenários, Saldo em conta, Desejos.
- WhatsApp com texto pronto, ajuda por aba, zoom no escritório.

## Ordem sugerida

1. A1 (escritório): religar o que já está no código.
2. A2.1 a A2.4 e A3.5: explicações e textos que davam confiança no número.
3. B2 (12 meses do cartão): decide compra parcelada.
4. B1 (A Receber): é receita e prova.
5. O resto, conforme o dono marcar.
