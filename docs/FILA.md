# Fila de trabalho da Central da Família

Quem programa pega o primeiro item **livre**, de cima para baixo, faz, confere e marca como feito.
Item marcado **(espera o dono)** só anda com o "pode" dele. Pule para o próximo livre.
Dúvida que não trava o item: escolha o caminho mais simples, anote em "Perguntas para o dono" no fim e siga.

Situação em 22/11/2026:
- O banco ainda não tem dados da família. O dono vai cadastrar à mão; no máximo, cola um extrato do banco.
- O site no ar é a pasta `app/` do ramo `fase-final`. Como publicar: memória "como publicar" e a parte 8 das orientações.

## 1. Agora

O plano completo, com o porquê de cada item, está em `docs/ANALISE-DO-TIME.md` (22/11/2026).

1. **Tornar o repositório privado no GitHub** (só o dono: este navegador não tem a conta dele).
   GitHub → o repositório → Settings → Danger Zone → Change visibility → Private. Depois, conferir que a Vercel publica.
2. (feito em 22/11: Anotar mais rápido, ver "Feito")
3. **Meta com ano escolhido pela família** (livre; o dono segue em 2029). A parte "primeiro uso pergunta a renda antes dos
   limites" foi feita em 22/11.
4. **Colar extrato sem internet**: acompanhar a recusa do banco como o Anotar já faz (livre).
5. **Dinheiro na rua no patrimônio**: aparece numa linha à parte ("na rua"), fora do plano de 2029 até voltar.
6. **Salário que caiu na conta vira "entrou"** no Início (hoje só o aluguel e os recebimentos com data entram).
   Saiu da simulação da Marina (`docs/SIMULACAO-MARINA.md`).
7. **Aluguel contado 2 vezes**: travar a receita de origem "Aluguel" quando o imóvel já tem aluguel cadastrado.
9. **Simulações da vida real** (`docs/SIMULACOES-DA-VIDA-REAL.md`): contas do ano com aviso antes, dívidas e parcelas
   fixas, retirada de empresa que falha, fôlego em meses, calote no dinheiro na rua (ordem e detalhes lá).
8. **Ajudante dos Imóveis na sala do Escritório**: hoje o aviso de aluguel atrasado aparece no cartão da aba Guardado;
   o estado dele na sala vem da função do banco que monta o Escritório e ainda diz "ainda sem dado".

## 2. Em seguida

0. **Economia do Trocar lá fora no Início** (o dono disse sim em 25/11/2026): mostrar no Início a economia prevista e
   a confirmada das comparações guardadas (chave `trocas`), sem refazer a conta: usar `lib/troca/brasil.ts`. Só o
   casal. O Início é a referência visual aprovada: mostrar 2 ou 3 jeitos de encaixar antes de publicar.
1. **Empresas**: o mesmo caderno do Dinheiro na rua, tipo empresa, com a retirada do mês entrando como renda (certa ou incerta).
2. **Investimentos além da renda fixa**: ações, fundos, dólar e previdência com o saldo informado à mão; vencimentos num calendário só.
3. **Etiqueta sem internet**: a troca de etiqueta e o valor em moeda de fora entram na fila de envio, junto com o gasto.
4. **Aluguel no Escritório**: o funcionário do Guardado avisa no Início quando um aluguel passa do dia sem chegar.

## 3. Qualidade do código

