# Central da Família: o que um time faria para virar produto

Análise de 22/11/2026. Cinco especialistas trabalharam em paralelo: código, banco e segurança, produto e uso, mercado e venda, inovação. O Codex fez uma revisão independente do código. Eu conferi no código os achados principais antes de pôr aqui. Onde não conferi, está escrito.

A pergunta que este documento responde: **o que falta para a Central funcionar bem para a sua família e poder ser vendida a outras famílias, e em que ordem fazer.**

---

## O que este documento conclui

**Andamento em 22/11/2026, com o "pode" do dono:**
- **Feito:** 3 das 4 portas (apagar a família só pela função; entrada antiga da equipe desligada; etiquetas gravadas
  no repositório); correção das etiquetas na cópia de segurança; Dinheiro na rua e aluguel em tabelas; avisos no
  celular; protótipos sem 3D apagados.
- **Falta, só o dono:** tornar o repositório privado no GitHub.

1. **Há 4 portas abertas que precisam ser fechadas antes do primeiro cliente.** Nenhuma delas afeta você hoje, porque só a sua família usa. Com um cliente pagante, qualquer uma delas mata o produto. Todas dependem do seu "pode", porque mexem no banco real ou no GitHub.
   - **Qualquer adulto do casal apaga a família inteira com um comando**, sem lixeira e sem volta. Confirmei: `banco/migracoes/..._produto_05...sql`, linhas 42 e 43. A confirmação de digitar o nome existe só na tela; quem chama o banco direto pula ela.
   - **A entrada antiga da equipe aceita só um código de 4 números**, que vale para todas as famílias ao mesmo tempo. Com muitas famílias, um estranho pode cair como "equipe" na casa de outra. O conserto já está escrito (bloco 6 de `banco/sql/RODAR_NO_SUPABASE.sql`).
   - **Um e-mail pessoal está gravado num arquivo do repositório, e o repositório é público.** Confirmei: `banco/migracoes/20261107044716_formato_dos_paineis_e_convites.sql`. O caminho mais simples é tornar o repositório privado.
   - **O banco real e o repositório já não batem.** As tabelas de etiquetas existem no banco e não existem em nenhum arquivo do repositório. Hoje não dá para recriar o banco do zero a partir do código. Isso tem que ser consertado antes de existir um banco de teste.

2. **Dinheiro na rua, caderno do aluguel e folha da casa precisam sair do "arquivo único" e virar tabelas próprias no banco. E tem que ser agora, enquanto o banco está vazio**, porque agora custa pouco e com clientes custa caro.
   - Hoje cada um desses é um arquivo único (JSON) que o app regrava inteiro a cada mudança.
   - **O Codex reproduziu a perda:** dois celulares salvando quase ao mesmo tempo, e a mudança de um some sem aviso. Para você e sua esposa é raro. Para mil famílias é diário.
   - Com tabelas, o banco também passa a achar sozinho os prazos e os aluguéis atrasados, o que o Escritório vai precisar.

3. **O app foi feito para a sua família, e isso aparece em todo lugar.** Um estranho não consegue usar sozinho.
   - **"2029" está fixo em 439 lugares do código e do banco**, inclusive no nome de campos (`gasto_2029_hoje`). Para outra família, o ano é outro. A meta precisa virar "viver de renda em ___", com o ano escolhido pela família. Para você, continua 2029.
   - **O primeiro uso pede os limites de gasto antes de perguntar quanto a família ganha.** A pessoa chuta. Depois manda a pessoa para "Planejamento", mas ela vai procurar em "Meu orçamento". Confirmei as duas coisas no código.
   - **No Anotar, o botão de salvar fica meia tela abaixo**, escondido atrás de etiqueta, moeda de fora e forma de pagamento.
   - **Proposta sem tirar nada seu:** três níveis de uso.
     - "Dia a dia": Início curto, Anotar, Gastos, Orçamento e Cartões.
     - "Patrimônio": acrescenta Guardado, Desejos e Casa.
     - "Completo": é o app de hoje, intacto.
     - Família nova começa no "Dia a dia". Você fica sempre no "Completo".

