# Fila de trabalho da Central da Família

Quem programa pega o primeiro item **livre**, de cima para baixo, faz, confere e marca como feito.
Item marcado **(espera o dono)** só anda com o "pode" dele. Pule para o próximo livre.
Dúvida que não trava o item: escolha o caminho mais simples, anote em "Perguntas para o dono" no fim e siga.

Situação em 22/11/2026:
- O banco ainda não tem dados da família. O dono vai cadastrar à mão; no máximo, cola um extrato do banco.
- O site no ar é a pasta `app/` do ramo `fase-final`. Como publicar: memória "como publicar" e a parte 8 das orientações.

## 1. Agora

1. **Publicar o conserto do "Guardar em" do Dinheiro na rua** (espera o dono).
   - Pronto quando: a versão do commit 53e013a está no site oficial e o `sw.js` no ar mostra a versão nova.
2. **Colar extrato do banco** (livre).
   - O dono copia o extrato do app do banco (texto, CSV ou OFX) e cola numa folha do Anotar.
   - O app separa data, descrição e valor, sem mandar nada para serviço externo.
   - A pessoa confere a lista, escolhe o limite de cada linha (o app sugere pelo nome da loja) e salva tudo de uma vez.
   - Linha repetida (mesma data, valor e descrição de um gasto já anotado) aparece marcada e não salva em dobro.
   - Pronto quando: 3 formatos de extrato inventados viram a lista certa nos testes; salvar em lote usa a mesma chave por linha (não duplica se a internet cair); olho fechado esconde tudo; prints em 375 e 1280.
3. **Imóveis alugados** (livre no código; o banco espera o dono).
   - Aluguel do mês por imóvel: nasce sozinho a cada mês; a pessoa marca "chegou" ou ele aparece como atrasado (ideia do OpenProperty).
   - Gastos do imóvel (IPTU, condomínio, obra) no mesmo caderno.
   - Quanto rende por ano sobre o valor do imóvel, ao lado do que o banco pagaria.
   - Pronto quando: na família de exemplo, 7 imóveis mostram recebido, atrasado e rendimento; contas com teste; prints.
   - Precisa da tabela de imóveis no banco (migração f_15, ainda em rascunho).

## 2. Em seguida

1. **Escritório avisa o prazo do Dinheiro na rua**: 15 dias antes e no dia em que vence.
2. **Dinheiro na rua no patrimônio**: aparece numa linha à parte ("na rua"), fora do plano de 2029 até voltar.
3. **Empresas**: o mesmo caderno do Dinheiro na rua, tipo empresa, com a retirada do mês entrando como renda (certa ou incerta).
4. **Investimentos além da renda fixa**: ações, fundos, dólar e previdência com o saldo informado à mão; vencimentos num calendário só.
5. **Etiqueta sem internet**: a troca de etiqueta e o valor em moeda de fora entram na fila de envio, junto com o gasto.

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

1. Rodar as migrações `produto_f_01` a `produto_f_15` (desejos, imóveis, recebimentos, plano, saldos). Como o banco ainda não tem dados da família, é o melhor momento.
2. Decidir a regra das parcelas futuras em 2029.
3. Decidir se apaga `src/propostas/motor/` e `app/mascara.ts`.

## Perguntas para o dono

(Anote aqui o que ficou para ele decidir, com a data. Não pare o trabalho por isso.)

- 22/11/2026: aplicar no banco as migrações f_01 a f_15, já que ele ainda não tem dados da família? Destrava imóveis, desejos, recebimentos e plano.
- 22/11/2026: publicar o conserto do "Guardar em" do Dinheiro na rua (item 1 de "Agora").
- 22/11/2026: os 2 testes de protótipo que falham no GitHub (item 4 de "Qualidade do código").

## Feito

- 22/11/2026: etiquetas de viagem; Dinheiro na rua; tipos frouxos de 343 para 195 avisos; portões rodam no Windows.
