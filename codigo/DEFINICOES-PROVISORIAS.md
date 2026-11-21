# Definições provisórias para o dono confirmar

Cada linha é uma regra que uma frente de melhoria precisou definir sozinha. Nenhuma altera o banco. Confirme, mude ou recuse cada uma.

## Receitas de empresas e novos negócios

PROVISÓRIA — A recorrência mantém o valor nominal e a cadência do mês original; fim inclusivo, limitado a dez/2031; dia do recebimento não é previsto porque o cadastro só tem mês; para evitar reajustes e dias inventados; lib/futuroReceitas.ts: mesesDaReceita e prepararReceitas.
PROVISÓRIA — Mudar o mês desloca só a primeira ocorrência, sem mudar a cadência da série; preserva a regra existente de adiamento e evita mover toda a série sem decisão do dono; lib/futuroReceitas.ts: prepararReceitas, telas/planejamento/Recebimentos.tsx: MudarReceb.
PROVISÓRIA — A chave receitas_controle guarda por recebimento valor em centavos, atualizado_em e recebidas por mês original com data e valor real; o banco quita só a primeira ocorrência e as confirmações seguintes não criam linhas; mantém o contrato fixo fontes_receita e evita contagem duplicada; api/tipos.ts: ControleReceitas, lib/futuroReceitas.ts: prepararReceitas, app/useFontesReceita.ts.
PROVISÓRIA — Editar valor muda todas as ocorrências ainda pendentes, sem reajuste automático e sem alterar valores reais já conferidos; o valor da série fica em receitas_controle e a linha original do banco permanece; não há nova coluna nem mudança na API de recebimentos; telas/planejamento/Recebimentos.tsx: salvarFonte, lib/futuroReceitas.ts: prepararReceitas.
PROVISÓRIA — Sem metadados mantém o comportamento atual; cadastro sem tocar nas perguntas novas continua único e usa certo do banco; Com tudo inclui também os incertos antigos e Com previstos só promove prováveis com metadados; evita atribuir probabilidade sem o dono; telas/planejamento/Recebimentos.tsx: salvarNovo, lib/futuroReceitas.ts: prepararReceitas.
PROVISÓRIA — Receitas até dez/2031 são ocorrências finitas; o motor atual só conta as entradas até dez/2028 e não converte receita de empresa pós-2028 em renda perpétua; não inventa sustentabilidade de renda nem altera o motor; componentes/CenariosReceitas.tsx, app/useCenarioReceitas.ts.
PROVISÓRIA — Faltam/sobram por mês inclui a margem do Objetivo; quando cobre informa se cobre a meta de jan/2029, sem inventar uma data de independência antecipada; usa corte e rendaSustentavel do motor; componentes/CenariosReceitas.tsx.
PROVISÓRIA — Última atualização é a data do cadastro/edição da fonte e valor; sem data aparece pedido de conferência, sem prazo automático para vencer; não inventa um intervalo de validade; telas/planejamento/Recebimentos.tsx: concluir e salvarFonte.

## Rumo a 2029

- PROVISÓRIA — Rumo a 2029 exclui `renda_certa_2029` sem origem, salários e verbas; evita depender de salário ou duplicar aluguel, sem alterar o objetivo original; `src/lib/rumo2029.ts:preparar`.
- PROVISÓRIA — Só receitas mensais de empresa/negócio com certeza garantida e `certo=true`, início válido e duração de pelo menos 12 meses compõem a cobertura; sem fim presume continuidade, explicitamente a confirmar; anuais ficam fora da cobertura mensal (pagamentos certos anteriores à data compõem o capital); `src/lib/rumo2029.ts:receitasNoMes/preparar`.
- PROVISÓRIA — Origem aluguel em recebimentos fica fora deste painel para evitar duplicidade com imóveis; sem classificação, recebimentos certos anteriores a 2029 seguem no capital do motor, mas nunca viram renda recorrente; `src/lib/rumo2029.ts:preparar`.
- PROVISÓRIA — Cobertura compara renda com gasto corrigido pelo motor, sem a margem patrimonial; a margem permanece visível e nas sugestões originais do motor; `src/lib/rumo2029.ts:medir`.
- PROVISÓRIA — “Quando cobre” compara cenários de início da vida de rendimentos em cada mês até dez/2031, mantendo teto e fluxos até cada data; não é simulação de retiradas após aposentadoria nem garantia dos meses seguintes; faltas de taxa em anos futuros repetem a última Selic/IPCA informada, sempre declarado; `src/lib/rumo2029.ts:preparar/calcularRumo`.
- PROVISÓRIA — Alavancas são cenários independentes ordenados pela melhora da diferença renda menos gasto em 2029, com até três resultados positivos; guardar/cortar usam o ajuste original do motor sem receitas recorrentes, contrato mantém aluguel/custos/vacância e antecipação presume ausência de custo; `src/lib/rumo2029.ts:calcularRumo`.
- PROVISÓRIA — Frescor mede dias de calendário no fuso da família, verde 0–30, âmbar 31–60 e vermelho acima de 60; data ausente, futura ou inválida é sem conferência e não é chamada de “mais de 60 dias”; `src/app/useNumerosAtualizados.ts:frescor`.
- PROVISÓRIA — Salvar imóvel existente ou alterar recebimento existente confirma a data após sucesso; aplicação só confirma no movimento `saldo_conferido` (aporte/resgate não conferem saldo); observação local persiste durante a navegação aos formulários, sem alterar resultados da operação; novos itens sem ID retornado dependem de conferência explícita; `src/app/useNumerosAtualizados.ts:acompanharConferencias`.
- PROVISÓRIA — Modo exemplo guarda conferências somente na memória desta demonstração e não produz aviso de números antigos; `src/app/useNumerosAtualizados.ts:marcarConferencia` e `src/componentes/RumoA2029.tsx`.
- PROVISÓRIA — A folha reutiliza edição de imóveis e oferece os destinos existentes do Gestor/recebimentos; saldo em conta não tem formulário disponível e recebimentos não permitem editar valor, limitações expostas sem fabricar atalhos; `src/componentes/AtualizarNumeros.tsx`.
- PROVISÓRIA — Valores de receitas de empresas são os cadastrados, sem modelo de impostos/despesas do negócio; a tela pede confirmar o líquido disponível para a família; após jan/2029 a referência passa a ser o mês atual, sem reconstituir saldo histórico; src/lib/rumo2029.ts:calcularRumo e src/componentes/RumoA2029.tsx.

