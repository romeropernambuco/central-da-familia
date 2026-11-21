# Regra central do olho

## Contrato

O estado oculto do ContextoApp é a fonte do olho. O provedor sincroniza a política de formato antes de renderizar os filhos. Não há mais chamada à varredura/MutationObserver de app/mascara.ts: a proteção acontece na renderização React, sem uma janela de texto integral no DOM e sem disputar alterações com o React.

- lib/olho.ts: a casa única da regra. Guarda se o olho está fechado, as máscaras (PONTOS, PONTOS_LONGOS, VALOR_OCULTO), textoPrivado (nome, descrição ou frase privada, também em atributos), mascararTexto (valor dentro de frase) e copiarProtegido (único acesso ao clipboard). Nenhum outro arquivo escreve pontinhos à mão nem cria cópia dessas funções: o teste src/olho.test.ts reprova.
- lib/formato.ts: reais (texto de dinheiro) e linkWhatsApp (mensagem segura enquanto fechado); os dois perguntam a lib/olho.ts.
- app/useOculto.ts: useOculto responde "o olho está fechado?" para qualquer peça, inclusive fora do app.
- componentes/base.tsx: Din (dinheiro visual e aria-label) e CampoValor (única entrada monetária, com milhar).
- componentes/privacidade.tsx: CampoPrivado e CampoDecimal. CampoDecimal é exclusivamente para taxas/percentuais, sem prefixo R$.
- Campos vazios permanecem editáveis. Campos existentes ficam vazios/readOnly com placeholder de máscara. A edição iniciada vazia continua durante a digitação. Alternar o olho reinicia esse modo antes do próximo commit React. O estado original nunca recebe a máscara; abrir restaura o original e salvar sem tocar conserva os dados.
- textoPrivado recebe o texto completo quando uma frase pode carregar nomes. Não se tenta descobrir nomes por expressão regular. Valores de identificadores internos, datas, meses e enums continuam intactos.

## Canais e decisões

| Canal | Tratamento |
| --- | --- |
| Dinheiro em texto, frases e acessibilidade | Din/reais; frases privadas inteiras usam textoPrivado. |
| Inputs monetários próprios | Casa (visita/salário), Cartões (simulador), Planejamento (renda/meta), PrimeiroUso (limites/reserva) migrados para CampoValor. Os demais já usavam a primitiva. |
| Percentuais | Parametros, Reajuste, Guardado e Imoveis usam CampoDecimal. Não são valores monetários. |
| Inputs de nomes, descrições e e-mails | CampoPrivado; não coloca o original em value, placeholder ou title quando existente e fechado. |
| Títulos, subtítulos, descrições e iniciais | textoPrivado, incluindo Ficha/CadCartao, cartões/titulares, lançamentos, placar, presença, recebimentos, imóveis, guardado e desejos. |
| Select/option | Os selects nativos restantes contêm apenas meses do calendário. Seus values são datas, não nomes/valores financeiros. Opções privadas de CadCartao são botões e passam por textoPrivado. |
| aria-label/title/placeholder/alt/data-* | Frases privadas usam textoPrivado; data-do-outro, respostas e lembretes não guardam nomes integrais. Rótulos públicos, IDs de controles, datas e exemplos fixos não precisam esconder. Não há alt dinâmico privado nestas pastas. |
| Clipboard | copiarProtegido. Pergunta e relatório copiam versão protegida quando fechado; links e JSON bloqueiam com aviso quando não há versão segura. O retorno booleano evita anunciar sucesso nos chamadores de links/JSON que não copiaram. |
| Mensagem já copiada | O original fica no estado; o texto mostrado passa por textoPrivado a cada render. Fechar o olho depois de copiar também esconde. |
| WhatsApp/href | linkWhatsApp troca a mensagem por conteúdo oculto antes de codificar a URL, incluindo nomes e e-mails dos convites/prestadores. |
| navigator.share / window.print | Nenhuma ocorrência encontrada em telas/componentes. Não há caminho a migrar. |
| Blob/download | Privacidade exige confirmação explícita com olho fechado: “Os valores aparecerão no arquivo, mesmo com o olho fechado. Deseja baixar os seus dados?”. Cancelar não consulta a API nem cria arquivo. Confirmar baixa JSON integral, deliberadamente. |
| JSON na tela | Só existe com olho aberto; render condicional remove imediatamente ao fechar e efeito limpa o estado. No exemplo, exportar fechado e confirmado também baixa arquivo, sem abrir o visualizador. |
| Toasts/erros e explicações | Contexto protege o texto do toast e detalhes de explicação em cada render; erros locais e frases de resposta também usam textoPrivado, inclusive quando o olho muda com o aviso aberto. |
| Teclado do Lançar | Não é um input de dinheiro paralelo: continua teclado de botões com output. O output e seu aria-label já respeitam o contexto; descrição agora usa CampoPrivado. |
| Arquivos/fotos | Inputs file não têm value preenchido pelo app. Seleção/captura continua deliberada; o olho não reescreve imagens ou documentos anexados. |
| Checkbox, datas e parâmetros não financeiros | Sem nomes nem dinheiro no value; permanecem públicos. Labels com nomes dos itens são protegidos. |
| SVG/gráficos | Rótulos privados são protegidos. Coordenadas normalizadas e percentuais geométricos continuam sendo desenho, não texto com o valor monetário original. |

