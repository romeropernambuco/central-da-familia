# Tarefa 11 · Módulo Escritório · Ajustes finais

Data: 24/11/2026 · Dono: o dono do produto · Versão 4, depois da banca de 7 especialistas e da conferência entre os 5 cadernos

**Cadernos de construção:** pasta `docs/escritorio/`. Comece por `docs/escritorio/LEIA-PRIMEIRO.md`. Onde este resumo e um caderno disserem coisas diferentes, vale o caderno; acima dos 2, a base comum; acima de tudo, as Diretrizes.

**Onde entregar:** documento "Central da Família · Diretrizes do CEO", logo abaixo da ficha "TAREFA: 11 Módulo Escritório".
Este arquivo complementa a Tarefa 11. Não substitui nada do que já foi decidido.

```
                ESCRITÓRIO DA FAMÍLIA
                         │
   ┌─────────┬─────────┬─┴───────┬─────────┬─────────┐
  11-B      11-C      11-D      11-E      11-F
  CUSTO,    CONFIANÇA DINHEIRO  TELA E    ESCRITÓRIO
  SAÚDE E   no número certo em  INTERAÇÃO EM 3D
  NOVIDADES e na IA   cada      cartão    modo novo,
                      ajudante  curto     3 fases
```

**A essência que nenhuma ficha pode quebrar:** 8 ajudantes com nome, função fixa e horário; fila "Depende de você"; fonte em cada número; família separada de empresa; o ajudante sugere, nunca envia, paga ou aplica; conta é do banco, a IA só escreve o destaque e a ação; personagens na cena; 1 cor de destaque.

---

## 1. Quem revisou

| Especialista | O que trouxe | Ficha |
|---|---|---|
| Revisor de produto | Custo de IA sai da tela da família; palavras da tela | 11-B |
| Revisor de engenharia | Custo em coluna, teto com reserva, conta de custo | 11-B |
| Engenheiro de aplicativo financeiro | Número com carimbo, IA que falha, segurança, privacidade | 11-C |
| Consultor de finanças da família | Número certo de cada ajudante, previsão única, tom, limites | 11-D |
| Especialista em apps de finanças | O que Monarch, Copilot, Ramp, Origin e YNAB fazem e serve aqui | 11-E |
| Designer de produto e interação | Tela curta, cartão em 3 níveis, estados | 11-E |
| Arquiteto de experiência 3D | Avaliação do Escritório 3D que já existe e as 3 fases | 11-F |

---

## 2. Retrato de hoje (conferido em 24/11)

| Item | Número |
|---|---|
| Ajudantes cadastrados | 11 (8 do produto + 3 só da nossa família) |
| Conferências registradas | 16, todas de 07/11 |
| Conferências entregues | 1 de 16 |
| Dias sem conferência nova | 17 |
| Ajudantes com horário ligado de verdade | 1 de 11 |
| Banco novo do produto (Tarefa 2) | ainda não existe |
| Altura da prévia no celular | 9.624 px (11 telas) |
| Cartão de ajudante na prévia | 70 a 121 palavras cada |
| Escritório 3D que já existe | 186 KB compactado, 0,9 s pra aparecer, 0 erro, 9 bonecos com relógio simulado |

---

## 3. O que só nós temos (proteger)

Nas páginas lidas de Monarch, Copilot, Ramp, Origin e YNAB, cada um tem 1 assistente genérico. Nós temos:

1. 8 ajudantes com nome, função fixa e horário marcado.
2. Casa, feira e equipe junto do dinheiro.
3. Pendência com dono, data e nova cobrança.
4. Marca de dado de exemplo e a pergunta que destrava.
5. Teto de custo de IA por família.

---

## 4. Ficha 11-B · Custo, saúde e novidades