---

- PROVISÓRIA — Resgate usa `destino_no_vencimento: 'caixa'` por padrão, sem rendimento; `'referencia_familia'` é opção explícita, para evitar presumir reinvestimento e conservar o saldo líquido; código: `src/lib/futuro/tipos.ts`, `f4_linha.ts`.
- PROVISÓRIA — Por decisão do dono, `parametros.taxa_individual_sem_vencimento` tem padrão false/ausente: mantém taxa familiar e IR global sem vencimento; true usa taxa/IR próprios quando há taxa (inclusive zero), com data estimada de IR no último dia antes da virada, sem resgate fictício; o dono deve decidir se liga o parâmetro depois de rever os resultados; código: `src/lib/futuro/tipos.ts`, `index.ts`, `f4_linha.ts` (`carteira`), `f1_rendimento.ts`.
- PROVISÓRIA — IR do produto continua como desconto na taxa anual (convenção de F1/oráculo), sem nova retenção no resgate, para não tributar duas vezes nem mudar silenciosamente o modelo; código: `src/lib/futuro/f1_rendimento.ts`, `f4_linha.ts`.
- PROVISÓRIA — Dia do vencimento e dia inicial pertencem ao produto; reaplicação de referência rende apenas nos dias posteriores ao vencimento, para tratar datas no meio do mês sem duplicar dias; código: `src/lib/futuro/f1_rendimento.ts`, `f4_linha.ts`.
- PROVISÓRIA — Entradas novas vão à referência; saídas consomem referência positiva, caixa parado e produtos por id, com excesso negativo sem rendimento, para não render sobre dinheiro gasto; não representa liquidez contratual; código: `src/lib/futuro/f4_linha.ts` (`carteira`).
- PROVISÓRIA — Regime mensal fixo não acrescentado, para preservar dias/365 e não inferir modalidade contratual sem fonte; paridade 01/02 fica pendente explicitamente; código: `src/lib/futuro/f1_rendimento.ts`, `motor_f13.test.ts`.
- PROVISÓRIA — Prazo do imóvel é distância em meses desde hoje (zero vencido/no mês final, null sem contrato datado); impacto sem renovação é perda anual potencial de 2029 versus renovar até dezembro, limitada por venda confirmada e fora da renda certa, para separar hipótese de receita; código: `src/lib/futuro/f11_imoveis.ts`, `tipos.ts`, `index.ts`.
- PROVISÓRIA — Dívidas permanecem sem série no adaptador por ausência de fonte no `FuturoBanco` examinado; o núcleo continua aceitando `{mes, valor}`; não inventar dados nem equiparar parcelas de envelope a dívidas; código: `src/lib/futuroReceitas.ts` (`entradaDoBanco`), `src/lib/futuro/f4_linha.ts`.

---

PROVISÓRIA — Resumo realizado: soma lançamentos não apagados com data até hoje no mês selecionado, entradas anotadas em config_familia.entradas e recebimentos pela data recebida (valor recebido, ou valor cadastrado se ausente); saldo = entrou − saiu, não saldo bancário; para separar registro de previsão sem mudar as regras dos lançamentos; codigo/src/telas/lancamentos/Lancamentos.tsx, totaisDoMes.
PROVISÓRIA — Previsto: recebimentos certos ainda pendentes cujo mês vigente (mes_novo ou mes_previsto) seja o mês selecionado, incluindo atrasados daquele mês, sem somá-los ao saldo realizado; porque a fonte só fornece mês e não dia de vencimento; codigo/src/telas/lancamentos/Lancamentos.tsx, totaisDoMes.
PROVISÓRIA — Entradas anotadas e recebimentos são registros independentes, sem deduplicação por valor ou descrição; não há vínculo entre as duas fontes e uma deduplicação por aproximação poderia esconder dinheiro; codigo/src/telas/lancamentos/Lancamentos.tsx, totaisDoMes.
PROVISÓRIA — “O gás acabou” acrescenta “Gás de cozinha” à lista pela ação existente acabou, com confirmação e espera cancelável de seis segundos; porque troquei_gas registra uma troca que ainda não aconteceu; codigo/src/telas/casa/Casa.tsx, CasaEquipe.
PROVISÓRIA — Estoque sem conferência registrada significa item ativo sem qualquer contagem no histórico disponível, não estoque de hoje nem confirmação por padrão; para tornar a ausência de registro visível sem decidir conferido versus não conferido; codigo/src/telas/casa/Casa.tsx, EstadoEstoqueEquipe.
PROVISÓRIA — Meta pessoal guarda anotações explícitas de valores em metas_pessoais por envelope, acumula entre meses e conserva as anotações quando outro desejo substitui a meta, com botão que informa essa conservação; não considera sobra calculada como poupança nem movimenta saldo; codigo/src/telas/meu-orcamento/MeuOrcamento.tsx, MetaDoDesejo e ProgressoMeta.
PROVISÓRIA — Texto de parcelamento apresenta exclusivamente o resultado existente de simularCompra: cada parcela no mês da fatura, centavos extras explicitados na primeira parcela quando houver; a frase incondicional “hoje não muda” foi removida porque a prévia já inclui parcela cuja fatura é do mês atual, sem alterar esse cálculo; codigo/src/telas/cartoes/simulacao.ts, fraseParcelamento, e codigo/src/telas/lancar/Lancar.tsx, fraseDaCompra e contaNoMes.
PROVISÓRIA — “Foto recebida” confirma somente a foto preparada neste aparelho, com miniatura escondida pelo olho e indicação de envio ainda não confirmado; foto e texto permanecem durante a chamada e após falha, sem persistir imagem em config ou armazenamento local; codigo/src/telas/lancar/Lancar.tsx, AnotarCompra.
PROVISÓRIA — Consulta de fechamento exibe apenas linhas do diário do Contador identificadas exatamente por fechou_mes:AAAA-MM, consultadas do mês seguinte até hoje; não recalcula nem cria fechamento ausente, pois a API pública não aceita data para resumo histórico; codigo/src/telas/lancamentos/Lancamentos.tsx, FechamentoRegistrado.