## Inventário por arquivo e canal

A tabela registra todas as ocorrências dos canais pesquisados em telas/componentes. Números referem-se às linhas desta revisão; várias ocorrências na mesma linha aparecem uma vez por canal. A política da tabela anterior explica também as dispensas (calendário, IDs e texto público).

| Arquivo | Canal | Linhas | Decisão |
| --- | --- | --- | --- |
| src/componentes/EnvelopeCard.tsx | aria-label | 102 | Frases privadas protegidas; rótulos de ações públicos. |
| src/componentes/EnvelopeCard.tsx | data-* | 132 | Nomes e frases protegidos; IDs/flags técnicos preservados. |
| src/componentes/EnvelopeCard.tsx | toast/erro | 104, 110, 117 | Contexto e/ou textoPrivado na apresentação; validações fixas públicas. |
| src/componentes/Graficos.tsx | aria-label | 54, 207 | Frases privadas protegidas; rótulos de ações públicos. |
| src/componentes/LerCupom.tsx | input | 65, 66, 81 | Somente não monetários ou primitivas centrais. |
| src/componentes/LerCupom.tsx | value | 65, 66 | Dados privados nas primitivas; demais são datas/IDs/enums ou saídas condicionadas. |
| src/componentes/LerCupom.tsx | aria-label | 78 | Frases privadas protegidas; rótulos de ações públicos. |
| src/componentes/LerCupom.tsx | toast/erro | 29, 35, 47, 55, 56, 70, 90 | Contexto e/ou textoPrivado na apresentação; validações fixas públicas. |
| src/componentes/Linha2028.tsx | aria-label | 171, 181, 195 | Frases privadas protegidas; rótulos de ações públicos. |
| src/componentes/Pergunta.tsx | input | 132, 143 | Somente não monetários ou primitivas centrais. |
| src/componentes/Pergunta.tsx | CampoValor | 144 | Estado original; apresentação protegida centralmente. |
| src/componentes/Pergunta.tsx | CampoPrivado/Decimal | 145 | Entrada central protegida; datas/números de cadastro explicitamente públicos. |
| src/componentes/Pergunta.tsx | value | 132, 143, 145 | Dados privados nas primitivas; demais são datas/IDs/enums ou saídas condicionadas. |
| src/componentes/Pergunta.tsx | aria-label | 43, 122 | Frases privadas protegidas; rótulos de ações públicos. |
| src/componentes/Pergunta.tsx | data-* | 118 | Nomes e frases protegidos; IDs/flags técnicos preservados. |
| src/componentes/Pergunta.tsx | clipboard | 85 | Função central; versão segura ou bloqueio. |
| src/componentes/Pergunta.tsx | toast/erro | 33, 34, 73, 97, 98, 99, 105, 129, 151 | Contexto e/ou textoPrivado na apresentação; validações fixas públicas. |
| src/componentes/Qm.tsx | title | 17 | Texto privado protegido; demais rótulos públicos. |
| src/componentes/Qm.tsx | aria-label | 17 | Frases privadas protegidas; rótulos de ações públicos. |
| src/componentes/RitmoMes.tsx | aria-label | 29 | Frases privadas protegidas; rótulos de ações públicos. |
| src/componentes/base.tsx | input | 107 | Somente não monetários ou primitivas centrais. |
| src/componentes/base.tsx | value | 107 | Dados privados nas primitivas; demais são datas/IDs/enums ou saídas condicionadas. |
| src/componentes/base.tsx | placeholder | 107 | Máscara central ou exemplo fixo público. |
| src/componentes/base.tsx | aria-label | 10, 16, 56, 59, 107 | Frases privadas protegidas; rótulos de ações públicos. |
| src/componentes/privacidade.tsx | input | 15 | Somente não monetários ou primitivas centrais. |
| src/componentes/privacidade.tsx | CampoPrivado/Decimal | 25 | Entrada central protegida; datas/números de cadastro explicitamente públicos. |
| src/componentes/privacidade.tsx | value | 15 | Dados privados nas primitivas; demais são datas/IDs/enums ou saídas condicionadas. |
| src/componentes/privacidade.tsx | placeholder | 16 | Máscara central ou exemplo fixo público. |
| src/componentes/privacidade.tsx | title | 16 | Texto privado protegido; demais rótulos públicos. |
| src/componentes/privacidade.tsx | aria-label | 17 | Frases privadas protegidas; rótulos de ações públicos. |
| src/telas/ajustes/Ajustes.tsx | CampoPrivado/Decimal | 45, 46 | Entrada central protegida; datas/números de cadastro explicitamente públicos. |
| src/telas/ajustes/Ajustes.tsx | value | 45, 46 | Dados privados nas primitivas; demais são datas/IDs/enums ou saídas condicionadas. |
| src/telas/ajustes/Ajustes.tsx | placeholder | 45, 46 | Máscara central ou exemplo fixo público. |
| src/telas/ajustes/Ajustes.tsx | aria-label | 73 | Frases privadas protegidas; rótulos de ações públicos. |
| src/telas/ajustes/Ajustes.tsx | clipboard | 150 | Função central; versão segura ou bloqueio. |
| src/telas/ajustes/Ajustes.tsx | toast/erro | 51, 56, 113, 126, 150 | Contexto e/ou textoPrivado na apresentação; validações fixas públicas. |
| src/telas/cartoes/Cartoes.tsx | CampoValor | 117 | Estado original; apresentação protegida centralmente. |
| src/telas/cartoes/Cartoes.tsx | CampoPrivado/Decimal | 158, 159, 160, 181, 182 | Entrada central protegida; datas/números de cadastro explicitamente públicos. |
| src/telas/cartoes/Cartoes.tsx | value | 158, 159, 160, 181, 182 | Dados privados nas primitivas; demais são datas/IDs/enums ou saídas condicionadas. |
| src/telas/cartoes/Cartoes.tsx | placeholder | 158 | Máscara central ou exemplo fixo público. |
| src/telas/cartoes/Cartoes.tsx | aria-label | 53 | Frases privadas protegidas; rótulos de ações públicos. |
| src/telas/cartoes/Cartoes.tsx | data-* | 53 | Nomes e frases protegidos; IDs/flags técnicos preservados. |
| src/telas/cartoes/Cartoes.tsx | toast/erro | 92, 93, 155, 156, 161, 178, 179, 183 | Contexto e/ou textoPrivado na apresentação; validações fixas públicas. |
| src/telas/casa/Casa.tsx | input | 132, 394 | Somente não monetários ou primitivas centrais. |
| src/telas/casa/Casa.tsx | CampoValor | 233, 326 | Estado original; apresentação protegida centralmente. |
| src/telas/casa/Casa.tsx | CampoPrivado/Decimal | 139, 230, 231, 324, 325, 400 | Entrada central protegida; datas/números de cadastro explicitamente públicos. |
| src/telas/casa/Casa.tsx | value | 139, 230, 231, 324, 325, 400 | Dados privados nas primitivas; demais são datas/IDs/enums ou saídas condicionadas. |
| src/telas/casa/Casa.tsx | placeholder | 139, 230, 325, 400 | Máscara central ou exemplo fixo público. |
| src/telas/casa/Casa.tsx | aria-label | 41, 133, 139, 140, 170, 172, 205, 285, 400, 401 | Frases privadas protegidas; rótulos de ações públicos. |
| src/telas/casa/Casa.tsx | clipboard | 174 | Função central; versão segura ou bloqueio. |
| src/telas/casa/Casa.tsx | toast/erro | 52, 174, 341, 347, 349 | Contexto e/ou textoPrivado na apresentação; validações fixas públicas. |
| src/telas/desejos/Desejos.tsx | CampoValor | 193, 204, 206 | Estado original; apresentação protegida centralmente. |
| src/telas/desejos/Desejos.tsx | CampoPrivado/Decimal | 192 | Entrada central protegida; datas/números de cadastro explicitamente públicos. |
| src/telas/desejos/Desejos.tsx | select/option | 195, 208 | Calendário, sem nome nem dinheiro. |
| src/telas/desejos/Desejos.tsx | value | 192, 195, 208 | Dados privados nas primitivas; demais são datas/IDs/enums ou saídas condicionadas. |
| src/telas/desejos/Desejos.tsx | placeholder | 192 | Máscara central ou exemplo fixo público. |
| src/telas/desejos/Desejos.tsx | aria-label | 241 | Frases privadas protegidas; rótulos de ações públicos. |
| src/telas/desejos/Desejos.tsx | data-* | 235 | Nomes e frases protegidos; IDs/flags técnicos preservados. |
| src/telas/desejos/Desejos.tsx | toast/erro | 165, 168, 170, 177, 181 | Contexto e/ou textoPrivado na apresentação; validações fixas públicas. |
| src/telas/entrar/Entrar.tsx | CampoPrivado/Decimal | 43, 57, 71 | Entrada central protegida; datas/números de cadastro explicitamente públicos. |
| src/telas/entrar/Entrar.tsx | value | 43, 57, 71 | Dados privados nas primitivas; demais são datas/IDs/enums ou saídas condicionadas. |
| src/telas/entrar/Entrar.tsx | placeholder | 43 | Máscara central ou exemplo fixo público. |
| src/telas/entrar/Entrar.tsx | aria-label | 57, 71 | Frases privadas protegidas; rótulos de ações públicos. |
| src/telas/entrar/Entrar.tsx | toast/erro | 19, 30, 31, 46, 48, 53, 59, 66, 73 | Contexto e/ou textoPrivado na apresentação; validações fixas públicas. |
| src/telas/escritorio/Cena3D.tsx | aria-label | 93, 101 | Frases privadas protegidas; rótulos de ações públicos. |
| src/telas/escritorio/Cena3D.tsx | data-* | 82, 91 | Nomes e frases protegidos; IDs/flags técnicos preservados. |
| src/telas/escritorio/Cena3D.tsx | toast/erro | 81, 106 | Contexto e/ou textoPrivado na apresentação; validações fixas públicas. |
| src/telas/escritorio/Escritorio.tsx | CampoPrivado/Decimal | 233, 234 | Entrada central protegida; datas/números de cadastro explicitamente públicos. |
| src/telas/escritorio/Escritorio.tsx | textarea | 168 | Relatório protegido ou JSON condicionado a olho aberto. |
| src/telas/escritorio/Escritorio.tsx | value | 168, 233, 234 | Dados privados nas primitivas; demais são datas/IDs/enums ou saídas condicionadas. |
| src/telas/escritorio/Escritorio.tsx | placeholder | 233 | Máscara central ou exemplo fixo público. |
| src/telas/escritorio/Escritorio.tsx | aria-label | 42, 77, 88, 142, 168, 263 | Frases privadas protegidas; rótulos de ações públicos. |
| src/telas/escritorio/Escritorio.tsx | data-* | 36, 88, 255, 300 | Nomes e frases protegidos; IDs/flags técnicos preservados. |
| src/telas/escritorio/Escritorio.tsx | clipboard | 136 | Função central; versão segura ou bloqueio. |
| src/telas/escritorio/Escritorio.tsx | toast/erro | 61, 122, 128, 210, 222, 224, 238, 247, 307, 312 | Contexto e/ou textoPrivado na apresentação; validações fixas públicas. |
| src/telas/escritorio/Ficha.tsx | input | 270 | Somente não monetários ou primitivas centrais. |
| src/telas/escritorio/Ficha.tsx | CampoValor | 143 | Estado original; apresentação protegida centralmente. |
| src/telas/escritorio/Ficha.tsx | CampoPrivado/Decimal | 145 | Entrada central protegida; datas/números de cadastro explicitamente públicos. |
| src/telas/escritorio/Ficha.tsx | value | 145, 270 | Dados privados nas primitivas; demais são datas/IDs/enums ou saídas condicionadas. |
| src/telas/escritorio/Ficha.tsx | placeholder | 145 | Máscara central ou exemplo fixo público. |
| src/telas/escritorio/Ficha.tsx | aria-label | 164 | Frases privadas protegidas; rótulos de ações públicos. |
| src/telas/escritorio/Ficha.tsx | data-* | 59, 63, 84, 89, 97, 109, 154, 283, 350 | Nomes e frases protegidos; IDs/flags técnicos preservados. |
| src/telas/escritorio/Ficha.tsx | toast/erro | 129, 131, 135, 136, 149, 266, 285 | Contexto e/ou textoPrivado na apresentação; validações fixas públicas. |
| src/telas/escritorio/NumerosAba.tsx | aria-label | 38 | Frases privadas protegidas; rótulos de ações públicos. |
| src/telas/escritorio/NumerosAba.tsx | toast/erro | 18, 26, 33, 42, 43 | Contexto e/ou textoPrivado na apresentação; validações fixas públicas. |
| src/telas/guardado/Guardado.tsx | input | 211 | Somente não monetários ou primitivas centrais. |
| src/telas/guardado/Guardado.tsx | CampoValor | 210, 254 | Estado original; apresentação protegida centralmente. |
| src/telas/guardado/Guardado.tsx | CampoPrivado/Decimal | 202, 209 | Entrada central protegida; datas/números de cadastro explicitamente públicos. |
| src/telas/guardado/Guardado.tsx | value | 202, 209, 211 | Dados privados nas primitivas; demais são datas/IDs/enums ou saídas condicionadas. |
| src/telas/guardado/Guardado.tsx | placeholder | 202 | Máscara central ou exemplo fixo público. |
| src/telas/guardado/Guardado.tsx | title | 90 | Texto privado protegido; demais rótulos públicos. |
| src/telas/guardado/Guardado.tsx | aria-label | 56, 84, 89, 109, 297, 323 | Frases privadas protegidas; rótulos de ações públicos. |
| src/telas/guardado/Guardado.tsx | data-* | 69, 108, 279 | Nomes e frases protegidos; IDs/flags técnicos preservados. |
| src/telas/guardado/Guardado.tsx | toast/erro | 31, 55, 181, 182, 183, 184, 190, 212, 231, 232, 233, 242, 255, 268 | Contexto e/ou textoPrivado na apresentação; validações fixas públicas. |
| src/componentes/Imoveis.tsx | CampoValor | 156, 162, 163, 181 | Estado original; apresentação protegida centralmente. |
| src/componentes/Imoveis.tsx | CampoPrivado/Decimal | 155, 164 | Entrada central protegida; datas/números de cadastro explicitamente públicos. |
| src/componentes/Imoveis.tsx | select/option | 172, 182 | Calendário, sem nome nem dinheiro. |
| src/componentes/Imoveis.tsx | value | 155, 164, 172, 182 | Dados privados nas primitivas; demais são datas/IDs/enums ou saídas condicionadas. |
| src/componentes/Imoveis.tsx | placeholder | 155 | Máscara central ou exemplo fixo público. |
| src/componentes/Imoveis.tsx | aria-label | 99 | Frases privadas protegidas; rótulos de ações públicos. |
| src/componentes/Imoveis.tsx | data-* | 98 | Nomes e frases protegidos; IDs/flags técnicos preservados. |
| src/componentes/Imoveis.tsx | toast/erro | 73, 78 | Contexto e/ou textoPrivado na apresentação; validações fixas públicas. |
| src/telas/inicio/Inicio.tsx | aria-label | 67 | Frases privadas protegidas; rótulos de ações públicos. |
| src/telas/lancamentos/Lancamentos.tsx | title | 105, 107 | Texto privado protegido; demais rótulos públicos. |
| src/telas/lancamentos/Lancamentos.tsx | aria-label | 75, 105, 107, 108, 142 | Frases privadas protegidas; rótulos de ações públicos. |
| src/telas/lancamentos/Lancamentos.tsx | data-* | 99, 148, 157 | Nomes e frases protegidos; IDs/flags técnicos preservados. |
| src/telas/lancamentos/Lancamentos.tsx | toast/erro | 60, 69, 84 | Contexto e/ou textoPrivado na apresentação; validações fixas públicas. |
| src/telas/lancar/Lancar.tsx | input | 356 | Somente não monetários ou primitivas centrais. |
| src/telas/lancar/Lancar.tsx | CampoPrivado/Decimal | 175, 306, 348 | Entrada central protegida; datas/números de cadastro explicitamente públicos. |
| src/telas/lancar/Lancar.tsx | value | 175, 306, 348, 356 | Dados privados nas primitivas; demais são datas/IDs/enums ou saídas condicionadas. |
| src/telas/lancar/Lancar.tsx | placeholder | 175, 306, 348 | Máscara central ou exemplo fixo público. |
| src/telas/lancar/Lancar.tsx | aria-label | 168, 175, 176, 178, 189, 213, 236, 300, 306 | Frases privadas protegidas; rótulos de ações públicos. |
| src/telas/lancar/Lancar.tsx | toast/erro | 120, 132, 136, 141, 147, 148, 159, 195, 244, 256, 282, 287, 296, 336, 337, 338, 343, 345, 361 | Contexto e/ou textoPrivado na apresentação; validações fixas públicas. |
| src/telas/meu-orcamento/MeuOrcamento.tsx | CampoValor | 166, 178 | Estado original; apresentação protegida centralmente. |
| src/telas/meu-orcamento/MeuOrcamento.tsx | CampoPrivado/Decimal | 177 | Entrada central protegida; datas/números de cadastro explicitamente públicos. |
| src/telas/meu-orcamento/MeuOrcamento.tsx | value | 177 | Dados privados nas primitivas; demais são datas/IDs/enums ou saídas condicionadas. |
| src/telas/meu-orcamento/MeuOrcamento.tsx | placeholder | 177 | Máscara central ou exemplo fixo público. |
| src/telas/meu-orcamento/MeuOrcamento.tsx | aria-label | 70, 74 | Frases privadas protegidas; rótulos de ações públicos. |
| src/telas/meu-orcamento/MeuOrcamento.tsx | data-* | 84 | Nomes e frases protegidos; IDs/flags técnicos preservados. |
| src/telas/meu-orcamento/MeuOrcamento.tsx | toast/erro | 97 | Contexto e/ou textoPrivado na apresentação; validações fixas públicas. |
| src/telas/painel/Painel.tsx | aria-label | 20 | Frases privadas protegidas; rótulos de ações públicos. |
| src/telas/painel/Painel.tsx | toast/erro | 12 | Contexto e/ou textoPrivado na apresentação; validações fixas públicas. |
| src/telas/planejamento/Parametros.tsx | input | 119, 120 | Somente não monetários ou primitivas centrais. |
| src/telas/planejamento/Parametros.tsx | CampoValor | 110, 111 | Estado original; apresentação protegida centralmente. |
| src/telas/planejamento/Parametros.tsx | CampoPrivado/Decimal | 113, 114, 116, 117, 118, 133, 134 | Entrada central protegida; datas/números de cadastro explicitamente públicos. |
| src/telas/planejamento/Parametros.tsx | placeholder | 133, 134 | Máscara central ou exemplo fixo público. |
| src/telas/planejamento/Parametros.tsx | aria-label | 124, 133, 134 | Frases privadas protegidas; rótulos de ações públicos. |
| src/telas/planejamento/Parametros.tsx | toast/erro | 85, 91, 112 | Contexto e/ou textoPrivado na apresentação; validações fixas públicas. |
| src/telas/planejamento/Planejamento.tsx | CampoValor | 110, 115, 217, 218, 222 | Estado original; apresentação protegida centralmente. |
| src/telas/planejamento/Planejamento.tsx | CampoPrivado/Decimal | 208 | Entrada central protegida; datas/números de cadastro explicitamente públicos. |
| src/telas/planejamento/Planejamento.tsx | value | 208 | Dados privados nas primitivas; demais são datas/IDs/enums ou saídas condicionadas. |
| src/telas/planejamento/Planejamento.tsx | placeholder | 208 | Máscara central ou exemplo fixo público. |
| src/telas/planejamento/Planejamento.tsx | title | 180 | Texto privado protegido; demais rótulos públicos. |
| src/telas/planejamento/Planejamento.tsx | aria-label | 210 | Frases privadas protegidas; rótulos de ações públicos. |
| src/telas/planejamento/Planejamento.tsx | data-* | 108, 135 | Nomes e frases protegidos; IDs/flags técnicos preservados. |
| src/telas/planejamento/Planejamento.tsx | toast/erro | 74, 86, 144 | Contexto e/ou textoPrivado na apresentação; validações fixas públicas. |
| src/telas/planejamento/Reajuste.tsx | CampoValor | 194 | Estado original; apresentação protegida centralmente. |
| src/telas/planejamento/Reajuste.tsx | CampoPrivado/Decimal | 195 | Entrada central protegida; datas/números de cadastro explicitamente públicos. |
| src/telas/planejamento/Reajuste.tsx | value | 195 | Dados privados nas primitivas; demais são datas/IDs/enums ou saídas condicionadas. |
| src/telas/planejamento/Reajuste.tsx | toast/erro | 143, 150, 159, 175 | Contexto e/ou textoPrivado na apresentação; validações fixas públicas. |
| src/telas/planejamento/Recebimentos.tsx | input | 86, 113 | Somente não monetários ou primitivas centrais. |
| src/telas/planejamento/Recebimentos.tsx | CampoValor | 85 | Estado original; apresentação protegida centralmente. |
| src/telas/planejamento/Recebimentos.tsx | CampoPrivado/Decimal | 84 | Entrada central protegida; datas/números de cadastro explicitamente públicos. |
| src/telas/planejamento/Recebimentos.tsx | value | 84, 86, 113 | Dados privados nas primitivas; demais são datas/IDs/enums ou saídas condicionadas. |
| src/telas/planejamento/Recebimentos.tsx | placeholder | 84 | Máscara central ou exemplo fixo público. |
| src/telas/planejamento/Recebimentos.tsx | data-* | 47 | Nomes e frases protegidos; IDs/flags técnicos preservados. |
| src/telas/planejamento/Recebimentos.tsx | toast/erro | 35, 66, 79, 80, 81, 98 | Contexto e/ou textoPrivado na apresentação; validações fixas públicas. |
| src/telas/primeiro-uso/PrimeiroUso.tsx | CampoValor | 94, 99 | Estado original; apresentação protegida centralmente. |
| src/telas/primeiro-uso/PrimeiroUso.tsx | CampoPrivado/Decimal | 81, 82, 115, 116 | Entrada central protegida; datas/números de cadastro explicitamente públicos. |
| src/telas/primeiro-uso/PrimeiroUso.tsx | value | 81, 82, 115, 116 | Dados privados nas primitivas; demais são datas/IDs/enums ou saídas condicionadas. |
| src/telas/primeiro-uso/PrimeiroUso.tsx | placeholder | 81, 82, 115, 116 | Máscara central ou exemplo fixo público. |
| src/telas/primeiro-uso/PrimeiroUso.tsx | aria-label | 65 | Frases privadas protegidas; rótulos de ações públicos. |
| src/telas/primeiro-uso/PrimeiroUso.tsx | toast/erro | 33, 34, 57, 83, 102, 127 | Contexto e/ou textoPrivado na apresentação; validações fixas públicas. |
| src/telas/privacidade/Privacidade.tsx | CampoPrivado/Decimal | 81 | Entrada central protegida; datas/números de cadastro explicitamente públicos. |
| src/telas/privacidade/Privacidade.tsx | textarea | 71 | Relatório protegido ou JSON condicionado a olho aberto. |
| src/telas/privacidade/Privacidade.tsx | value | 71, 81 | Dados privados nas primitivas; demais são datas/IDs/enums ou saídas condicionadas. |
| src/telas/privacidade/Privacidade.tsx | aria-label | 71, 74, 81 | Frases privadas protegidas; rótulos de ações públicos. |
| src/telas/privacidade/Privacidade.tsx | clipboard | 73 | Função central; versão segura ou bloqueio. |
| src/telas/privacidade/Privacidade.tsx | Blob/download | 33, 36 | Arquivo integral somente após confirmação quando fechado. |
| src/telas/privacidade/Privacidade.tsx | toast/erro | 28, 30, 39, 73, 74, 82, 84 | Contexto e/ou textoPrivado na apresentação; validações fixas públicas. |