1. **Dividir o Anotar** (`telas/lancar/Lancar.tsx`, mais de 1.000 linhas) em partes menores, sem mudar nada do que a pessoa vê. Os avisos do verificador têm que cair.
2. **Teste instável** `componentes/ux-cobertura.test.ts`: às vezes falha na verificação completa e passa sozinho. Achar a causa.
3. **Os 3 casos pendentes do motor de 2029** (`lib/futuro/motor_f13.test.ts`) fazem o portão 2 reprovar. Decidir com o dono se entram ou saem (espera o dono).
4. **Verificação no GitHub fica verde** (espera o dono: mexe em teste).
   - Na 1ª rodada no GitHub (22/11/2026), tipos, regras e formatação passaram. Falharam só 2 testes de protótipo:
     `src/propostas/j/proposta.test.ts` e `src/propostas/k/proposta.test.ts`. Eles abrem o Chrome da máquina, e lá
     o Chrome não devolve o resultado do roteiro a tempo. No Windows do dono passam.
   - Caminho sugerido: dar mais tempo ao Chrome nesses 2 testes, ou rodá-los só onde houver navegador configurado.
   - Depois disso, a verificação do GitHub também roda os portões 6, 6b e 7 a cada envio.
5. **Testes de navegador logados** contra um banco de teste (espera o dono: criar o banco de teste).
6. **Aviso de erro** quando o app quebrar no celular de alguém (espera o dono: usa serviço externo).
7. **Notas de versão** em português a cada publicação.

## 4. Do dono (não é programação)

1. Decidir a regra das parcelas futuras em 2029.
2. Decidir se apaga `app/mascara.ts` (o motor 3D de `src/propostas/motor/` fica: todo 3D do painel é importante).

## Perguntas para o dono

(Anote aqui o que ficou para ele decidir, com a data. Não pare o trabalho por isso.)

- 22/11/2026: tornar o repositório privado (item 1 de "Agora"): só o dono consegue.
- 22/11/2026: ligar os avisos no próprio celular (Privacidade → Avisos no celular) para conferir a 1ª entrega às 19h.
- 22/11/2026 (simulação da Marina): família que não escolheu meta vê "Plano 2029" com a meta de exemplo. Para vender,
  o card de 2029 deve esperar a família escolher o ano e o objetivo (item 3 de "Agora")?
- O repositório fica público até a família começar a usar de verdade (decisão do dono, 22/11/2026).
- 22/11/2026: testes antigos com a expectativa mudada para acompanhar consertos (regra 6 do CLAUDE.md pede o "pode"):
  aluguel.test (imóvel com caderno nunca aberto fica "a confirmar"), dadosExemplo.test e feedback.test (o aluguel que
  chegou entra no "Entrou" do mês), donos.test (novo aviso do Ajudante dos Imóveis), pessoas-f25.test (o fim do primeiro
  uso diz "Próximos passos", sem "para 2029"). Nenhum foi apagado nem pulado.

- 22/11/2026: os 2 testes de protótipo que falham no GitHub (item 4 de "Qualidade do código").
- 25/11/2026 (Trocar lá fora): o Duo de verdade entra no app por link, depois de publicar. Buscar sozinho o preço da
  loja e do usado pede servidor (a parte de câmbio já é automática). A aba entrou nas 2 listas de telas dos testes
  (`f54.test.ts` e `privacidade-global.test.ts`), sem afrouxar nada: confirmar. Relatório em
  `docs/RELATORIO-TROCAR-LA-FORA.md`.

## Feito

- 25/11/2026: aba "Trocar lá fora" (pedido do dono na conversa): o painel do iPhone Duo virou tela da Central, serve
  para qualquer aparelho, guarda várias comparações, busca o câmbio do dia no Banco Central e recebe comparação por
  link. Só o casal vê. 46 testes novos. Publicado em 25/11/2026 com o "pode" do dono (sw dc045c2648ba).
- 25/11/2026: Trocar lá fora ganhou "Comprar lá fora ou no Brasil": parcelado sem juros com o dinheiro rendendo,
  economia prevista e economia confirmada ("Já comprei"). Publicado em 25/11/2026 com o "pode" do dono
  (sw d02948948504).