4. **Nada chama a pessoa de volta ao app.** Não há notificação, nem atalho no ícone, nem a opção "compartilhar com a Central" no celular (confirmei: o manifesto do app não tem nenhuma das duas coisas). O aviso de prazo do Dinheiro na rua que fiz hoje só aparece para quem abre o app. **Este é o item que mais pesa no uso diário**, para você e para qualquer cliente.

5. **O que só a Central tem é o que vende. Família com casa grande ninguém atende.**
   - Os concorrentes no Brasil (Mobills, Organizze, Minhas Economias, Meu Dinheiro) são feitos para uma pessoa, no máximo um casal. **Nenhum trata empregada doméstica, imóvel alugado ou dinheiro emprestado a parente.**
   - São 1,3 milhão de empregados domésticos com carteira no Brasil (Agência Brasil, abril de 2026).
   - **O preço que o mercado aceita:**
     - Os concorrentes cobram de R$ 100 a R$ 480 por ano.
     - O Meu Dinheiro já cobra por família: R$ 29,90 por mês com 3 pessoas.
     - Faixa defensável para a Central: **R$ 29,90 por mês no plano Família e R$ 49 a R$ 59 por mês no plano Casa completa** (empregados, imóveis e dinheiro na rua). Isso é estimativa do especialista de mercado, não teste com cliente.
   - **A lição do Guiabolso:** era grátis, tinha 6 milhões de usuários, vivia de vender crédito, foi comprado pelo PicPay e desligado em 2022. **App que não cobra do usuário vira vitrine de banco.**

6. **Não ligar ao banco (Open Finance) agora.**
   - Um app pequeno não pode se ligar sozinho. Precisa de um intermediário autorizado, e o mais acessível (Pluggy) começa em R$ 2.500 por mês.
   - Só para cobrir esse mínimo seriam umas 85 famílias pagando R$ 30.
   - **O colar extrato e a foto do cupom, que já existem, cobrem a maior parte disso**, e mantêm a frase que vende: "nada da sua família sai daqui".
   - Ligar o Open Finance quando passar de 100 a 150 famílias pagando, como um extra.

7. **Cuidado com a regra da CVM.**
   - Comparar com o banco e mostrar quanto rendeu é relatório, e isso pode.
   - **Se um funcionário do Escritório disser "aplique em tal coisa", vira consultoria de investimento**, que exige registro.
   - O app nunca pode recomendar produto específico, e o plano de renda precisa dizer que é estimativa e não recomendação. Hoje o plano já diz que é estimativa. Falta o aviso de "não é recomendação".
   - **Também precisam de termos de uso:** os dados dos empregados (salário, CPF) são de terceiros e precisam estar cobertos neles.

8. **As 3 ideias novas que fariam alguém pagar e indicar a um amigo.** O especialista em inovação propôs 10.
   - **Pasta do Dia Seguinte.** Responde à pergunta "se eu morrer amanhã, minha esposa sabe onde está tudo?". Um funcionário novo monta aos poucos o mapa de contas, aplicações, imóveis, quem deve à família e com quem falar. Senha não entra. É compra de casal, e a pessoa indica com uma frase: "fiz pela minha esposa".
   - **Cobrador Educado** (rápido de fazer, porque o Dinheiro na rua já existe). No prazo, o Escritório escreve 3 versões de lembrete para o parente ou o sócio, no jeito de falar daqui. A pessoa manda pelo WhatsApp dela, e o app anota "cobrado em tal dia".
   - **Reunião do Mês.** No dia 1, cada funcionário apresenta um cartão: o que fugiu do limite, o aluguel atrasado, quanto rendeu, quanto falta para a meta. O casal responde com um toque e o fechamento do mês termina em 5 minutos.
   - **A ideia ousada: "Cartório de Boca".** A Central vira o lugar onde se registra o combinado de boca: o empréstimo ao primo, a sociedade no bar, o aluguel sem contrato. As duas partes dão o "de acordo" por um link. Cada acordo traz mais uma pessoa para o app. **Precisa de advogado antes de prometer que vale como prova.**