PROVISÓRIA — F15 preserva a distribuição vigente de centavos na primeira parcela (simularCompra e parcelasDe), com soma exata do total, porque ajustar somente a última na tela divergiria da gravação. O pedido de ajustar na última conflita com preservar o cálculo e depende de outra frente autorizada para a regra compartilhada e banco. À vista mantém valor integral na data da compra; parcelado mantém a parcela no mês da fatura, dia 1. Prévia, impacto no botão e confirmação de Lançar vêm de calcularImpactoDaCompra, sem “hoje não muda” incondicional; codigo/src/telas/lancar/parcelamento.ts.
PROVISÓRIA — F15 usa uma única ação pendente na Casa da equipe por seis segundos: chegada, saída, serviço e troca de botijão podem ser cancelados antes de qualquer gravação; novos toques não substituem nem repetem a ação pendente. Sair da tela ou trocar de família cancela a espera; não há desfazer de gravação já confirmada; codigo/src/telas/casa/Casa.tsx, CasaEquipe.

## Rumo a 2029 ligado aos cenários (frente 16)

PROVISÓRIA — Frente 16: numerosRumo2029 é a apresentação única do resultado de cada cenário. Centavos inteiros; falta negativa significa sobra, null significa taxa sem cobertura calculável. O motor decide pela folga de patrimônio COM margem: patrimonioNecessario aplica (1 + margem) ao gasto após renda certa e aluguel elegível; faltar/sobrar por mês converte essa folga pela taxa do motor, preservando seu arredondamento. Sem margem é gasto corrigido menos renda total; a margem exibida é a diferença entre as duas bases, não uma nova reserva. codigo/src/lib/rumo2029.ts.
PROVISÓRIA — Frente 16: cartão do Planejamento acompanha a preferência existente por aparelho; Início e Painel sempre Garantido. A preferência sincroniza instâncias e abas e, com armazenamento bloqueado, dura apenas na sessão. Nenhuma nova persistência; nenhuma troca de cenário escreve dados financeiros. codigo/src/app/useCenarioReceitas.ts e componentes/RumoA2029.tsx.
PROVISÓRIA — Frente 16: prevalece a saída dos três cenários do adaptador/motor também no cartão. Receitas recorrentes até 2028 já integram as aplicações; após 2028 não viram renda mensal permanente, portanto contribuição mensal direta é zero, com certeza e valor cadastrado discriminados. Evita duplicar patrimônio e renda. Substitui somente a interpretação anterior do cartão sobre somar recorrências diretamente, sem mudar motor ou regras do dono. codigo/src/lib/rumo2029.ts:rumoDoCenario.
PROVISÓRIA — Frente 16: agente recebe exclusivamente entrada e saída Garantido e apresenta o resumo mensal de numerosRumo2029 no contexto do aviso de objetivo já existente. Não cria novo aviso quando cobre, nem muda condição patrimonial, prioridade, silêncio, memória, adiamento ou formato público do hook. Campo opcional resumo no snapshot é apenas texto de apresentação; sem gasto ou taxa calculável não inventa número. codigo/src/lib/insights/leitura.ts, snapshot.ts, tipos.ts e argumento de contexto em motor.ts.

## Pendências do dono — auditoria F20

Mantidas sem alterar comportamento:
- “Não gastei” ainda é guardado sem dono por pessoa (MeuOrcamento.tsx e api/real.ts). Falta definir a identidade do registro.
- “Desligado” hoje remove só o 3D e mantém a fala. Falta definir se deve esconder também a fala.
- O resumo do funcionário usa o orçamento de quem olha, mesmo quando outro adulto está selecionado (numeros.ts). Falta definir qual orçamento deve resumir.
# Assessor da Casa — acabamento f21

O acesso continua usando o papel `equipe`, as rotas e as chaves existentes. `produto.convidar(familia, papel, nome, email)` já exige e persiste o nome em `membros.nome`. O cadastro utiliza `config_familia`, chave `casa_folha`, em `pessoas[]`: `id`, `nome`, `funcao`, `celular` opcional e `salario`. Função e celular são metadados do cadastro da família, não parâmetros novos da função de convite. O salário inicial é zero e pode ser preenchido na Folha. Não houve migração nem alteração de cálculo.

Pedido ao dono para o banco/API:

