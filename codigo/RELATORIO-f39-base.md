# F39 · Laboratório de propostas

## Como abrir

Em `codigo/`, rode `npm run dev:exemplo` e abra `/src/propostas/propostas.html#/a` na origem que o Vite informar. Use os hashes `#/b`, `#/c`, `#/d`, `#/atual` e `#/comparar`. A, B, C e D são espaços reservados. **Comparar** alinha as quatro prévias com rolagem horizontal. **Atual** oferece um link para o Início de exemplo em outra aba.

A moldura mede 375 × 812 CSS px no celular e 1280 × 800 no desktop. Tema, dispositivo e olho valem para todas as prévias. A medição conta ocorrências financeiras na primeira dobra da moldura, inclusive repetições. Use `Valor` ou `NumeroFinanceiro` para marcar valores, percentuais e contagens financeiras. Texto simples com R$ ou % também é detectado. O olho remove os valores da lista e dos componentes de privacidade compartilhados.

## DadosInicio

`carregarDadosInicio()` usa a API de exemplo como Ana da família Silva. Todas as propostas abertas compartilham a mesma leitura. Campos exibíveis usam `{ unidade, natureza, estado, valor }`. Reais vêm da API de telas, centavos do motor de projeção. Naturezas indicam realizado, previsto, estimado ou cadastrado. O estado é pronto, vazio ou indisponível. Zero é dado pronto. O saldo bancário fica indisponível até o cadastro de uma conta.

- **Pessoa e família**, saudação e data no fuso do app.
- **Orçamento** com valor para hoje, até domingo, gasto de hoje, histórico diário à vista, projeção e limite. **Envelopes** têm pessoa, limite, gasto, livre e valor disponível hoje.
- **Faturas** da janela de conferência do Início, com vencimentos e total. **Aplicações** com saldo, rendimento de hoje, séries de 30 dias e lista. **Imóveis** com valor cadastrado e aluguel líquido estimado.
- **Recebimentos** do resumo do Início por certeza e atrasados. **Plano 2029** com renda estimada e faltas mensais com e sem margem no cenário oficial Garantido. A falta é assinada. Valor negativo significa sobra. A série de cobertura visual pode usar o percentual oficial em uma barra de 0 a 100.
- **Casa** com estado da feira e do estoque, notas e itens em falta, livre semanal por envelope da casa e disponível diário. **Movimentação** com entrou, saiu, saldo e série diária em dias com registros.
- **Desejos** pensando, combinados e primeiro ativo na ordem do seletor. **Pendências** com total oficial e fila do Escritório, mais os 19 funcionários do cadastro e os alertas derivados das perguntas.

## Fontes e componentes

- Instaladas via `@fontsource-variable`, ambas em 5.3.0. **Figtree Variable** 300–900 para texto e **Bricolage Grotesque Variable** 200–800 para títulos são a dupla padrão. Cada proposta pode sobrescrevê-la via `--fonte-texto` e `--fonte-titulo`.
- Outras famílias a considerar incluem Inter, DM Sans, Instrument Sans e Work Sans. Para adicionar uma, use `npm i --save-exact @fontsource-variable/<familia>@<versao-confirmada>`, importe o pacote local e registre a faixa ou os pesos usados. Use fontes locais, sem CDN. Nenhuma dependência nova foi adicionada.
- A maquete usa SVG estático com oito funcionários em quatro salas. A plaquinha usa o estado de hoje. Os balões usam campos do contrato e respondem ao olho.

O [briefing](src/propostas/BRIEFING.md) contém as regras de acabamento e os critérios de nota.

## Verificação

`tsc --noEmit` passou sem erros. O Vitest aprovou 1.502 testes em 86 arquivos, com três marcados como TODO. Os testes novos conferem todos os números do adaptador, a ausência de literais numéricos, a privacidade dos balões e a exclusão de `src/propostas/` do build de produção. O build real também foi executado e inspecionado. A transformação em dev confirmou a entrada em modo exemplo e os quatro módulos. A conferência visual ficou pendente porque o Chrome headless travou neste ambiente.