9. **O código está bom para uma pessoa com IA tocando, mas tem dívidas que travam um time.**
   - 33 arquivos com mais de 400 linhas. O Anotar tem 1.116 e a Casa tem 1.350.
   - **O Escritório 3D é uns 20% do app** e baixa 512 KB só da biblioteca 3D. **Decisão do dono (22/11): tudo que é 3D do painel é importante e fica como está.** O trabalho no 3D é por dentro: tipos certos e desempenho em celular simples, sem tirar nada da cena.
   - **O dinheiro é calculado de dois jeitos.** O plano de 2029 usa centavos exatos; o resto do app usa número quebrado, que pode errar 1 centavo (o Codex mostrou 10,075 virar 10,07). Proposta: um único jeito, em centavos.
   - **Um ponto sobre o meu próprio trabalho, conferido em 22/11.** A queda dos avisos do verificador de 343 para 195 foi real: os 2 commits que baixaram o teto (646ad4b e d1f6e4d) tiraram 77 e 58 tipos frouxos, sem desligar nenhuma regra. À parte disso, 15 arquivos da cena 3D têm a regra de tipos desligada no arquivo inteiro desde 21/11 (154 tipos frouxos fora da conta). Esses arquivos são importantes: o conserto é dar tipo certo a eles, sem mudar a cena.
   - **Protótipos (feito em 22/11, com o "pode" do dono).** Saíram os 10 sem 3D (A a I e K). Ficaram J (o padrão mínimo do Escritório), L, M e o motor 3D. Todos continuam guardados na marcação git `arquivo-propostas-2026-11-22`.

10. **O que já consertei hoje, dos achados do Codex.** Eram defeitos do código que fiz hoje; já estão testados e serão publicados junto com este relatório.
    - **Aluguel contado em dobro** quando o mesmo mês era marcado em 2 celulares: agora conta 1 vez.
    - **Extrato em inglês de conta corrente** (coluna "amount") que trocava compra por entrada: agora só é tratado como fatura quando quase tudo é positivo.
    - **Linha do extrato com data impossível** (31/02) que pegava a data da linha de cima: agora é ignorada.
    - **Despesa do imóvel anotada 2 vezes com toque duplo:** travado.
    - **Olho fechado:**
      - o título da ficha do negócio não diz mais se deu lucro ou perda;
      - o aviso do fundo garantidor não diz mais que o saldo passou de R$ 250 mil.

---

## Camada 1: o mercado

- **Concorrentes no Brasil.** Todos os dados foram vistos em 22/11/2026.
  - Mobills: R$ 99,90 por ano, diz ter 12 milhões de usuários e vive em parte de anúncio.
  - Organizze: de R$ 29,90 a R$ 79 por mês, sem plano grátis.
  - Minhas Economias: grátis, ou R$ 199,90 por ano.
  - Meu Dinheiro: plano Família de R$ 29,90 por mês com 3 pessoas, e importa extrato.
- **Lá fora:**
  - YNAB: US$ 109 por ano, até 6 pessoas.
  - Monarch: US$ 99 a 199 por ano, com a casa inteira.
  - Honeydue: grátis, para casal.
- **Os bancos (Nubank, Itaú) já mostram de graça as contas de outros bancos.** Mostrar tudo junto deixou de ser motivo para pagar. O que ainda vale dinheiro é organizar a vida da casa, e é isso que a Central faz.
- **Quem pagaria**, do mais quente ao mais frio:
  1. família com empregado doméstico;
  2. pequeno investidor com imóvel alugado e negócio informal;
  3. casal de classe média, que é o maior grupo e o que mais briga por preço.
- **Os 3 caminhos de venda para um fundador sozinho:**
  1. **10 famílias por indicação, cobrando desde o primeiro dia**, com você ajudando a implantar. Medir quem continua usando depois de 60 dias.
  2. **Contadores que já fazem o eSocial da empregada e o imposto de renda.** Eles ganham um painel dos clientes e o app ganha quem vende por ele. O especialista sugere uma licença de R$ 15 a 20 por família atendida.
  3. **Conteúdo sobre dinheiro da casa** (empregada, aluguel, empréstimo a parente), com lista de espera e oferta de fundador vitalício para os primeiros 50 a 100 clientes.

## Camada 2: o app hoje

**O que está bem e não precisa mexer:**
- A separação entre famílias está bem feita no banco: todas as tabelas têm tranca por família.
- As funções sensíveis conferem quem está chamando.
- A equipe não vê valor nenhum.
- As fotos de nota ficam na pasta de cada família.
- O app já junta o que outro celular mudou antes de salvar, e avisa quando isso acontece. A falha que o Codex achou é a sobra disso: os dois gravando quase no mesmo segundo.
- São 1.945 testes automáticos passando. Poucos apps de uma pessoa só têm isso.