- A API real não expõe listagem de convites dos Assessores nem estado do acesso. A leitura `membros()` hoje filtra casal/pessoa. Disponibilizar listagem exclusiva para o casal com `membro_id`, `nome`, `ativo`, situação e validade do convite. A tela atual lista o cadastro da configuração, sem afirmar que a pessoa entrou.
- Não há função para renovar convite do mesmo membro. `convidar` cria outro membro a cada chamada. Criar uma função de renovação por `membro_id`, sem duplicar pessoas, devolvendo convite, código e validade, invalidando o anterior. O botão atual gera um convite pela função existente; não é renovação de acesso.
- Não há função exposta para desligar um Assessor e revogar as sessões já abertas. Criar operação exclusiva do casal por `membro_id`, desativando membro e acessos e invalidando sessões. `cancelarConvite` no exemplo cancela apenas convites por e-mail pendentes; não serve para revogar acesso ativo.
- Para cadastro canônico no banco, acrescentar `funcao` opcional e `celular` opcional ao membro, ou entidade equivalente vinculada ao `membro_id`, com leitura/escrita exclusiva do casal. Hoje esses campos cabem na configuração JSON existente; falta vínculo entre cadastro e membro criado pelo convite. Não substituir nome por função ou telefone nem guardar essas informações no campo e-mail.

O modo exemplo mantém Carla e Davi Nogueira com funções e celulares fictícios. Cada convite gerado identifica a pessoa ao entrar e nas marcações da Casa, sem valores monetários.

## Vocabulario para o dono confirmar

- Atual: “funcionários”, “equipe” e “Ajudante” no Escritório e nas opções de aparência. Sugestão: “Assistentes do Escritório”, mantendo “Assessores da Casa” para pessoas reais. Telas: Escritório, fichas, miniaturas e Ajustes. Confirmar a identidade dos personagens antes de renomear o conceito.
- Atual: “Guardado”, “Reserva”, “Caixinha” e “cofrinho”. Sugestão: manter as distinções e usar “dinheiro guardado”, “reserva para imprevistos” e “conta que rende” nas explicações. Telas: Guardado, Meu orçamento e Planejamento. Confirmar se todos representam conceitos distintos; não alterar regra financeira por texto.
- Atual: “composição” e “dia de base”, quando vindos das explicações do banco. Sugestão: “como este valor é calculado” e “valor de referência por dia”. Telas: detalhes dos cálculos e gráficos. Confirmar o significado e ajustar também o texto produzido no banco. Identificadores internos `composicao` e `Envelope` não são rótulos e permanecem intactos.
- Atual: “Objetivo de 2029” e mensagens “conta para 2029”. Sugestão: “Objetivo da família” com data configurável. Telas: Planejamento, Guardado e gráficos. Depende de decisão sobre o horizonte do produto.
- Atual: “Folha” como fonte também do cadastro de acesso. Sugestão: separar cadastro de Assessores e vínculos de emprego, para não sugerir salário ou guia mensal a quem só tem acesso. Tela: Casa. A separação exige decisão de modelo e regras; o cadastro reaproveita o armazenamento existente nesta entrega.

Valida??o f21: `npx tsc --noEmit`. Neste ambiente o carregador de configura??o de `npx vitest run` recebeu acesso negado ao percorrer diret?rios superiores. A mesma su?te pode ser executada por `node scripts/testar-acabamento.mjs`, que chama a API do Vitest com configura??o equivalente, JSX autom?tico, apenas `*.test.ts` e cache local desativado. Aceita caminhos de testes como argumentos.
## Nomes editáveis — pedido ao dono (f21, 16/11/2026)

Não foi criada migração nem escrita direta em `membros`/convites. `api/real.ts` não oferece alteração de identidade. O chamado aparece no real como “Peça a quem administra a família para informar o nome” nesses casos. O exemplo implementa `Api.salvarNomePessoa` em memória; não finge persistência no real.

Pedido: RPC sugerida `produto.pessoa_nome_salvar(familia uuid, membro uuid, nome text, funcao text default null)`. Atualizar `produto.membros.nome`; falta campo canônico `funcao` (ou cadastro vinculado por `membro_id`) para assessor. Casal ativo da mesma família pode alterar qualquer membro; pessoa e assessor ativos somente o próprio `membro_id`, validado pelo login do servidor. Assessor não recebe valores nem lê `casa_folha`. Aplicar trim, comprimento Unicode de 1 a 60, recusar vazio e nomes iguais a outro membro ativo da família com comparação sem diferença de caixa/acentos; validar função até 60. Resposta só com id, nome e função, sem salário, renda ou saldos. Validar família, atividade e identidade antes de qualquer escrita; não aceitar um id de outra família.

Pedido: RPC sugerida `produto.convite_nome_salvar(familia uuid, convite uuid, nome text)`, somente casal ativo da família. Mesmas validações de nome; validar convite não cancelado e vínculo com família. Para convite já aceito, devolver `membro_id` canônico e atualizar o membro e o nome do convite de forma atômica. Hoje falta esse vínculo explícito na interface dos convites reais (a API real nem implementa `convites`). Não vincular por nome.

Pedido: RPC sugerida `produto.registro_autoria_informar(familia uuid, origem text, registro uuid, membro uuid)` para casal ativo. Falta vincular registros antigos de lançamento sem autor, diário, feira, contagem e histórico ao `membro_id` correto. Validar origem em lista fechada, registro e membro ativos da família, preservar trilha anterior, não adivinhar autor por nome. Falta id estável do autor no histórico de objetivo e campos de autoria que hoje chegam apenas como texto. Os ids `autor:…`, `diario:…`, `feira:…`, `contagem:…` são chaves locais de exibição do exemplo, nunca UUIDs enviados ao real.

Cadastros sem login: o casal já pode gravar `config_familia` pela API `salvarConfig`. Nome/função em `casa_folha.pessoas[].nome/funcao`, nome em `casa_prestadores[].nome` e dono textual em `rendas[].dono` funcionam no real e no exemplo, preservando os demais campos. Falta relação `rendas[].dono_membro` e vínculo do assessor cadastrado com o membro do convite para que renomear o login atualize todas as referências sem ambiguidade. Até existir, editar o cadastro da folha não renomeia uma conta real de acesso. A UI explica isso junto ao cadastro.

