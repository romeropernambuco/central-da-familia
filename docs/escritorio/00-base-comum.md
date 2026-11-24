# Escritório · Base comum

Leia este arquivo antes de qualquer caderno desta pasta. Ele fixa as palavras, os nomes e os dados de exemplo que os 5 cadernos usam. Se um caderno contradisser este arquivo, vale este arquivo.

Fonte de verdade acima de tudo: o documento "Central da Família · Diretrizes do CEO". O resumo das 5 fichas está em `docs/tarefa-11-escritorio-ajustes-finais.md`.

---

## 1. A essência que nenhum caderno pode quebrar

1. 8 ajudantes com nome, função fixa e horário.
2. Fila "Depende de você", separada em "Pra decidir" e "Pra informar".
3. Fonte em cada número.
4. Família separada de empresa.
5. O ajudante sugere. Nunca envia, paga, aplica nem apaga.
6. Conta é do banco. A IA só escreve o destaque e a ação.
7. Personagens na cena e 1 cor de destaque (verde).
8. Mudar sem quebrar: mexer em cima do que existe, mesmas telas, mesma ordem, mesmos blocos.

---

## 2. Base técnica já decidida (Diretrizes)

| Peça | Escolha |
|---|---|
| App | React + Vite + TypeScript, instalável na tela de início do iPhone. Uma pasta por tela |
| Banco e login | Supabase (Postgres), projeto novo do produto (Tarefa 2) |
| Tranca | Toda tabela tem `familia_id` e regra de acesso por família e por papel |
| Papéis | `casal`, `membro`, `equipe_casa` |
| Agendamento | Dentro do Supabase (pg_cron) |
| IA | No servidor (função de servidor do Supabase). A chave nunca vai pro app |
| Fuso | America/Recife, fixo. Datas no padrão brasileiro |
| Hospedagem no piloto | GitHub Pages |
| Teste | Sempre na família de exemplo. Nunca escrever no banco real de uma família |

O projeto de hoje no Supabase só é tocado nas Tarefas 1 e 16. Tudo o que estes cadernos criam nasce no projeto novo.

---

## 3. Palavras: tela × banco

| Na tela (família) | No banco e no código | Nunca usar na tela |
|---|---|---|
| ajudante | `funcionario` | agente, robô, IA, bot |
| conferência | `turno` | turno, execução, job |
| relatório | turno com status `entregue` | output, resultado |
| pendência | campo `pendencia` | tarefa, ticket |
| Depende de você | status `precisa_de_voce` e `sem_dados` | bloqueio |
| reserva | colchão | caixa |
| guardado | o que entrou a mais no mês | sobra, lucro |
| relatório resumido | `resumido = true` | modelo leve, teto |

Palavras só do painel do dono do produto: modelo, custo de IA, banco, escala.

---

## 4. Os 8 ajudantes

| id | Nome | Setor | Horário (fuso de Recife) |
|---|---|---|---|
| `contador` | Contador da Casa | Os orçamentos | 1º dia útil do mês, 7h12 (em novembro/2026: segunda, 02/11) |
| `cartao` | Analista de Cartão | Cartões e parcelas | dia seguinte ao fechamento de cada cartão, 8h17 |
| `vencimentos` | Agenda de Vencimentos | Contas com data | quarta, 10h19 |
| `comprador` | Comprador | Feira | segunda, 20h23 |
| `auditor` | Auditor de Estoque | Despensa e cozinha | terça, 7h41 |
| `presenca` | Controlador de Presença | Equipe da casa | segunda, 8h13 |
| `folha` | Folha da Casa | Empregados da casa | dia 3, 9h37 |
| `colchao` | Guardião do Colchão | Reserva | sexta, 17h47 |

---

## 5. Situações do ajudante

| Situação na tela | Valor no banco | Como nasce |
|---|---|---|
| Conferindo agora | `trabalhando` | conferência aberta, sem fim |
| Entregue | `entregue` | conferência fechada com relatório |
| Precisa de você | `precisa_de_voce` | relatório com pendência de decisão |
| Perguntando | `sem_dados` | falta 1 dado; o ajudante faz a pergunta |
| Aguardando | `aguardando` | espera um fato com data (ex.: a 1ª nota da feira) |
| Atrasado | calculado | horário previsto + 30 min passou, ou conferência aberta há mais de 30 min |
| Resumido | `resumido = true` | teto de custo atingido; é um selo sobre "Entregue" |

"Atrasado" e "Resumido" não são valores novos de status. São calculados. São 7 situações ao todo; onde a ficha resumida lista 6, vale esta tabela.

---

## 6. Família de exemplo: família Silva