```
TAREFA: 11-B Escritório: custo, saúde e novidades
ESPECIALISTA: Engenheiro de agentes de IA (o mesmo da Tarefa 11)
ENTRA DEPOIS DE: Tarefas 5 e 7, igual à Tarefa 11. O item G entra com a
Tarefa 14. Coluna e tabela nova nascem no projeto novo (Tarefa 2), nunca
no projeto de hoje.
LEIA ANTES: README.md (manual do repositório); ficha da Tarefa 11; Escritório da Família
(https://claude.ai/artifact/F43Xn8RE49F4YN7PULvKnm); tabelas
escritorio_funcionarios e escritorio_turnos; a conta do produto na parte 9
das Diretrizes; limite de uso da Tarefa 12.

FAÇA:
A. Modelo por ajudante. 1 campo "modelo": leve ou forte. Leve pra
   conferência que só lê, calcula e grava. Forte só pro relatório com
   insight. Aparece só no painel do dono do produto.
B. Custo em cada conferência. A função de servidor soma o uso de TODAS as
   chamadas de IA (entrada, saída, tentativas repetidas) e passa ao
   fechamento só o modelo e a contagem. Quem calcula o R$ é o banco:
   contagem x preço vigente x dólar da mesma linha de ia_precos. Grava em
   colunas próprias: modelo_id, tokens_entrada, tokens_saida, custo_brl.
   Valor gravado nunca é recalculado. Sem IA: custo 0 e modelo vazio.
   ia_precos: 1 linha por modelo e data de vigência. O administrador só
   insere linha nova, nunca edita.
C. Teto. 1 linha por família por mês em ia_gasto_mes (gasto, reservado,
   avisou_80_em). O mês é o do INÍCIO da conferência no fuso de Recife.
   1. Antes de chamar a IA, reserva o custo estimado travando a linha; ao
      fechar, troca pelo custo real. Reserva sem fechamento em 30 min é
      devolvida.
   2. Em 80%: 1 alerta por mês pro dono do produto.
   3. Em 100%: conferência nova nasce no modelo leve; a que está em
      andamento termina no modelo em que começou.
   4. Em 150%, ou mais de 3 "Rodar agora" por ajudante por dia: nenhuma
      chamada de IA; a conferência grava os números do banco sem texto.
   5. Conferência de exemplo não conta. A família Silva tem conta própria.
   6. O teto é 1 só: soma o Escritório e as leituras da Tarefa 12.
   Tela da família: nunca mostra R$ de IA. No cartão afetado só aparece
   "Este mês o relatório vem resumido. O completo volta em 01/12."
   Painel do dono: "Custo de IA em novembro: R$ 0,44 de R$ 2,49", por
   família e por ajudante, com 1 frase de projeção ("no ritmo atual fecha
   em R$ X"). Abaixo de 1 centavo: "menos de R$ 0,01".
D. Saúde. Na tela da família, 1 linha no rodapé com 2 formas: "Tudo
   funcionando. Última conferência: hoje, 7h41." ou "2 conferências
   atrasadas. Última: 24/11." com "Rodar agora". Atrasada = horário
   previsto + 30 min já passou, ou conferência aberta sem fim há mais de
   30 min. 1 único agendamento, a cada 10 min, abre as vencidas. A escala
   sai do código e vira tabela por família (escritorio_escala).
E. Novidades. 1 linha abaixo de "coisas esperando você": "3 relatórios
   novos desde a sua última visita." Com 0, some. Conta só relatório que
   aquela pessoa pode ver. Grava só a função escritorio_marcar_visto(),
   com a pessoa logada e a hora do servidor. A tela conta ANTES de marcar.
F. Time com data. 1 frase no topo de "Dias de cada ajudante": "Seus 8
   ajudantes trabalham desde 07/09." Mudança vira 1 linha no mesmo bloco
   por 7 dias, sem aviso no celular. Nome de pessoa vem do cadastro.
G. Placar do Escritório. Na Tarefa 14, abaixo dos 4 números, 1 linha
   recolhida, só pro dono do produto: "Escritório: 3 de 4 no verde, 4 sem
   meta ainda." O que está fora do verde sobe pro topo. A segunda-feira
   continua com 4 números. Os números 3 e 4 medem o ajudante, nunca a
   pessoa. Tabela completa na parte 10.

NÃO FAÇA:
- Criar ajudante novo. O produto tem 8 e continua com 8.
- Mostrar custo de IA, "tokens", "modelo", "banco" ou "turno" pra família.
- Ligar a escala sozinha antes do teto de custo estar funcionando.
- Gastar IA em conferência sem dado: sem dado, o ajudante pergunta.
- Escrever nome ou número da nossa família no código.
- Tocar o projeto de hoje no Supabase fora das Tarefas 1 e 16.

PRONTO QUANDO: na família Silva, com relógio simulado, toda conferência
que chamou a IA tem modelo, contagem e custo; o alerta de 80% dispara 1
vez com o teto baixado pra teste; em 100% a seguinte sai no leve; 2
conferências ao mesmo tempo não furam o teto; a virada de mês zera; a
família A não vê custo da B; as novidades zeram depois de abrir.
```

---

## 5. Ficha 11-C · Confiança no número e na IA