No real, a validação de duplicidade entre membros é prévia na UI; a garantia concorrente precisa ser repetida nas RPCs sugeridas. `config_salvar` grava JSON inteiro: a UI relê e preserva os demais campos, mas ainda falta uma operação atômica por pessoa para resolver alterações simultâneas no mesmo cadastro. Nenhuma função sugerida é chamada antes de existir uma implementação real explícita em `Api`.

## F23 — Desfazer, proteção e cópia de segurança (16/11/2026)

Contrato central: `AcaoDesfazivel { rotulo, desfazer(): Promise<boolean> }`, em `src/api/desfazer.ts`. A barra anuncia sem deslocar foco, fica cerca de 10 segundos, pausa com mouse parado ou foco dentro e oferece “Manter aviso”. Não há como detectar se um leitor de tela está lendo; a pausa e o controle manual permitem conservar o aviso. Falha conserva a mesma ação para “Tentar de novo”. Só a mais recente fica disponível; as cinco últimas ficam na memória e são apagadas ao sair. Não existe histórico financeiro em localStorage, sessionStorage ou IndexedDB.

Os callbacks de Lançar, cupom, lixeira, Guardado e recebimentos usam a mesma barra. O envio atrasado da Casa conserva sua janela de cancelamento de seis segundos na central: depois de enviar, o Assessor da Casa não recebe um falso inverso de `casa_marcar`.

`api/protegida.ts` registra também alterações feitas pelos cadastros compartilhados. Configurações existentes e parâmetros existentes guardam o anterior e releem antes de desfazer, recusando mudança posterior conhecida. Edição de imóvel e situação de desejo têm escrita inversa. No exemplo, o casal tem um retrato completo em memória; desfazer confere que o estado não mudou antes de restaurar o anterior, incluindo identificadores e cadastros. Isso não é histórico por registro nem backup automático.

### Inversos que faltam no banco

Não habilitar inverso por recriar uma linha com identificador diferente. Faltam retorno do identificador e remoção/restauração segura para criação de imóvel, aplicação, recebimento e desejo; reabrir aplicação encerrada; reativar imóvel/receita/desejo retirado. O contrato atual só aceita apagar=true em algumas dessas operações. Configuração inexistente não pode voltar a inexistente por salvar null; primeiro objetivo não pode voltar a parâmetros ausentes. Convites enviados, fotos enviadas, respostas do Escritório, presença, gás, feira e contagem também não têm inverso geral seguro. Ações sem inverso limpam a oferta anterior e não anunciam Desfazer no real.

Nomes de acesso dependem de RPC autorizada, já ausente no real; os nomes dos cadastros de Assessor da Casa, prestador e renda usam a configuração inteira anterior. Para desfazer identidade, o banco deve preservar vínculos pelo id, função e apelido anterior. Para o Assessor da Casa nunca se deve buscar um retrato financeiro.

Leitura e escrita separadas não constituem controle atômico de concorrência. Pedido ao banco: aceitar revisão esperada e chave da ação nas gravações/inversos; recusar conflito em uma transação, inclusive para configuração, objetivo, imóvel e desejo. O app não promete proteção entre a última releitura e a escrita de outro aparelho.

### Proteção e rascunhos

Regra PROVISÓRIA de valor incomum: perguntar quando o valor superar 50% do limite mensal OU cinco vezes a mediana dos últimos até 30 gastos vivos do envelope no mês atual, sem parcelas projetadas. Sem histórico ou se a leitura falhar, usar somente o limite mensal. Igual ao limiar não alerta. A família pode confirmar normalmente ou corrigir. Olho fechado mascara os valores do aviso. O dono pode rever a janela e os multiplicadores depois de experimentar com dados fictícios.

Rascunhos de Lançar, compra do Assessor da Casa e cadastros de imóvel, aplicação, Assessor da Casa, prestador, recebimento, cartão, renda e meta ficam em memória, isolados por usuário e família. Texto volta ao reabrir; nunca a foto do cupom. Salvar limpa o rascunho correspondente; sair/expirar sessão limpa todos. Recarregar ou fechar o aplicativo perde o rascunho, por escolha de privacidade. Os formulários da Casa passaram a aguardar o resultado antes de fechar ou apagar o digitado.

Reenvio automático habilitado somente em lançamentos, via a mesma `chave` de `lancar_com_chave`; fila visível em memória, tentativa a cada cinco segundos e quando a rede volta. Manter o app aberto. Sair elimina a fila local; ao voltar, conferir os lançamentos, pois o servidor pode ter recebido a tentativa anterior. Demais gravações continuam mostrando erro e mantendo os campos, sem repetir criação às cegas. Para uma fila geral, faltam chaves idempotentes em todas as funções de escrita, consulta do resultado por chave e cancelamento/revisão. A fila não sobrevive a recarga: não gravar dinheiro em disco.

### Cópia manual, formato 1

JSON identificado por `central-da-familia`, versão do formato, versão do package.json e data ISO. Inclui lançamentos, cartões, aplicações, imóveis, receitas, desejos, pessoas, Assessores da Casa, parâmetros e configuração; o exemplo inclui também os estados e movimentos necessários ao round-trip. O download sempre pede confirmação explícita de que o arquivo contém valores, inclusive com o olho fechado.

A importação valida JSON, versão, tamanho (20 MB), estrutura, coleções, ids únicos, tipos básicos, números finitos e chaves perigosas. A prévia mostra quantidades substituídas, novas e finais, sem expor valores. Exige RESTAURAR. Apenas casal tem interface e a API de exemplo também exige casal. No exemplo há validação de consistência entre coleções e estado antes de aplicar.

