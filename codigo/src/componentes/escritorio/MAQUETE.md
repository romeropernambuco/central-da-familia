# Maquete do escritório

`EscritorioMaquete` desenha os postos a partir de `dados.funcionarios`. O cadastro em `telas/escritorio/equipe.ts` fornece a roupa e a posição da mesa. Nome, sala e estado de hoje vêm do snapshot. As cores da sala seguem os tokens da proposta e o `color-scheme` do tema.

## Props

- `funcionarios` recebe `dados.funcionarios`. Com a lista vazia ou indisponível, a sala aparece com sua decoração.
- `salaDestacada` aceita `caixa`, `casa`, `cartoes`, `patrimonio`, `gestao`, `recepcao` ou `apoio`. Aproxima e centraliza a sala e atenua as demais. Sem a prop, a maquete mostra a planta toda.
- `mostrarPlaquinhas` exibe o nome curto e o ícone de estado em cada mesa. O padrão é `false`. As mãos ao teclado, a chamada, o check e a pausa ainda aparecem conforme o estado.
- `valores` aceita um mapa de IDs de funcionários para campos monetários de `DadosInicio`, em reais ou centavos. Use valores que ainda não aparecem em outro ponto da tela.
- `variante` limita a largura da cena a 448 px em `compacta`, 788 px em `media` (padrão) e 1060 px em `grande`. A maquete decorativa encolhe com o painel.
- `oculto` força a máscara. O olho global de `PrivacidadePropostas` também mascara os balões, mesmo com `oculto={false}`. A máscara retira o valor da marcação e da medição.
- `papel` recebe `dados.pessoa.papel.valor`. Passe esse campo ao usar `valores`. O componente suprime os balões para o Assessor da Casa (`equipe`) e para um papel indisponível (`null`). A omissão mantém a compatibilidade com a API anterior.
- `onSelecionar` recebe o registro da pessoa em `dados.funcionarios`. Ativa botões sobrepostos de 44 × 44 px com nome completo, sala e estado. Tab percorre os postos e Enter ou Espaço selecionam. No foco por sala, os botões acompanham a sala selecionada. Em espaços estreitos, o modo interativo permite rolar o palco para conservar os alvos de toque.

```tsx
<EscritorioMaquete
  funcionarios={dados.funcionarios}
  variante="grande"
  salaDestacada={sala}
  mostrarPlaquinhas
  papel={dados.pessoa.papel.valor}
  onSelecionar={abrirFicha}
/>
```

O SVG decorativo fica fora da árvore de acessibilidade. Com seleção, os botões HTML ficam ao lado do SVG na marcação. O movimento do teclado e o pulso da chamada duram menos de quatro segundos e só são habilitados com `prefers-reduced-motion: no-preference`.

## Desenho e verificação

A planta segue a vista do escritório em `paineis/escritorio3d/index.html`, com duas paredes de janelas, divisórias baixas e uma recepção que avança da laje. Cada sala tem mobília própria. O cofre do Caixa, a cesta da Casa, os cartões e o cofrinho do Patrimônio ajudam a localizar as equipes. As peças de cada posto são compartilhadas no próprio SVG via `<defs>` e `<use>`.

Os testes conferem o cadastro de 19 pessoas, os estados do snapshot, as sete vistas de sala, a máscara e o papel de Assessor, os botões nativos e a preferência por movimento reduzido. Com todas as plaquinhas e todos os balões do exemplo renderizados, a planta geral pesou 28.631 bytes e a maior vista focada pesou 29.311 bytes.

Para conferir a integração, abra o laboratório em modo exemplo em `/src/propostas/propostas.html#/a` e alterne entre A, B, C e D. A proposta B exibe as plaquinhas e permite trocar a sala em destaque. O modo interativo pode ser montado com o exemplo de props acima.

A verificação no Chrome confirmou os 19 postos nas quatro propostas, em celular e desktop, nos temas claro e escuro. No modo interativo, Tab percorreu os botões, Enter e Espaço chamaram a seleção e a preferência por movimento reduzido desativou as animações.

`npx tsc --noEmit` terminou sem erros e os sete testes da maquete passaram. A suíte completa registrou 1.577 aprovações, dois testes com falha e três marcados como pendentes. As falhas também foram reproduzidas com a maquete de `HEAD`, no teste de conteúdo da fila da proposta B e no teste de salvamento de rascunho de `ux-cobertura.test.ts`.
