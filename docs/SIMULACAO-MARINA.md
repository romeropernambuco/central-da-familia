# Simulação: uma pessoa usando a Central do zero (22/11/2026)

**Como repetir:** abra o app de exemplo com `?como=nova` no endereço (ex.: `npm run dev:exemplo` e depois
`http://localhost:5199/?como=nova&dia=2026-11-22`). Entra a Marina, sem família nenhuma, e passa pelo primeiro uso.
Nada é gravado de verdade. Recarregar a página começa de novo.

**A pessoa:** Marina, mora sozinha, salário de R$ 5.000. Tem R$ 100.000 num CDB a 110% do CDI e um apartamento
de R$ 500.000 alugado por R$ 2.500. Limites: R$ 1.200 para ela, R$ 1.000 de feira, R$ 2.300 de casa e R$ 1.000 de reserva.

## O que este documento conclui

1. **O que a pessoa cadastra numa tela não chegava às outras.** O aluguel que chegou ficava só no caderno, e o Início
   dizia "entrou R$ 0". O Escritório não sabia do aluguel atrasado. **Consertado** (lista abaixo).
2. **A conta de 2029 trata toda família como a do dono.** Sem escolher meta nenhuma, a Marina vê "Plano 2029: faltam
   R$ 5.754 por mês", "viver de rendimentos" e "guardar a mais R$ 64.678 por mês". **Depende do dono** (perguntas no fim).
3. **A conta de 2029 supõe que o salário para hoje.** Por isso diz que o dinheiro da Marina acaba em 09/2028, mesmo
   com ela ganhando R$ 5.000 e gastando R$ 4.500. **Depende do dono.**
4. Pequenos tropeços do primeiro uso (nome "Pessoa 1", dois números diferentes para "hoje", "Desfazer" depois de criar
   a família, aluguel "atrasado" 1 minuto depois do cadastro). **Consertados.**

## Consertado nesta rodada (conferido no navegador e com testes)

- O limite de quem cria a família ganha o nome da pessoa ("Marina"), não "Pessoa 1".
- O passo 3 do primeiro uso mostra o mesmo "pode gastar hoje" do Início (era R$ 508,54 lá e R$ 133,33 aqui).
- O primeiro uso não oferece mais "Desfazer" depois de criar a família e pôr os limites.
- Imóvel recém-cadastrado: o aluguel do mês fica "já chegou? marque no caderno" até a família abrir o caderno.
  Antes acusava "atrasado há 12 dias" pelo dia 10, que ninguém escolheu. O aviso no celular já seguia essa regra.
- O aluguel marcado como "chegou" entra no "Entrou" do mês, no Início e em Gastos.
- O Ajudante dos Imóveis pergunta, na aba Guardado, quando um aluguel passa do dia combinado sem chegar.
- O Guardado diz quanto o dinheiro rende por mês ("rende perto de R$ 914,33 por mês, já sem o imposto").
- O Guardado conta os meses cobertos pelo combinado da família inteira (22 meses de R$ 4.500), não só pelo limite
  pessoal (dizia 83 meses de R$ 1.200).
- O atalho "Anotar" do ícone do app abre o Anotar limpo; antes dizia "Veio do Atalho do iPhone" até no Android.
- O modo de exemplo ganhou a família nova (`?como=nova`), vazia, igual ao que o banco cria.

## 2ª rodada: família de 3 (casal e filha), do zero

Marina cria a família e convida o marido Caio (adulto que divide a gestão) e a filha Lia, de 14 anos. Cada um sai e
entra com o próprio e-mail, como no app real (no exemplo, `?como=nova`, e-mails `caio@exemplo.com` e `lia@exemplo.com`,
código 123456).

**Achado grave, consertado:** no app real a lista de convites não existia (só no exemplo). Sem ela, a tela "Família e
ajustes" achava que o casal nunca estava completo e **todo convite saía como adulto do casal**: quem convidasse a filha
dava a ela acesso a todo o dinheiro da família. Agora a lista vem da tabela de membros, e quem convida escolhe
"Adulto que divide a gestão" ou "Filho ou outra pessoa da casa" (o padrão segue quantos adultos a família já tem).

**Também consertado:**
- O cadastro mostrava um campo "Pessoa 2, vira um valor por dia" sem explicar. Agora é "Outro adulto da casa", com a frase
  "de quem você convidar para dividir a gestão; mora só? deixe em branco".
- O Caio entrava e o limite dele continuava "Pessoa 2" para todos. Agora ganha o nome dele na 1ª vez que ele abre o app.
- Depois de convidar, o botão para seguir dizia "Convido depois". Agora diz "Continuar".
- A Lia entrava com "Limite de hoje R$ 0,00" sem explicação. Agora o Início diz "limite do mês ainda não combinado", e
  "Quem está na família" mostra ao casal "Combinar quanto Lia pode gastar por mês".
- "Pessoas da família" dizia "Pessoa da família" para todos. Agora diz "Casal: vê tudo" ou "Pessoa da família: vê só o dela".
- O convite real não vence, mas a tela dizia "vale até" e prometia "vale mais 14 dias" ao reenviar. Agora só o exemplo
  mostra prazo; "Cancelar convite" só aparece onde o app sabe cancelar.
- No exemplo, o Escritório chamava o Caio de "Marina" (o banco real já usa o nome de quem está logado).

**Grupo 1 da fila, feito nesta rodada:**
- Primeiro uso: a renda vem antes dos limites ("Sua renda do mês"), a conta "os limites somam R$ X, sobram R$ Y" aparece
  enquanto a pessoa digita, e a renda vai para Planejamento → Rendas. O fim não fala mais de 2029.
- Anotar mais rápido: o botão do seu limite fica preso no rodapé da folha (à vista sem rolar); os últimos "O que foi?" do
  mês viram botões de 1 toque; data, cartão, parcelas e quem pagou ficam numa gaveta ("Hoje · Pix ou dinheiro"), que abre
  com 1 toque ou sozinha quando algo já mudou.

## O que este documento NÃO resolve

**Depende do dono:**
- A meta de 2029 para quem não é a família do dono (ano e objetivo escolhidos pela família; item 3 da fila).
- Se o salário conta como dinheiro que entra até o ano da meta. Hoje a conta supõe que não.

**Falta fazer (livre, já na fila):**
- O salário cadastrado em "Rendas" não aparece no Início nem vira "entrou" quando cai na conta.
- O aluguel pode ser contado 2 vezes se a pessoa também o cadastrar como receita (origem "Aluguel").
- As despesas do imóvel anotadas no caderno (IPTU, conserto) não pesam no orçamento.
- O Escritório (a sala com os 19) ainda mostra o Ajudante dos Imóveis "ainda sem dado": o aviso novo aparece no
  cartão da aba Guardado. Ligar o estado dele na sala precisa mexer na função do banco que monta o Escritório.
- "Usina" é um funcionário do negócio do dono; para vender, ele precisa de um nome que sirva a qualquer família.
