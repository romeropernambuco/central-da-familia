# Proposta M · Central da Família

A M mantém no desktop a composição em duas colunas. O escritório e a fila ficam na coluna principal. Rumo a 2029, orçamento, faturas e referências ficam na coluna secundária. A navegação usa a barra lateral nos quadros de 1280 e 1440 px.

## Celular em cinco telas

1. **Abertura.** Saudação e estado do dia, com atalho para a fila ou para o escritório. Quatro cartões mostram saldo em conta, recebimentos garantidos, aplicações e diferença mensal do Plano 2029 com margem. Quando a fonte não disponibiliza uma medida, o cartão diz «Ainda sem dado».
2. **Escritório.** As setas percorrem as sete salas, com foco nos bonecos. «Ver todos» abre uma vista 3D contínua com os 19 postos e rolagem lateral. Cada pessoa aparece no estado informado pelo exemplo. Os postos são acionáveis por toque ou teclado, e a lista «Ver equipe» oferece outro caminho. A ficha abre como folha inferior e fecha com o botão ou Escape. O modo de movimento reduzido e a indisponibilidade de WebGL usam a maquete estática.
3. **Precisa de você.** A fila mostra todas as decisões, priorizando as situações de dinheiro em risco. «Já fiz» conclui na prévia, «Depois» permite retomar em Adiadas e «Abrir» mostra o detalhe disponível. Ações feitas na prévia usam apenas o estado local.
4. **Rumo a 2029.** O trajeto sobe de 2026 até «Viver de rendimentos», com quatro marcos do calendário e uma legenda. O ponto indica a cobertura estimada da meta de renda. A trilha chega a 100%, enquanto o texto mantém a cobertura oficial caso ela ultrapasse a meta.
5. **Motores da família.** «Hoje você pode gastar» ocupa a largura toda. Aplicações, Imóveis, Receitas e Faturas aparecem em dois pares, com ilustrações e uma medida por cartão.

Os blocos partem de 88% da altura útil e crescem com o conteúdo. O palco usa 68% dessa altura. A rolagem é livre e o menu inferior inspirado na E fica visível. A moldura do laboratório acompanha a largura da janela nos dois tamanhos móveis e oferece pelo menos 812 px de altura útil.

## Privacidade e acessibilidade

O olho fechado mascara as medidas e retira o avanço e o ponto proporcional da trilha. A fila troca texto livre por rótulos neutros e protege detalhes já abertos. No escritório, nome, sala e estado ficam disponíveis sob demanda, com a arte livre de letras sobre os bonecos. A M não fornece medidas financeiras a balões ou fichas. O papel equipe recebe apenas o painel do Assessor da Casa, sem números financeiros.

Bricolage Grotesque e Inter mantêm a diferença de hierarquia entre títulos, medidas e rótulos. O verde é o destaque no celular. Texto e ícones identificam os níveis de tarefa. Os alvos têm pelo menos 44 × 44 px. Existe um único h1 por proposta, com foco programático para os destinos do menu.

## Verificação

O Chrome com toque emulado foi usado em 375 × 812 e 390 × 844. A cena mediu 552 e 574 px, respectivamente. A vista geral de 940 px permitiu arrastar a planta na horizontal e abrir uma ficha. O último cartão ficou acessível acima do menu. A geometria e o HTML da composição desktop em 1280 e 1440 px coincidiram com a referência anterior em movimento reduzido. Todos os dados usados são de exemplo ou sintéticos. Celular físico, leitor de tela e desempenho de GPU móvel ficam por verificar.

Para integração futura, o adaptador do Início deve receber família e papel autenticados antes de ler os seletores oficiais. O plano usa `cobre_pct` e `falta_com_margem`. As ações da fila devem usar os destinos e operações válidos de cada tarefa, com retorno de erro e atualização do resumo após a confirmação.