Todos os cadernos usam estes números nos testes. Não invente outros. Se precisar de um dado que não está aqui, crie, avise no fim do caderno em "Dados que acrescentei" e mantenha a soma coerente.

**Data de referência dos testes:** terça, 24/11/2026, 9h00, fuso de Recife.

| Pessoa | Papel | Observação |
|---|---|---|
| Carlos Silva | `casal` | limite do mês R$ 4.000 |
| Marina Silva | `casal` | limite do mês R$ 3.000 |
| Bia Silva, 12 anos | `membro` | mesada, não vê os pais |
| Léo Silva, 8 anos | `membro` | sem acesso ao app |
| Dona Lúcia | `equipe_casa` | cozinheira, nunca vê valor |
| Seu Jorge | `equipe_casa` | jardineiro, 1 vez por semana, nunca vê valor |

A família tem 2 filhos e 2 pessoas na equipe, como manda a Tarefa 3. Os ajudantes trabalham pra família Silva desde 07/09/2026.

| Dinheiro do mês (novembro) | Valor |
|---|---|
| Limite da casa (Carlos + Marina + Casa) | R$ 12.000 |
| Limite da Casa (feira e despensa) | R$ 5.000 |
| Gasto até 24/11 | R$ 8.240 (69% do limite, com 80% do mês passado) |
| Sobra aparente | R$ 3.760 |
| Contas com data até 30/11 (Agenda) | R$ 1.940 |
| Parte do 13º a guardar em novembro (Folha) | R$ 900 |
| **Livre de verdade** | **R$ 920** (3.760 − 1.940 − 900) |
| Guardado em outubro | R$ 600 |

Regra do livre: livre = limite − gasto − contas com data ainda não pagas − parte da folha a guardar − parte da fatura ainda não lançada como gasto. Na família Silva toda compra no cartão já está lançada como gasto, então a parte da fatura a tirar em novembro é R$ 0 e o livre fecha em R$ 920. Nunca descontar a mesma compra 2 vezes.

| Reserva | Valor |
|---|---|
| Colchão escolhido pela família | R$ 27.000 |
| Gasto semanal de base | R$ 3.000 |
| Semanas de contas pagas hoje | 9 |
| Mês mais apertado dos próximos 3 | janeiro, 6 semanas: (27.000 − 6.000 − 1.780) ÷ 3.000 = 6,4, arredondado pra baixo |
| Contas de janeiro (IPTU, IPVA, material escolar, seguro) | R$ 6.000 |
| Férias da Dona Lúcia que ainda faltam guardar | R$ 1.780 (2.400 − 620) |

| Cartões | Fecha | Vence | Fatura aberta |
|---|---|---|---|
| Cartão azul (Carlos) | dia 25 | dia 5 | R$ 2.150 |
| Cartão verde (Marina) | dia 10 | dia 17 | R$ 1.320 |

Parcelas já contratadas que caem em março/2027: 3, somando R$ 1.400.

| Casa | Valor |
|---|---|
| Mesma cesta desta semana | R$ 1.180 |
| Mediana da cesta em 4 semanas | R$ 1.085 |
| Itens que subiram | 5, somando R$ 140 por mês |
| Carne acima do normal na semana | 3 kg, R$ 120, com visita no sábado |
| Custo da despensa por pessoa por dia | R$ 38 (4 semanas: R$ 35) |
| Dia com visita | R$ 45 a mais |
| Férias da Dona Lúcia em janeiro | R$ 2.400 a pagar, R$ 620 guardados |

| Custo de IA de novembro (só painel do dono) | Valor |
|---|---|
| Teto por família | R$ 2,49 |
| Gasto até 24/11 | R$ 0,44 |
| Contador da Casa (leve + forte no fechamento do mês) | R$ 0,17 |
| Analista de Cartão (leve + forte no fechamento do cartão) | R$ 0,21 |
| Os outros 6 somados, todos no leve | R$ 0,06 |
| Conferências previstas em novembro | 26 |
| Parte da Tarefa 12 (leitura de cupom e fatura) nos R$ 0,44 | R$ 0,00 no exemplo |

---

## 7. Regras de escrita pra quem constrói

1. Português do Brasil, sem travessão, números em algarismo.
2. Nenhum nome ou valor de família real em código, teste ou documento. O repositório é aberto.
3. Texto de tela: curto, com número, sujeito é a casa e nunca a pessoa.
4. Proibido na tela: degradê, efeito vidro, emoji no lugar de ícone, cartão com faixa colorida na lateral, ícone de faísca, mais de 1 botão verde por cartão.
5. Ícones: Lucide, 16 px, traço 1,75.
6. Uma entrega só está pronta com print aprovado no iPhone e no Windows, teste de conta e aviso de segurança zerados, e volta pra versão anterior em 1 clique.