```
TAREFA: 11-C Escritório: número com carimbo e IA sob controle
ESPECIALISTA: Engenheiro de aplicativo financeiro
ENTRA: antes da 11-B (passo 2 da ordem, parte 12). Do item 5, a faixa de
aviso entra agora; guardar cópia no aparelho fica pra depois do piloto.

FAÇA:
1. Número com carimbo. Antes da IA, o servidor chama as funções de conta
   e grava na conferência os números, o "dados até" (data e hora) e a
   versão da função. A IA recebe só esses números. Depois o servidor
   confere: todo R$, % e data do texto existe no que foi gravado; se não,
   descarta o texto. O cartão mostra "Conta feita em 24/11, 7h41". Entrou
   lançamento depois: "Entrou lançamento depois desta conta" e o botão
   "Refazer a conta" (sem IA, custo 0, fora do limite de 3 por dia).
2. IA falhou, a conta sai. IA fora do ar, sem resposta em 60 s ou texto
   descartado: 1 nova tentativa. Depois grava número e comparação e o
   cartão diz "Hoje veio só o número. O comentário volta na próxima
   conferência." Nunca repete destaque antigo como novo.
3. Nunca 2 vezes, e quem fez. 1 conferência por família, ajudante e
   horário previsto, trancada no banco; 2 toques em "Rodar agora" abrem a
   mesma. A mesma pendência não nasce 2 vezes. Conferência fechada nunca
   é editada: correção vira nova, apontando pra anterior. A pendência
   mostra "Resolvido por Marina em 25/11, 19h02".
4. Privacidade na casa. Equipe da casa e filhos recebem 0 linha das
   tabelas do Escritório, por regra do banco, não só da tela. Aviso no
   celular nunca traz R$ nem nome de empregado.
5. Sem internet. Agora: a tela que já estava aberta mostra a faixa "Sem
   internet. Você vê os números de hoje, 8h13." "Rodar agora", "Resolvi"
   e "Responder" ficam apagados com "precisa de internet". Nada fica na
   fila pra enviar depois e nada é guardado no aparelho. Depois do
   piloto: guardar 1 cópia no aparelho, que sair da conta apaga.
6. 4 sinais novos na saúde técnica do dono do produto: relatórios só com
   número, por motivo; textos descartados por número que não batia; tempo
   da conferência (o do meio e o pior); repetições barradas.

NÃO FAÇA:
- Mandar pra IA senha, PIN, e-mail, telefone, CPF, número de cartão (só o
  apelido) ou foto. Nome de pessoa vai como marcador e o servidor troca
  de volta.
- Tratar texto digitado, pedido escrito ou item de cupom como ordem: vai
  marcado como dado, cortado em 200 letras.
- Dar ferramenta à IA: ela devolve só os campos destaque e ação.
- Juntar 2 famílias na mesma chamada.

PRONTO QUANDO: IA desligada no meio, o relatório sai só com número; texto
com 1 número trocado de propósito é descartado; agendamento e "Rodar
agora" no mesmo minuto geram 1 conferência; cupom com "ignore as regras"
não muda o relatório; equipe e filho leem 0 linha do Escritório; busca
por CPF, cartão e e-mail no que foi enviado à IA dá 0; sem internet
aparece a faixa.
A CONFIRMAR COM ADVOGADO (Tarefa 15): envio de dado ao fornecedor de IA
no termo de uso.
```

---

## 6. Ficha 11-D · O dinheiro certo em cada ajudante

Todos os valores são da família de exemplo.

| Ajudante | Número principal | Comparação | Exemplo de insight com ação |
|---|---|---|---|
| Contador da Casa | Livre até o fim do mês, já sem as contas com data | % usado contra % do mês | "Sobram R$ 3.760, mas R$ 2.840 têm data. Livre: R$ 920." |
| Analista de Cartão | Próxima fatura: cabe ou faltam R$ X | Parcelas já contratadas, 6 meses | "Março junta 3 parcelas: R$ 1.400. Nada parcelado acima de R$ 200 até lá." |
| Agenda de Vencimentos | R$ que vencem em 10 dias | 30, 60 e 90 dias | "Janeiro soma R$ 6.000. Separar R$ 3.000 em dezembro." |
| Comprador | Preço da mesma cesta (mesmos itens e quantidades) | Mediana de 4 semanas | "5 itens subiram R$ 140 por mês. Trocar 2 marcas devolve R$ 90." |
| Auditor de Estoque | R$ que saíram acima do normal e ficaram sem explicação | 4 semanas, descontadas as visitas | "3 kg de carne a mais: R$ 120. Houve visita no sábado: explicado." |
| Controlador de Presença | Custo da despensa por pessoa por dia | 4 semanas | "Dia com visita custa R$ 45 a mais. Prever R$ 90 por mês na feira." |
| Folha da Casa | Quanto falta guardar pro próximo pagamento com data | Conferência anterior | "Férias de janeiro pedem R$ 2.400; há R$ 620. Guardar R$ 890 por conferência." |
| Guardião do Colchão | Semanas de contas pagas | Anterior e o mês mais apertado dos próximos 3 | "Janeiro baixa de 9 pra 6 semanas. Nenhuma parcela nova até fevereiro." |