## Guarda e validação

privacidade-global.test.ts usa createElement, React e react-dom reais, com a superfície DOM mínima que o projeto já utiliza. Um teste percorre as 25 superfícies/telas, sem simular hooks, usando a API de exemplo local com nomes e valores sentinela. Abre também fichas das aplicações e todas as abas da Casa. Faz fechado → aberto → fechado na mesma raiz, verifica texto completo, value e todos os atributos (incluindo placeholder, title, aria-label, alt e data-*). A lista de módulos é descoberta por glob e exige uma superfície coberta por arquivo TSX; telas novas não ficam silenciosamente de fora. Entrar/PrimeiroUso e algumas abas de parâmetros iniciam sem dados privados visíveis; as demais devem apresentar sentinela quando abertas. Cena3D é exercitada no fallback sem WebGL; renderização GPU não é objeto deste teste.

Os outros três testes cobrem copiar no PerguntaCard real (além do contrato da primitiva), a guarda estática contra input decimal/number e clipboard direto fora das primitivas, e confirmação/cancelamento/download integral/JSON aberto→fechado em Privacidade. Os 31 testes existentes de privacidade do Escritório continuam cobrindo edição, salvar intacto, CampoValor vazio/editável e fichas dos funcionários.

Contraprova: os quatro testes novos falharam com os chamadores, contexto e primitivas antigas temporariamente restaurados. As funções novas de formato foram mantidas apenas para os imports do teste; os fluxos originais não as chamavam. Falhas observadas: sentinelas no HTML do Início; nome integral copiado por Pergunta; clipboard e inputs monetários diretos; ausência de confirmação na exportação. A versão corrigida foi restaurada integralmente após a execução.

