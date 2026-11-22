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
