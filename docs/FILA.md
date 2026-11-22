# Fila de trabalho da Central da Família

Quem programa pega o primeiro item **livre**, de cima para baixo, faz, confere e marca como feito.
Item marcado **(espera o dono)** só anda com o "pode" dele. Pule para o próximo livre.
Dúvida que não trava o item: escolha o caminho mais simples, anote em "Perguntas para o dono" no fim e siga.

Situação em 22/11/2026:
- O banco ainda não tem dados da família. O dono vai cadastrar à mão; no máximo, cola um extrato do banco.
- O site no ar é a pasta `app/` do ramo `fase-final`. Como publicar: memória "como publicar" e a parte 8 das orientações.

## 1. Agora

1. **Dinheiro na rua no patrimônio**: aparece numa linha à parte ("na rua"), fora do plano de 2029 até voltar.

## 2. Em seguida

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

1. Aplicar a correção que devolve as etiquetas à cópia de segurança:
   `banco/migracoes/20261122120000_produto_etiquetas_no_exportar_depois_da_f03.sql` (pronta; espera o "pode").
2. Ligar o botão "apagar a família" (função `apagar_familia`, do pacote `revisao/sql/RODAR_NO_SUPABASE.sql`, bloco 2).
3. Decidir a regra das parcelas futuras em 2029.
4. Decidir se apaga `src/propostas/motor/` e `app/mascara.ts`.

## Perguntas para o dono

(Anote aqui o que ficou para ele decidir, com a data. Não pare o trabalho por isso.)

- 22/11/2026: aplicar a correção das etiquetas na cópia de segurança (item 1 de "Do dono").
- 22/11/2026: os 2 testes de protótipo que falham no GitHub (item 4 de "Qualidade do código").

## Feito

- 22/11/2026: migrações f_01 a f_15 aplicadas no banco, em ordem. 758 testes do banco, 0 falhas. Dados não mudaram.
- 22/11/2026: etiquetas de viagem; Dinheiro na rua; tipos frouxos de 343 para 195 avisos; portões rodam no Windows.
- 22/11/2026: conserto do "Guardar em" do Dinheiro na rua publicado (sw 0d2b80d3abfc).
- 22/11/2026: Colar extrato do banco no Anotar (texto, CSV e OFX; sugere o limite; não salva repetido).
- 22/11/2026: Caderno do aluguel em cada imóvel alugado: "chegou" mês a mês, atrasado pelo dia combinado,
  despesas do imóvel e o que sobrou no ano em % do valor. Resumo do mês no topo dos Imóveis.
  Guarda na configuração da família (`aluguel_caderno`), sem mudar o banco.
- 22/11/2026: o Gestor do Guardado avisa o prazo do Dinheiro na rua: 15 dias antes, no dia (aviso próprio, volta mesmo
  se já respondeu antes) e depois que passou. Só com dinheiro ainda fora; respeita o silêncio das 22h às 7h.