- 22/11/2026: migrações f_01 a f_15 aplicadas no banco, em ordem. 758 testes do banco, 0 falhas. Dados não mudaram.
- 22/11/2026: etiquetas de viagem; Dinheiro na rua; tipos frouxos de 343 para 195 avisos; portões rodam no Windows.
- 22/11/2026: conserto do "Guardar em" do Dinheiro na rua publicado (sw 0d2b80d3abfc).
- 22/11/2026: Colar extrato do banco no Anotar (texto, CSV e OFX; sugere o limite; não salva repetido).
- 22/11/2026: Caderno do aluguel em cada imóvel alugado: "chegou" mês a mês, atrasado pelo dia combinado,
  despesas do imóvel e o que sobrou no ano em % do valor. Resumo do mês no topo dos Imóveis.
  Guarda na configuração da família (`aluguel_caderno`), sem mudar o banco.
- 22/11/2026: o Gestor do Guardado avisa o prazo do Dinheiro na rua: 15 dias antes, no dia (aviso próprio, volta mesmo
  se já respondeu antes) e depois que passou. Só com dinheiro ainda fora; respeita o silêncio das 22h às 7h.
- 22/11/2026: análise do time (5 especialistas + Codex) em `docs/ANALISE-DO-TIME.md`. Consertos do Codex no código do dia:
  aluguel contado em dobro, extrato "amount" de conta, data impossível no extrato, toque duplo na despesa, olho fechado
  na ficha do negócio e no aviso do fundo garantidor.
- 22/11/2026 (com o "pode" do dono): correção das etiquetas na cópia de segurança aplicada; portas fechadas no banco
  (apagar a família só pela função, com o nome escrito; entrada antiga da equipe desligada); as 3 migrações das
  etiquetas, que só estavam no banco, gravadas no repositório.
- 22/11/2026: Dinheiro na rua e caderno do aluguel em tabelas (cada gravação muda só o que mudou; 2 celulares não
  perdem nada; aluguel 1 por mês; "Guardar em" numa operação só). Autoteste no banco.
- 22/11/2026: avisos no celular: função do servidor avisos-celular, todo dia às 19h, sem valor e sem nome; cifra
  conferida com o exemplo oficial da RFC 8291. Atalhos no ícone do app (Anotar, Gastos, Guardado).
- 22/11/2026: protótipos sem 3D (A a I e K) apagados; J, L, M e o motor 3D ficam (marcação arquivo-propostas-2026-11-22).
- 22/11/2026: simulação de uma pessoa do zero (`?como=nova`, `docs/SIMULACAO-MARINA.md`) e 9 consertos: nome da
  pessoa no limite, mesmo "hoje" no primeiro uso e no Início, sem "Desfazer" no cadastro, imóvel novo "a confirmar",
  aluguel que chegou entra no mês, Ajudante dos Imóveis avisa atraso, Guardado diz quanto rende por mês e conta os
  meses pelo combinado da família, atalho do ícone abre o Anotar limpo.
- 22/11/2026: simulação com casal e filha (docs/SIMULACAO-MARINA.md, 2ª rodada). Consertado: convite real sempre saía como
  adulto do casal (filha via tudo); quem convida escolhe adulto ou filho; lista "Quem está na família" no app real; limite
  "Pessoa 2" ganha o nome; filha com limite zero explicado. Anotar mais rápido (salvar preso no rodapé, últimos "O que
  foi?" em 1 toque, detalhes numa gaveta) e primeiro uso com a renda antes dos limites. Teto de avisos caiu para 194.
- 22/11/2026: "Não me pagou" no caderno do aluguel (migração 20261122111629, autoteste e 752 testes do banco ok):
  providência, volta, quem cuida, dívida e andamento; plano e Início param de contar com o aluguel até a volta;
  celular não avisa o atraso registrado e avisa lembrete do dia; Secretária lembra de cobrar o advogado.
- 22/11/2026 (decisão do dono): o salário de Rendas entra na conta de 2029 todo mês até dez/2028; a sobra vai para o
  guardado; de 2029 em diante só o que rende. Fim do alarme falso "caixa abaixo do piso" de quem ganha mais do que gasta.