```
TAREFA: 11-D Escritório: o dinheiro certo em cada ajudante
ESPECIALISTA: Engenheiro de agentes de IA, com o economista revisando
ENTRA: em 3 partes (parte 12): as contas antes da 11-C, a pendência e
o tom depois da 11-C, o Fechamento depois da 11-B.

FAÇA:
1. Uma previsão só. Contador, Agenda, Cartão, Folha e Guardião leem a
   mesma previsão do banco (Tarefas 4 e 19). O Contador mostra o livre já
   sem contas com data, fatura e folha. 2 ajudantes com valores
   diferentes pro mesmo assunto: o teste noturno (Tarefa 5) acusa.
2. Número principal é dinheiro. Cada ajudante usa o número da tabela
   acima. Contagem de itens ou de dias vira legenda, não número principal.
3. Conta do Guardião. Semanas = reserva ÷ gasto semanal de base. Base = o
   maior entre a média de 4 semanas e a de 3 meses, com contas anuais
   ÷ 52, parcelas contratadas e folha. Compra que não se repete fica fora.
   Âmbar: caiu 2 conferências seguidas ou ficou abaixo da meta da família.
   Vermelho: algum dos próximos 3 meses projetado abaixo do colchão;
   mostra o valor e o que dá pra adiar. Renda que varia: o plano usa o
   mês mais fraco dos últimos 6 e renda incerta entra como "se cair".
4. Tom. Notícia ruim em 3 partes: o número da casa, quanto ainda dá, 1
   saída. O sujeito é a casa, nunca a pessoa. Sem "de novo", sem
   exclamação. Exemplo: "O mês passou R$ 240. Dezembro começa com
   R$ 11.760.", e nunca "Marina estourou R$ 240."
5. Piso de valor. Todo insight traz R$ por mês. Só vira pendência acima
   de R$ 50 por mês (estimativa, calibrar no piloto). Sem achado: "Nada
   fora do normal esta semana", sem ação inventada. O Auditor desconta as
   visitas da Presença antes de apontar consumo.
6. Fechamento do mês. No 1º dia útil, o Contador entrega "Fechamento de
   <mês>": 3 números (o que sobrou, maior mudança, colchão), 1 insight, 1
   ação e o botão "Vimos juntos". É o relatório forte mensal, sem custo
   novo.

NÃO FAÇA:
- Indicar aplicação, produto, banco ou corretora; prometer rendimento.
- Sugerir empréstimo, parcelar fatura ou pagar o mínimo.
- Afirmar regra trabalhista ou de imposto como certa; sugerir desconto
  de salário; apontar suspeita sobre pessoa da equipe.
- Data e percentual da folha vêm de tabela conferida por contador, nunca
  do texto da IA.

AVISO NA TELA (texto passa pelo advogado da Tarefa 15): "Os ajudantes
fazem contas com o que você lançou. Não é recomendação de investimento
nem orientação trabalhista. Antes de decidir, confirme com seu contador
ou advogado."

PRONTO QUANDO: na família Silva, o livre do Contador bate com a previsão
menos as contas da Agenda, a fatura do Cartão e a folha; nenhum par de
ajudantes mostra valores diferentes pro mesmo assunto; 0 insight sem R$;
0 frase com nome de pessoa em notícia ruim.
```

Já tem dono em outra tarefa, não duplicar: caixa de 30, 60 e 90 dias (Tarefa 19) e parcelas somadas (Tarefa 8). Sem dono hoje: fatura que não cabe, encargos da folha e assinaturas esquecidas.

---

## 7. Ficha 11-E · Tela e interação