Execução: npx tsc -p . --noEmit e suíte completa Vitest. O carregamento normal de vite.config.ts é impedido pela restrição de acesso do ambiente; o Vitest é iniciado pela API em arquivo temporário FORA do repositório, com config:false, JSX automático, mode:test, envFile:false e todos os src/**/*.test.ts. Não instala dependências, não roda build e não acessa serviços externos.

Resultado final: TypeScript sem erros; 467 testes aprovados em 31 arquivos. Os quatro testes novos falharam na contraprova com o código anterior e passaram na versão final. A execução completa usa processos isolados (pool forks), evitando que variáveis de ambiente simuladas por testes antigos vazem entre arquivos.

## Limites deliberados

O olho protege a apresentação e os canais de saída do app, não é criptografia nem autorização de banco. Os valores originais permanecem no estado para cálculo/salvamento. Conteúdo já copiado antes de fechar o olho e arquivos já baixados não são apagados do aparelho. Exportação confirmada contém dados integrais por decisão explícita do usuário. Fotos/anexos não são reescritos. Rótulos fixos, exemplos fictícios, calendário, IDs internos e desenhos normalizados não são dados privados por si. Sem alterações em banco/, .env, chaves, app/ ou paineis/ da raiz; sem commit, push, instalação ou build.

## Arquivos alterados