No real a prévia funciona, mas a gravação é desabilitada. `importar_familia_json` antigo não é um restaurador completo deste formato: não cobre todos os cadastros e não oferece revisão esperada. Falta uma função proposta `restaurar_backup_familia(familia, formato, dados, revisao_esperada, chave)`: validar tudo, autorizar casal e família, preservar ids e vínculos, resolver papéis/propriedade sem ampliar acesso, aplicar todos os conjuntos em transação única e devolver revisão. Não encadear chamadas de criação no cliente. A exportação real usa as leituras disponíveis e cancela se faltar uma coleção obrigatória; não é um retrato transacional entre aparelhos. Para isso, falta `exportar_backup_familia` abrangendo todos os conjuntos numa única revisão.

### Pedido ao banco: historico e backup automatico

Desenho somente; nenhum SQL ou migração nesta entrega. Sugerir `historico_acoes` com família, ator, entidade, id, ação, revisão, chave idempotente, instante e antes/depois protegidos por RLS. Escritas somente por funções autorizadas, na mesma transação da alteração. Casal lê histórico da própria família; pessoa lê somente seus registros; Assessor da Casa não recebe valores nem snapshots financeiros. RPC de desfazer exige revisão ainda vigente e propriedade, sem permitir desfazer edição de outro adulto.

Sugerir `backup_familia` com família, formato, revisão, data, hash e referência a objeto privado criptografado; serviço do banco cria snapshots consistentes, nunca navegador/localStorage. RPC de exportação/restauração somente para casal, com registro de auditoria; credencial de serviço não vai para o app. PROVISÓRIO: ações por 90 dias e cópias diárias por 30 dias, com exclusão após apagar família e tratamento explícito das cópias operacionais. O dono define retenção, custo, criptografia, rotação de chaves, atendimento à LGPD e agenda; testar recuperação em ambiente isolado antes de habilitar.

### Evidência automatizada

`src/app/seguranca-f23.test.ts`: limite de cinco ações, execução exclusiva, falha e repetição; fila em rede instável e rejeição de erro de negócio; backup gerar → alterar → restaurar com igualdade integral; rejeição de versão/estrutura e papel; inverso de configuração e conflito; criação desfeita no exemplo; limiares de valor incomum.

`src/componentes/seguranca-f23-ui.test.ts`: anúncio/pausa/repetição da barra, confirmação de download, prévia com olho fechado e gravação real desabilitada, exclusão do Assessor da Casa, rascunho recuperado e campos conservados na falha sem escrita em disco. As regressões existentes de rascunho em `agente-interacoes.test.ts` e `ux-cobertura.test.ts` passaram a alimentar memória, mantendo isolamento, máscara, salvar e descartar.

Complemento F23: limites mensais/envelopes com efeitos em meses futuros, reajustes/votos e criação de cartão também precisam de inverso transacional no banco para serem anunciados como reversíveis no real. Cadastros genéricos do Escritório preservam cada formulário por tipo e id em memória, inclusive ao recolher a ficha. O teste de cenários de 2029 aguarda as leituras fictícias antes de comparar páginas completas, evitando confundir chegada de dados com mudança de cenário.


## Pessoas e papéis — f25 (16/11/2026)

- Feito no app: autor significa quem anotou. Pago por só aparece quando informado; totais da Casa separam pagou de anotou. O seletor Quem pagou começa vazio. Decisão do dono pendente: autorizar ou não pré-selecionar o membro atual. Nenhuma atribuição automática foi criada.
- A f_04 já oferece coluna, FK de família e permissão de atualização de pago_por. No real, o app primeiro usa a RPC idempotente e depois atualiza a mesma linha. Uma falha na segunda etapa pode deixar a compra anotada sem o pagador; repetir com a mesma chave retoma a mesma compra. Não houve alteração SQL. Futuramente é preferível gravar ambos na mesma transação.
- Privacidade tem resumo por papel, versão 2026-11-16.1; Assessor da Casa lê apenas texto e não recebe exportação, backup ou exclusão. Acesso individual não é encerrado por esta interface.
- Ajuda distingue os papéis e não presume que o casal recebeu convite. A abertura dos funcionários usa o nome uma vez por conversa, mascarado com olho fechado. Nomes com conteúdo monetário não são usados na saudação.
- Início do casal tem Plano 2029; Mais usa ícone de menu e conserva os destinos anteriores. Primeiro uso oferece gestão individual ou compartilhada e prioriza aplicações, imóveis e receitas.
- Conexão não comprova salvamento. O acompanhamento da ação indica Salvando, Salvo ou Não foi possível salvar; a fila continua responsável por repetir lançamentos com a mesma chave. Sair limpa o estado. O acolhimento do convite é transitório, só em memória; não é histórico de aceite nem ciência de termos.

## Pedidos ao banco: pessoas e papeis

Nenhum pedido abaixo foi implementado nesta frente.