```
TAREFA: 11-E Escritório: tela curta e cartão em 3 níveis
ESPECIALISTA: Desenhista de experiência, com o engenheiro de telas
ENTRA: depois da 11-B (passo 6 da parte 12), salvo os itens marcados.

FAÇA:
1. Primeira tela do celular. Em 390x844, mostrar o número "coisas
   esperando você" e a 1ª linha de "Depende de você" com botão, sem
   rolar. Limite, Guardado e Próxima conferência viram 1 faixa de 3
   valores, na mesma posição.
2. Página curta. Cartão nasce fechado (até 200 px); só abre sozinho o que
   precisa de você. "Dias de cada ajudante" fica recolhido em 1 linha.
   Meta: celular até 4.000 px (hoje 9.624), computador até 2.600 (hoje
   5.849).
3. Cartão em 3 níveis.
   Nível 1, em 2 segundos (até 25 palavras): personagem de 48 px, nome,
   sinal de estado (ícone + palavra), número grande, legenda de 1 linha,
   1 linha de comparação com seta. Com pendência: 1 botão verde de 44 px,
   largura inteira.
   Nível 2, 1 toque, abre no lugar: frase-título, "O que chamou atenção"
   e "O que fazer", até 20 palavras cada.
   Nível 3, "Ver detalhes": o que faz por você, fonte, horário, "Rodar
   agora", pedido escrito.
4. Estados, sempre forma + palavra:
   Trabalhando: anel + "Conferindo agora"; giro de 1.200 ms.
   Entregou: check + "Entregue"; surge em 200 ms, 1 vez.
   Precisa de você: exclamação cheia + "Precisa de você"; 1 pulso de 600 ms.
   Perguntando: balão com "?" + "Perguntando"; 1 pulso de 600 ms.
   Aguardando: ampulheta + "Aguardando"; sem movimento.
   Atrasado: relógio + "Atrasado desde 25/11"; sem movimento.
   Resumido: folha curta + "Resumido até 01/12"; sem movimento.
   Com "reduzir movimento" ligado, tudo fica parado.
5. Sair da fila sem culpa. Depois de "Resolvi", barra "Desfazer" por 6 s,
   igual à Tarefa 7. Cada pendência ganha "Agora não": some por 7 dias,
   volta 1 vez, e o ajudante não cobra nesse intervalo. No número 3 do
   placar conta como adiada, não vencida.
6. Ajudou? Abaixo do insight, 2 botões: "Ajudou" e "Não ajudou". 1
   resposta por pessoa por relatório, pode trocar. Entra no número 6 do
   placar. No piloto, não muda o texto do ajudante sozinho.
7. Chave "Só o que depende de mim": esconde cartões sem pendência e
   lembra a escolha.
8. Leitura e acesso. Alvo de toque de 44x44 px. Contraste de 4,5 pra 1 em
   todo texto (conferir a cor mais clara de texto, que pode estar
   abaixo). Leitor de tela lê o cartão como 1 botão: "Contador da Casa,
   entregue, R$ 920 livres até 30/11". A cena ganha descrição em texto.
9. Painel do dono, no celular: "Por ajudante" vira lista de 2 linhas.

ENTRA NA TAREFA 20 (avisos e Domingo do casal):
10. O Domingo do casal ganha o bloco "O que os ajudantes viram": até 3
    linhas, 1 por ajudante com mudança, com número, comparação e fonte.
    Sem conferência nova, o bloco some.
11. O aviso de ajudante abre direto na pendência, com a pergunta e o
    botão de responder. Máximo de 2 avisos por dia.

DEPOIS DO PILOTO:
12. "Perguntar sobre este relatório", com 3 perguntas prontas. Responde
    só com os números daquela conferência e repete a fonte. Sem dado, diz
    "não sei, falta X". Modelo leve, conta no teto, 5 perguntas por
    pessoa por dia. Não lança nem altera nada.

NÃO FAÇA:
- Texto abaixo de 12 px. "O que faz por você" sempre visível.
- Piscar sem fim. Estado só por cor.
- Confirmação em janela por cima. Arrastar pra adiar (gesto escondido).
- Cara de IA: ícone de faísca, "IA" em todo título, frase genérica sem
  número, 3 selos por cartão, texto digitando letra a letra, brilho ou
  carregamento falso, mais de 1 botão verde por cartão, negrito em toda
  linha.
- Levar à produção os selos "Novo" e "Reajustado" da prévia.

PRONTO QUANDO: no celular, a 1ª pendência aparece sem rolar; a página
mede até 4.000 px; cada cartão fechado tem até 25 palavras; print em
preto e branco deixa distinguir os 7 estados; tarefa completa só com
teclado; passou no teste dos 5 minutos.
```

---

## 8. Ficha 11-F · Escritório em 3D

> **ADIADO por decisão do dono em 24/11/2026.** O 3D fica pra depois. A ficha continua guardada aqui pra quando ele mandar retomar.

**Veredito:** o Escritório 3D que já existe é uma base boa e leve. Aproveita o motor inteiro e refaz só o elenco (hoje 9 bonecos, o produto tem 8), os estados e a origem dos dados (hoje é relógio simulado, não o banco).

| Situação | O que o boneco e a mesa fazem | Palavra (a da base comum, igual à do cartão) |
|---|---|---|
| Trabalhando agora | digita, tela acesa | "Conferindo agora" |
| Entregou | pilha de papel na mesa | "Entregue" |
| Precisa de você | levanta e vai até a frente com a mão erguida | "Precisa de você" |
| Perguntando | sentado, balão com "?" | "Perguntando" |
| Aguardando | sentado, ampulheta na mesa | "Aguardando" |
| Atrasado | cadeira vazia, despertador na mesa | "Atrasado" |
| Relatório resumido | 1 folha com clipe | "Resumido" |

São 7 situações, as da parte 5 da base comum.