- codigo/PRIVACIDADE.md
- codigo/src/app/contexto.tsx
- codigo/src/componentes/EnvelopeCard.tsx
- codigo/src/componentes/Graficos.tsx
- codigo/src/componentes/LerCupom.tsx
- codigo/src/componentes/Linha2028.tsx
- codigo/src/componentes/Pergunta.tsx
- codigo/src/componentes/Qm.tsx
- codigo/src/componentes/RitmoMes.tsx
- codigo/src/componentes/base.tsx
- codigo/src/componentes/privacidade.tsx
- codigo/src/lib/formato.ts
- codigo/src/lib/olho.ts
- codigo/src/olho.test.ts
- codigo/src/privacidade-global.test.ts
- codigo/src/telas/ajustes/Ajustes.tsx
- codigo/src/telas/cartoes/Cartoes.tsx
- codigo/src/telas/casa/Casa.tsx
- codigo/src/telas/desejos/Desejos.tsx
- codigo/src/telas/entrar/Entrar.tsx
- codigo/src/telas/escritorio/Cena3D.tsx
- codigo/src/telas/escritorio/Escritorio.tsx
- codigo/src/telas/escritorio/Ficha.tsx
- codigo/src/telas/escritorio/NumerosAba.tsx
- codigo/src/telas/guardado/Guardado.tsx
- codigo/src/componentes/Imoveis.tsx
- codigo/src/telas/inicio/Inicio.tsx
- codigo/src/telas/lancamentos/Lancamentos.tsx
- codigo/src/telas/lancar/Lancar.tsx
- codigo/src/telas/meu-orcamento/MeuOrcamento.tsx
- codigo/src/telas/painel/Painel.tsx
- codigo/src/telas/planejamento/Parametros.tsx
- codigo/src/telas/planejamento/Planejamento.tsx
- codigo/src/telas/planejamento/Reajuste.tsx
- codigo/src/telas/planejamento/Recebimentos.tsx
- codigo/src/telas/primeiro-uso/PrimeiroUso.tsx
- codigo/src/telas/privacidade/Privacidade.tsx