**O que falta para ser produto:**
- Cadastro sozinho. Hoje ninguém novo consegue criar conta, e o bloco que libera depende de separar antes o sistema antigo dos painéis, que está no mesmo banco.
- Cobrança: não existe nada no banco.
- Apagar a família e a conta, como manda a LGPD, inclusive as fotos de nota; hoje isso não está aplicado. Também falta registrar que cada pessoa aceitou o termo.
- Banco de teste separado. Hoje os testes da madrugada rodam no banco de verdade.
- Aviso de erro quando o app quebrar no celular de alguém. Hoje nenhum erro chega a lugar nenhum.
- **"Guardar em" do Dinheiro na rua grava em 2 passos.** Se a internet cair no meio, fica pela metade. O Codex achou; está no plano.
- **O "Colar extrato" sem internet** marca o gasto como guardado antes de o banco confirmar. Se o banco recusar depois, o gasto some sem aviso. O Codex achou; está no plano.

## Camada 3: o plano, em ordem

Cada etapa é feita por mim (ou pelo Codex), verificada, revisada por outro agente e publicada. **O que precisa do seu "pode" está marcado.**

1. **Fechar as 4 portas.** Seu "pode": banco real e GitHub.
   - tirar o "apagar direto";
   - fechar a entrada antiga da equipe;
   - tornar o repositório privado;
   - gravar no repositório as tabelas de etiquetas que estão só no banco;
   - aplicar a correção das etiquetas na cópia de segurança.
2. **Tabelas no lugar dos arquivos únicos** para Dinheiro na rua, aluguel e folha da casa, com a gravação do "Guardar em" num passo só. Seu "pode": banco real.
3. **Notificações, atalhos no ícone e "compartilhar com a Central".**
   - Notificação no celular: "ainda pode gastar R$ X hoje", "fatura vence amanhã", prazo do Dinheiro na rua, aluguel atrasado.
   - Seu "pode": a notificação passa pelo serviço do Google ou da Apple; o texto dela pode ir sem valor.
4. **Anotar mais rápido:** botão de salvar sempre à vista, os últimos "O que foi?" como botões de toque, detalhes recolhidos. Sem mudar o que existe.
5. **Meta com o ano escolhido pela família e primeiro uso refeito.** Para você continua 2029.
6. **Níveis de uso** (Dia a dia, Patrimônio, Completo) para famílias novas. Você fica no Completo.
7. **Cobrador Educado e Reunião do Mês**, as duas ideias mais baratas e que mais mostram o Escritório trabalhando.
8. **Qualidade do código:**
   - um só jeito de contar dinheiro, em centavos;
   - dividir os arquivos gigantes, a começar pelo Anotar;
   - dar tipo certo aos 15 arquivos da cena 3D e religar a regra, sem mudar a cena.
9. **Para vender:**
   - cadastro sozinho;
   - cobrança;
   - termos de uso e privacidade com o aviso de que não é recomendação de investimento;
   - apagar a família;
   - banco de teste separado.
   - Seu "pode": serviço de pagamento e serviço pago.
10. **Pasta do Dia Seguinte**, a ideia que mais vende.

## O que este documento NÃO responde

- **O que ninguém sabe ainda:** quanto uma família de fato pagaria. Nada disso foi testado com cliente. Os preços são estimativa.
- **O que dá para descobrir:**
  - as configurações de login do Supabase (e-mail confirmado obrigatório, login anônimo);
  - se o plano do Supabase guarda cópias e volta no tempo;
  - o preço exato da Pluggy acima de 500 conexões.
- **O que depende de você:**
  - quais famílias seriam as 10 primeiras;
  - se quer vender direto ou por contadores;
  - se aceita o "Cartório de Boca" como direção;
  - a regra das parcelas em 2029, que já está na fila.
- **O que precisa de advogado:** a leitura sobre a CVM e o "Cartório de Boca" valendo como prova.
- **O que não foi medido:** a cena 3D num celular simples, e um estranho usando o app de verdade (só houve leitura do código e o modo exemplo).