```
TAREFA: 11-F Escritório em 3D
ESPECIALISTA: Engenheiro de telas com experiência em 3D na web
ENTRA: fase 1 depois da 11-E aprovada. Cada fase só começa com a
anterior aprovada no iPhone do dono.
LEIA ANTES: Escritório 3D (https://claude.ai/artifact/UHKmYDRNAN5n3tyM1CGqgF);
a cena em pixel da tela de hoje; regra "Mudar sem quebrar".

FASE 1 (esforço médio)
1. O 3D é um modo, não uma troca. Botão "Ver em 3D" na cena. O padrão
   continua sendo o pixel. A escolha fica lembrada no aparelho.
2. 1 fonte de estado só. Cena pixel, cena 3D e cartões leem a mesma
   função de estado. Apagar o estado por relógio do 3D.
3. Mesmo elenco. 8 bonecos em miniatura de caixinhas, câmera fixa, de
   frente e vista de cima (o caderno trocou a diagonal do 3D de hoje;
   decisão 8 da parte 14), cores copiadas dos personagens pixel.
4. Estado = pose + objeto + palavra, conforme a tabela acima.
5. Toque leva ao trabalho. Tocar no boneco ou na etiqueta: a câmera
   desliza até a mesa em 0,5 s e a página rola pro cartão dele.
6. Orçamento de iPhone. Biblioteca em arquivo separado, só carregada ao
   ligar o 3D. Tetos: 250 KB compactado, 100 chamadas de desenho, 30 mil
   triângulos, 60 MB de memória, alvo de 60 quadros por segundo, piso 30.
7. Plano B e bateria. Sem suporte, abaixo de 24 quadros por 4 s ou cena
   derrubada pelo iPhone: volta pro pixel sem aviso técnico. Desenhar só
   quando algo muda; parar com a aba oculta.
8. Acesso. Etiquetas são botões na ordem dos cartões; Tab percorre os 8,
   Enter abre; "reduzir movimento" congela andar e voo de câmera.
PRONTO QUANDO: com o 3D desligado, a tela é idêntica à de hoje em 390 e
1280; em 8 de 8 ajudantes a palavra da etiqueta 3D é igual à do cartão
em 20 recargas; o dono reconhece 8 de 8 bonecos sem etiqueta; iPhone de
verdade segura 50 quadros ou mais por 5 minutos sem esquentar; simulando
a queda da cena, o pixel aparece em 1 s.

FASE 2 (esforço médio)
9. Ao vivo. Quando uma conferência fecha no banco, o boneco muda em até
   5 s, com comemoração de 1,5 s. Linha do tempo do dia, arrastável,
   mostrando quem entregou a que hora.
PRONTO QUANDO: fechar conferência em outro aparelho muda a cena sem
recarregar.

FASE 3 (esforço grande)
10. Lugares úteis. Quadro de metas na parede (toque abre o resumo). Sala
    de reunião de segunda (os bonecos se juntam, toque abre o resumo da
    semana). Arrastar documento até a mesa, com o botão "Entregar
    documento" equivalente.
PRONTO QUANDO: cada lugar leva a uma tela que já existe.

NÃO FAÇA:
- Trocar a cena pixel aprovada nem a ordem dos blocos.
- Estado só por cor ou só por luz.
- Enfeite: andar livre pelo escritório com boneco próprio, girar a
  câmera, física.
- Baixar arquivo de modelo 3D: os bonecos são feitos em código.
```

Não medido: iPhone de verdade (quadros, calor, bateria), tema escuro do 3D e leitor de tela.

---

## 9. Onde cada dado fica guardado

Tudo só no banco novo do produto. Esta é a lista completa do que os 5 cadernos criam: 9 tabelas novas, 19 colunas em `escritorio_turnos`, 1 em `escritorio_funcionarios` e 1 em `pessoas`. A lista de funções, com o dono de cada uma, está em `docs/escritorio/LEIA-PRIMEIRO.md`, parte 4.

**Colunas novas em `escritorio_turnos` (a conferência)**

| Dado | Colunas | Caderno dono |
|---|---|---|
| Números da conta, "dados até" e versão da função (o carimbo) | `numeros`, `dados_ate`, `versao_conta` | 11-C |
| Horário previsto, quem abriu e de onde veio (agenda, toque, refazer, correção) | `previsto_para`, `aberto_por`, `origem` | 11-C |
| Correção que aponta pra conferência anterior | `corrige_turno_id` | 11-C |
| Saiu com texto ou só com número, e por quê | `texto_situacao`, `sem_texto_motivo` | 11-C |
| Modelo, contagem, custo e o preço usado | `modelo_id`, `tokens_entrada`, `tokens_saida`, `custo_brl`, `preco_id` | 11-B |
| Decisão do teto e reserva de custo | `ia_decisao`, `ia_reserva_brl`, `ia_reserva_em`, `ia_reserva_devolvida_em` | 11-B |
| Relatório resumido | `resumido` | 11-B |

