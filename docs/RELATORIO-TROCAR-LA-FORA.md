# Relatório de entrega: aba "Trocar lá fora" (25/11/2026)

1. **Pedido.** Refazer o painel do iPhone Duo no visual da Central, incluir como aba e deixar pronto para outras
   comparações (o drone, por exemplo), com o máximo possível automático.

2. **Referência usada como "antes".** O arquivo `painel-duo.html` que o dono mandou em 25/11/2026 (título
   "iPhone Duo · Madrid e Recife", total R$ 16.615,27 no cenário padrão).

3. **O que mudou.**
   - Aba nova "Trocar lá fora" no menu do casal, depois de Desejos. No celular fica em "Mais".
   - A conta virou função separada da tela e serve para qualquer aparelho.
   - Várias comparações guardadas, cada uma com preço, câmbio, cartões, regras e fontes. Dá para criar, guardar,
     desfazer, copiar o link e tirar.
   - O câmbio de hoje vem sozinho do Banco Central (boletim público, sem chave).
   - Uma comparação pronta chega por link: abre, confere, guarda.

4. **Arquivos.** 31 arquivos, 3.239 linhas a mais, 1 a menos.
   - Novos em `codigo/src/lib/troca/`: a conta, a leitura do que vem de fora, o link, o câmbio, a comparação nova
     e os formatadores (814 linhas) e os testes (353 linhas).
   - Novos em `codigo/src/componentes/troca/`: os blocos da tela e o estilo (1.283 linhas) e o teste (146 linhas).
   - Novo `codigo/src/telas/trocar/Trocar.tsx` (261 linhas): junta os blocos e cuida de guardar.
   - Novo `codigo/src/api/exemploTrocas.ts` (333 linhas): as 2 comparações da família de exemplo.
   - Alterados para ligar a aba: `lib/rotas.ts`, `componentes/menu.ts`, `componentes/Icone.tsx`, `app/App.tsx`,
     `telas/escritorio/AgenteDaAba.tsx`, `api/tipos.ts`, `api/acoes.ts`, `api/real.ts`, `api/exemplo.ts` (46 linhas).
   - 2 testes antigos ganharam a tela nova nas listas (3 linhas). Ver item 12.

5. **Inventário.** 20 itens no painel original, 20 na tela nova. Nada ficou atrás de "ver detalhes": os 6 blocos que
   abriam e fechavam agora ficam abertos.
   - Mantidos: número grande com e sem imposto; "Pagando com"; linha de pontos ou cashback; chave do imposto; barra
     de 3 fatias; legenda; 4 armazenamentos; venda com campo e régua; aviso de erro; 7 formas de pagar com selo
     "Menos dinheiro"; frase de quem ganha; bônus, preço do milheiro, euro do C6 e spread do PicPay; detalhe da
     conta em 9 linhas; "quanto comprar" no C6; anúncios do usado; 4 passos; frase em espanhol; 8 campos de câmbio e
     imposto; 6 regras; fontes.
   - Mudou: "Restaurar estimativa" virou "Restaurar o que estava guardado". O link da loja saiu do meio da frase e
     foi para o fim do passo. A data do cabeçalho virou "câmbio de 24/11". "O C6 sai R$ X mais caro" não repete
     quando o C6 já é o seguinte.
   - Saiu (só resumo de cabeçalho que fechava): "16", "Avançado", "120% · R$ 14,13" e o "R$ 8.300" do título da
     venda. O valor continua no texto logo abaixo. Motivo: o mesmo número não aparece 2 vezes na página.
   - No exemplo, "no nome da Andreza" virou "de quem vai declarar": o repositório é público e não leva nome real.

6. **Verificação.** `npm run verificar`, dentro de `codigo/`:
   ```
   ✖ 194 problems (0 errors, 194 warnings)
   All matched files use Prettier code style!
    Test Files  146 passed (146)
         Tests  2006 passed | 3 todo (2009)
   ```
   Antes da mudança: 143 arquivos, 1.960 testes, 194 avisos.

7. **Testes novos (46).**
   - `lib/troca/conta.test.ts` (16): cada número do painel original, centavo a centavo; com e sem imposto; cada
     cartão; outra versão; reembolso digitado e zero; cota; venda maior que o aparelho; empate; conta que não fecha.
   - `lib/troca/ler.test.ts` (20): dado quebrado, link perigoso, id com nome interno, pagamento repetido, link que vai
     e volta, link cortado, endereço e resposta do Banco Central, fim de semana sem boletim, comparação nova, outra
     moeda, número digitado.
   - `componentes/troca/troca.test.ts` (10): a tela mostra a conta certa, o selo, a frase, o aviso de erro, todos os
     itens do inventário, os links seguros, e nada aparece com o olho fechado.
   - Bordas testadas: lista vazia de anúncios, valor zero, campo vazio, número que não é número, olho fechado.
   - Bordas não testadas: sem internet no app real, sessão que caiu, 2 celulares guardando ao mesmo tempo.

8. **Vi funcionando** (modo exemplo, navegador de verdade, 390 e 1280, claro e escuro, olho aberto e fechado):
   abrir, ligar e desligar imposto, trocar versão, trocar cartão, régua e campo da venda, erro de reembolso, desfazer,
   buscar câmbio, guardar, nova comparação, link, tirar, sair da aba e voltar. Filha e equipe não veem a aba.

9. **Só li no código.** A gravação no banco real (usa o mesmo caminho das Contas do ano, `config_familia`).

10. **Não verifiquei.**
    - A busca de câmbio no app real pelo navegador do celular (o revisor chamou o endereço do Banco Central e ele
      respondeu, com permissão para qualquer site).
    - A tela em iPhone de verdade.
    - Se um link de 10 mil letras passa inteiro pelo WhatsApp.
    - Sem internet no app real.
    - Os portões (`npm run portoes`), que não fazem parte do `verificar`.

11. **Achei e não mexi.**
    - `codigo/demo.html` (saída do `build:demo`) não está no `.gitignore`.
    - O CLAUDE.md diz que o teto de avisos é 195; o `package.json` cobra 194.
    - `lib/guiaViagemPadroes.ts` guarda o câmbio do dia só num comentário; poderia usar a mesma busca nova.

12. **Dependências, configurações ou testes alterados.** Nenhuma biblioteca e nenhuma configuração.
    2 testes antigos: `f54.test.ts` (a aba entrou na lista de telas do menu do casal e na lista de nomes) e
    `privacidade-global.test.ts` (a tela entrou na lista de telas conferidas com o olho fechado). Nenhuma checagem
    foi tirada ou afrouxada: a tela nova passou a ser cobrada pelas duas.

13. **Revisão independente.** Um revisor que recebeu só o código e o pedido. Conferiu a conta contra o painel
    original em 5 cenários: diferença zero. Achou 12 pontos; 11 corrigidos e com teste (ver o commit "consertos da
    revisão independente"). O que sobrou é decisão do dono (item 14, primeira linha).

14. **Decisões do dono.**
    - O Duo de verdade entra no app pelo link, depois de publicar. Pode publicar?
    - Com o olho fechado, as regras dos cartões e as fontes somem inteiras (contam quais cartões a família tem).
    - Busca automática do preço da loja e do usado: precisa de servidor. Ver a conversa de 25/11/2026.