- Lista real de acesso: RPC produto.acessos_listar(familia), chamada pelo casal. Validar sessão, membro ativo e família; devolver identidade, papel e estado efetivo, sem códigos de convite ou segredos.
- Encerrar acesso: RPC produto.acesso_encerrar(familia, membro), chamada pelo casal para acesso administrável ou pelo próprio membro para si. Validar família, papel, proteção do último administrador e revogação das sessões; preservar autoria dos registros. Não confundir com apagar a família.
- Estados reais de convite: RPC produto.convites_situacao(familia), chamada pelo casal. Validar administração e família; devolver estado calculado do aceite, cancelamento e expiração, sem inferir por nomes nem expor código. Reenvio/cancelamento devem conferir o estado atual na transação.
- Titularidade de renda por id: coluna produto.recebimentos.dono_membro (ou equivalente para a configuração de receitas) e RPC produto.renda_salvar(familia, renda, dono_membro, dados), chamada pelo titular autorizado. Validar FK composta da família e dono ativo; não resolver titularidade pelo nome. A migração das rendas antigas precisa de conferência do casal.
- Histórico de confirmações: tabela produto.confirmacoes com membro_id, familia_id, tipo, versao, ocorrido_em e referência; RPC produto.confirmacao_registrar, chamada pelo próprio membro. Validar sessão, versão conhecida, escopo e idempotência; nunca fabricar confirmação anterior.
- Vínculo de menor: tabela produto.vinculos_responsaveis e RPC produto.vinculo_menor_definir(familia, menor, responsavel), chamada por administrador autorizado. Validar membros da mesma família, capacidade do responsável, permissões e revogação. Não inferir parentesco pela idade ou nome.
- Ciência de termos: RPC produto.termos_ciencia_registrar(familia, versao), chamada pela pessoa autenticada após ação explícita. Validar versão publicada e identidade; guardar data do servidor e versão, de modo auditável. Não converter simples login em ciência registrada.
- Pagamento atômico: parâmetro opcional pago_por em produto.lancar_com_chave e correção autorizada em produto.lanc_mudar, chamados por quem pode anotar/corrigir o lançamento. Validar pagador ativo na mesma família, permissões do lançamento e mesma chave; autor continua sendo quem anotou, sem preencher pago_por automaticamente.


Validação f25: TypeScript sem erros (npx tsc --noEmit); suíte completa com 66 arquivos, 1.267 testes aprovados e 3 TODO preexistentes. Os 11 testes novos tiveram contraprova vermelha com o comportamento anterior. Dois testes antigos de atualização de nomes receberam relógio fixo, pois dependiam do horário de funcionamento dos personagens. O comando npx vitest run src foi tentado; o carregador de configuração recebeu acesso negado ao percorrer diretórios superiores. A execução completa usou a API do mesmo Vitest, com config false, JSX automático, apenas src/**/*.test.ts, timeout de 30 segundos e sem cache. Scripts e logs temporários foram removidos. Não houve acesso ao banco real nem inspeção visual em navegador nesta frente.


## Pedidos ao banco - rodada 2

- Somente o dono deve revogar a RPC antiga produto.entrar_equipe(codigo) e remover o ramo que aceita convite nulo em _equipe_entrar (migração 20261111165537, perto da linha 100). O link precisa ser obrigatório. Nenhum SQL foi alterado nesta rodada.
- Gravar pago_por na mesma transação de lancar_com_chave. Hoje o app confirma o gasto mesmo se o UPDATE do pagador falhar, informa “Gasto salvo, mas o pagador não foi gravado. Informar de novo” e repete somente o UPDATE pelo ID da compra, sem novo gasto.
- Disponibilizar o vínculo membros.user_id na API de membros para resolver autor = auth.uid(). O app usa user_id quando recebido; sem vínculo, mostra “Anotado por alguém da família”. O ID de membro continua sendo usado para pagador.

## f34 — fonte única para o resumo (17/11/2026)

- C1, pendências: o total oficial é o maior entre a fila recebida e `precisa_total`. Uma prévia de três perguntas não reduz a contagem do título do Escritório nem do Início. A API normalizada que só fornece a fila completa continua sendo atendida.
- C2, funcionário de Gastos: passa a mostrar gastos realizados, com o mesmo selector de Gastos e entradas. Compra original conta uma vez; parcelas sintéticas, apagados e datas futuras ficam fora. O rótulo passa de “Total anotado” para “Saiu no mês”. Não é saldo bancário nem previsão de fatura.
- C3, funcionário do Início: quando o destaque é pessoal, mostra o mesmo número do destaque, identificado como “Seu orçamento”, e o livre desse envelope. Sem envelope pessoal, mantém o orçamento geral. Um estouro conserva a apresentação “fica devendo”.
- C4: extraídos os meses pendentes das recorrências e o valor atualizado, com a mesma conversão de centavos dos controles para reais da tela. A troca do indicador de Planejamento no funcionário fica para a f35; até lá ele ainda soma os recebimentos-base em aberto de todos os meses. Não deve ser usado como total de ocorrências no novo Resumo.
- Faturas preservam duas opções explícitas: Gastos procura a próxima positiva por vencimento; Cartões considera inclusive zero, na janela de seis meses ordenada por mês, e volta à primeira se todas estiverem vencidas. Esta fundação não decide substituir uma regra pela outra.
- `consultadoEm` é o término de uma leitura. `conferidoEm` vem do registro humano de `useNumerosAtualizados`; ausente significa “Sem conferência registrada”. `atualizadoEm` vem da fonte e pode ser desconhecido. Abrir a tela não registra atualização nem conferência.
- Valores da API de telas continuam em reais; entradas de `futuro()` continuam em centavos. O contrato do Resumo declara essas unidades. Nenhuma migração de unidade do app foi feita.
- Leituras são compartilhadas somente na memória desta sessão e isoladas por API/modo, sessão, família, membro, papel, recurso e parâmetros. Foco, reconexão e virada do dia continuam provocando releitura. Não há atualização instantânea entre aparelhos; assinatura de eventos do servidor seria uma evolução futura, fora da f34.
- O Assessor da Casa não consulta nem conserva recursos financeiros no cache. Não se busca `resumoHoje` para esse papel; a Casa usa suas leituras próprias sem dinheiro.
- A normalização tolerante das telas permanece. O caminho do Resumo conserva evidência dos campos ausentes de Guardado e pendências; contrato incompleto é indisponível, não zero silencioso. Lista vazia explicitamente recebida e zero válido continuam válidos.