A tranca "nunca 2 vezes" usa a coluna `chave`, que já existe, com 2 índices únicos (11-C). A família nunca lê as colunas de custo: a permissão é por coluna (11-B).

**Tabelas novas**

| Dado | Tabela | Caderno dono | Quem lê |
|---|---|---|---|
| Pendência com dono, data, "Resolvi" e "Agora não" | `escritorio_pendencias` | 11-C | casal |
| "Ajudou / Não ajudou", 1 linha por pessoa por relatório | `escritorio_avaliacoes` | 11-C | casal |
| Trilha de quem fez o quê e quando | `escritorio_trilha` | 11-C | casal (só as linhas que a tela mostra) |
| O que foi enviado à IA, com marcador no lugar do nome | `escritorio_ia_envios` | 11-C | ninguém logado |
| Preço por modelo e dólar | `ia_precos` (global) | 11-B | dono do produto |
| Gasto, reserva, teto e alerta do mês | `ia_gasto_mes` (família, mês) | 11-B | dono do produto |
| Dia, hora, próximo horário, "desde", ativo | `escritorio_escala` (por família) | 11-B | casal |
| Piso da pendência, meta de semanas, teto de parcela | `escritorio_parametros` (por família) | 11-D | casal |
| Termos que o ajudante nunca escreve (conferidor de texto) | `escritorio_termos_proibidos` (nome proposto) | 11-D | ninguém logado; só a função de servidor |

Se ainda não existir quem diga "esta pessoa é o dono do produto", a 11-B cria também a tabela `produto_donos` (rascunho, até a Tarefa 2 ou 14 assumir).

**Colunas em outras tabelas e o que não guarda nada**

| Dado | Onde | Caderno dono |
|---|---|---|
| Modelo padrão do ajudante | `escritorio_funcionarios.modelo` | 11-B |
| Última visita | `pessoas.escritorio_visto_em`, só via função | 11-B |
| Saúde, novidades, placar, sinais de confiança, situação da cena e do cartão | funções calculadas na hora, sem tabela | 11-B, 11-C, 11-E e 11-F |
| Chave "Só o que depende de mim" e modo 3D escolhido | no aparelho, fora do banco | 11-E e 11-F |
| Cópia da tela pra ver sem internet | no aparelho, só depois do piloto | 11-C |

---

## 10. Placar do Escritório (só pro dono do produto)

| # | Número | Meta |
|---|---|---|
| 1 | Conferências que rodaram ÷ previstas na semana | 100% |
| 2 | Ajudantes em "sem dados" no fim da semana | 0 |
| 3 | Pendências vencidas sem "Resolvi" (adiada não conta) | 0 |
| 4 | Dias até uma pendência ser respondida | sem meta até 4 semanas de piloto |
| 5 | Custo de IA da família no mês | até o teto |
| 6 | Relatórios marcados "Ajudou" ÷ relatórios entregues | sem meta até 4 semanas de piloto |
| 7 | Meses seguidos sem furar o colchão (menor saldo do mês ≥ colchão) | medir já, meta depois do piloto |
| 8 | Semanas de reserva hoje menos semanas de 90 dias atrás | medir já, meta depois do piloto |

Os números 7 e 8 são de resultado financeiro e aparecem sem R$ das famílias.

Com meta: 1, 2, 3 e 5. Sem meta ainda: 4, 6, 7 e 8. Por isso a frase da linha recolhida é "3 de 4 no verde, 4 sem meta ainda".

---

## 11. Custo de IA (estimativa)

Teto proposto: **R$ 2,49 por família por mês**, topo da faixa que as Diretrizes já estimaram.

Premissas, todas a confirmar: cerca de 26 conferências por mês (é o que a escala dá em novembro/2026 na família Silva); dólar a R$ 5,45; tamanho de cada conferência ainda sem medição; preço dos modelos a confirmar na página oficial.

| Cenário | R$ por mês | % do teto |
|---|---|---|
| Tudo no modelo leve | 0,08 | 3% |
| Insight forte só 1 vez por mês (Contador R$ 0,17, Cartão R$ 0,21, os outros 6 somados R$ 0,06) | 0,44 | 18% |
| Insight forte toda semana | 1,91 a 2,29 (valor ilustrativo, sem dado de exemplo que o gere) | 77% a 92% |

Regra recomendada: forte só no Fechamento do mês (Contador) e no fechamento do cartão (Analista de Cartão). Os outros 6 ficam no leve.

---

## 12. Ordem de construção