## f35 — Resumo da família (17/11/2026)

- Saldo em conta é a soma das contas correntes cadastradas, em reais, separada do disponível do orçamento e das aplicações. Sem cadastro legível, aparece “Saldo em conta ainda sem dado”. Nenhuma renda provável ou incerta aumenta o disponível de hoje.
- Conforme a situação informada pelo dono, a f_11 **não está aplicada no Supabase**. O arquivo existente `banco/migracoes/20261113170011_produto_f_11_saldos_conta.sql` prevê `produto.saldos_conta` (id, família, dono, banco, valor_centavos, atualizado_em/por, criado_em, apagado_em), RLS e integração de `futuro_entradas`. Não foi aplicado nem criado SQL nesta frente.
- Para habilitar saldo real, falta o responsável pelo banco aplicar e validar a f_11 e suas trancas; depois implementar `saldosConta`/`salvarSaldoConta` na API real, preservando dono, unidade e exclusão lógica. A f_11 só carimba o instante da escrita (`atualizado_em`), não a data manual da conferência: é preciso definir/persistir esse registro humano antes de aceitar uma data retroativa no modo real. O formulário está implementado por capacidade, mas o botão real permanece ausente enquanto a API não fornecer a capacidade. Não se simula suporte com config da família real.
- No exemplo, `config.saldos_conta_exemplo` pertence exclusivamente ao banco fictício em memória. Leitura, cadastro/edição manual com data, backup/restauração e desfazer passam pela API protegida. `saldoDasContas` alimenta tanto o bloco quanto `futuroEntradas`, convertido uma vez para centavos. Nenhuma importação de exemplo entra na apresentação real. A soma é conferida na data mais antiga das contas incluídas; sem conta não há zero apresentado como saldo conferido.
- C4 concluída: o funcionário de Planejamento usa `totaisRecebimentos` com fontes, controles e ocorrências recorrentes, em vez da soma-base. Seu rótulo continua explicitamente “todos os meses”. O resumo e a linha do mês em Recebimentos usam o mesmo selector com horizonte do mês atual, incluindo pendências anteriores identificadas como atrasadas e separando garantido/provável/incerto. A janela de seis meses continua no detalhe de Cartões.
- Faturas no resumo cobrem os próximos 30 dias. `paga_em` informado exclui a fatura da fila; `valor_banco` prevalece quando informado, inclusive zero. Sem valor do banco, aparece a conferir. Fechamento nunca é comprovação de pagamento. Cartões apresenta a mesma conferência, com destino ao cartão/mês; o Analista conserva o cadastro do pagamento e a comparação entre compras anotadas e valor cobrado.
- Casa usa o gatilho existente `feira_feita:` do Escritório: “Feira ainda sem confirmação”. Ausência de pergunta não prova que a feira ocorreu. Notas pendentes vêm das feiras, estoque da contagem da semana e falta dos itens ativos contados. Sem contagem, a quantidade em falta é desconhecida (`null`), nunca zero afirmado.
- Imóveis mostram o valor cadastrado separado das aplicações. O aluguel líquido é sempre ESTIMADO, vem exclusivamente de `futuro()` e pode ficar indisponível mesmo quando o valor cadastrado foi lido. O resumo não cria um total de patrimônio. Dívidas: “Dívidas ainda não cadastradas nesta visão”.
- Metadados de consulta não viram conferência. Aplicações, imóveis e recebimentos só ganham uma data agregada de conferência se todos os IDs lidos tiverem registro em `useNumerosAtualizados`; vale a data mais antiga. Abrir o Início não registra conferência. Erro e releitura retiram o valor do bloco, sem apresentar o dado anterior como atual; repetir invalida só as fontes dependentes daquele campo.
- Permissões mantidas: casal tem os onze blocos; pessoa da família tem orçamento pessoal, linha permitida da Casa e desejos, sem fontes patrimoniais/Plano 2029. Sem envelope pessoal legível, não recebe o orçamento geral como substituto. Assessor da Casa continua na rota Casa; não monta o resumo nem consulta/retém dinheiro.
- Não foi alterado o motor `futuro()`, nem as fórmulas existentes. Permanecem os limites declarados na f34: cache em memória da sessão e releitura por foco/reconexão/virada do dia, sem promessa de atualização instantânea entre aparelhos.

## f53 — dados, sessão e lógica

- Saldo em conta. O campo conserva o sinal e a data já conferida ao selecionar uma conta. O exemplo aceita saldo negativo em reais. O formulário real rejeita saldo negativo com mensagem explícita, de acordo com a restrição da f_11. Provisoriamente, cheque especial usado é uma dívida separada do saldo disponível. O dono do banco deve confirmar a regra financeira antes de habilitar a capacidade real.
- Uma fatura aberta sem compras e sem valor bancário positivo fica fora das pendências. Na Casa, feira e estoque só ficam confirmados com registro da semana. A fila indica cobranças pendentes.

## Pedidos ao banco - rodada 3

- Configuração da família. Expor uma revisão por chave e aceitar atualização ou criação condicional, com retorno de conflito para o app reler e refazer a mescla. A leitura fresca reduz a janela de corrida. O `upsert` atual continua podendo sobrescrever uma edição feita entre a leitura e a gravação.
- Placar do casal. Expor projeção oficial dos envelopes pessoais do mês somente ao casal, com limite, gasto, fechamento projetado e a identificação do próprio envelope. Até lá, a UI real informa que o placar está indisponível.
- Saldo em conta. A capacidade real continua vinculada à f_11. Confirmar a regra para cheque especial, a identificação de contas e o armazenamento da data manual de conferência antes de expor a leitura e a gravação reais.
- f54: nenhuma alteração de banco necessária. A projeção compartilha as leituras de configuração já protegidas pela API da sessão.