| Passo | Ficha | O quê | Depende de |
|---|---|---|---|
| 1 | 11-D, 1ª parte | Previsão única e as 8 contas (número, comparação, achado) | Tarefas 3 e 4; Tarefas 8, 10 e 19 pros ajudantes que leem delas |
| 2 | 11-C | Número com carimbo, IA que falha, nunca 2 vezes, privacidade, pendência, "Agora não" e "Ajudou" no banco | passo 1; Tarefas 5 e 7 |
| 3 | 11-D, 2ª parte | Piso que vira pendência, tom e termos proibidos, teste noturno | passo 2 |
| 4 | 11-B | Modelo, custo, teto, escala, saúde, novidades | passo 2 |
| 5 | 11-D, 3ª parte | Fechamento do mês no 1º dia útil e aviso da tela | passo 4 |
| 6 | 11-E | Tela curta, cartão em 3 níveis, 7 situações, função única de situação | passo 5 |
| 7 | 11-B item G | Placar | Tarefa 14 e passo 6 |
| 8 | 11-E itens 10 e 11 | Domingo do casal e aviso que abre na pendência | Tarefa 20 |
| 9 | 11-F fase 1 | Modo 3D. **ADIADO pelo dono em 24/11** | nova ordem do dono |
| 10 | 11-E item 12, 11-F fases 2 e 3 (adiadas), cópia sem internet da 11-C | Perguntar sobre o relatório, ao vivo, lugares úteis | depois do piloto |

A 11-D foi dividida em 3 partes porque ela e a 11-C dependem uma da outra: as contas nascem antes do carimbo, e a pendência nasce depois dele. A escala só é ligada sozinha depois do passo 4. A tabela passo a passo, com o número do passo de cada caderno, está em `docs/escritorio/LEIA-PRIMEIRO.md`, parte 3.

---

## 13. Fila de espera (não entra agora)

| Ideia | Destino | O que destrava |
|---|---|---|
| Gerente que recebe 1 pedido e encaminha | Produto, depois do piloto | 2 famílias do piloto pedirem |
| Escola dos filhos, saúde, carro, manutenção | Produto, depois do piloto | 2 famílias pedirem |
| Assinaturas esquecidas (com o Analista de Cartão) | Produto, depois do piloto | cartão com dado real por 3 meses |
| Atalho com número na tela do iPhone | Produto, fase de tração | app na loja da Apple |
| Negociador de Credores e Fiscal de Juros | Só na Central da nossa família | Tarefa 16 pronta |
| Contratos, processos e sócios | Só na Central da nossa família | Tarefa 16 pronta |
| Voz | Não construir | o teclado do iPhone já dita |

---

## 14. Decisões do dono

| # | Decisão | Recomendação |
|---|---|---|
| 1 | Um do casal lê o relatório com o gasto do outro? | Sim, lê, sabendo de quem é cada coisa. É a regra de 13/11, mais recente que a parte 6 das Diretrizes |
| 2 | Teto de custo de IA por família | R$ 2,49 por mês, somando Escritório e Tarefa 12 |
| 3 | Insight forte toda semana ou só no mês? | Só no mês |
| 4 | Piso pra insight virar pendência | R$ 50 por mês, calibrar no piloto |
| 5 | 3D: quando entra? | **Decidido em 24/11: fica pra depois.** A cena em pixel segue como a única cena |
| 6 | Gerente que encaminha pedido entra no piloto? | Não. Só se 2 famílias pedirem |
| 7 | Ligar já as 10 conferências da nossa família no painel de hoje? | Não. Ligar cada uma só quando tiver dado real |
| 8 | (Adiada com o 3D) Câmera do 3D: de frente e vista de cima (como o pixel) ou na diagonal (como o 3D de hoje)? | De frente e vista de cima. Na diagonal as etiquetas com a palavra da situação não cabem no celular |
| 9 | O 1º dia útil do Contador olha feriado? | Sim. A base comum já foi corrigida: em novembro/2026 o Contador roda na terça, 03/11, porque 02/11 é feriado (Finados)|

---

## 15. Fontes lidas pela banca

Lidas de verdade: ajuda oficial do Monarch sobre IA, Copilot (página de novidades e ajuda do painel), Ramp (anúncio dos agentes e texto sobre confiança), Origin (página pra casais), YNAB (atalho no celular), Linear (guia de interação com agentes), WCAG 2.2 (tamanho do alvo de toque), AI Town e Pixel Agents (repositórios), guia de 100 dicas de three.js e fórum do three.js sobre iPhone.

Não confirmadas: revisão do mês do Copilot, Rocket Money, Mobills, Organizze, Mercury, Devin, Gather, WorkAdventure, SoWork, ZEP e Spline. Não pesquisadas: Nubank, Honeydue e Guiabolso.
