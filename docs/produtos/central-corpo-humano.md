# 🫀 Central da Família: o corpo inteiro

Documento mãe. Mostra cada órgão da Central, o que ele faz, como os órgãos se ligam e em que ordem o corpo é montado.
Cada órgão tem o seu contexto detalhado nesta mesma pasta.

---

## 🧭 Mapa mental

```
                   🦴 ESQUELETO
          Supabase, tabela docs, login
                        │
🩸 SANGUE ─────── [ CENTRAL DA FAMÍLIA ] ─────── 🧠 MENTE
dinheiro circula                          olhos, memória
Parcelas, Caixa                           Jardim, Banco
                        │
     💪 MÚSCULOS ──────────────────── ⏱️ RITMO E MÃOS
   a casa funcionando             Foco: atenção do dia
   Escritório da Família          Portfólio: o que entreguei
```

---

## 🧍 1. Os órgãos

| Órgão | Parte do corpo | Faz o quê | Estado |
|---|---|---|---|
| 🦴 **Base** | Esqueleto | Banco de dados, login, regra de 1 lugar pra cada coisa | ✅ no ar |
| 🩸 **Parcelas e Caixa** | Sangue e coração | Dinheiro entrando, saindo, dívidas, colchão | ✅ Parcelas no ar · Caixa vazio |
| 💪 **Escritório da Família** | Músculos | Equipe da casa, turnos, rotina funcionando | 🟡 tabelas criadas |
| 👁️ **Jardim Digital** | Olhos | O que eu vejo e me inspira | 📄 contexto pronto |
| 🧠 **Banco de Aprendizados** | Memória | O que eu aprendi e onde apliquei | 📄 contexto pronto |
| ⏱️ **Foco e tempo** | Sistema nervoso (atenção e ritmo) | Transforma o que os outros órgãos pedem em horas do dia | 📄 contexto pronto |
| ✋ **Portfólio** | Mãos | O que eu fiz e entreguei, com prova | 📄 contexto pronto |

### 🔮 Órgãos que ainda não existem (pra pensar depois)
1. 🫁 **Saúde da família:** consultas, vacinas e remédios das 3 crianças, de Andreza e seu.
2. 📅 **Agenda da família:** escola, compromissos, quem leva quem.
3. 🗂️ **Documentos e jurídico:** contratos, escrituras, prazos, sócios.
4. 🚀 **Negócio novo:** entra na próxima fase, depois do caixa ajustado.

---

## 🔁 2. Como o sangue circula entre os órgãos

O ciclo pessoal do Romero, do que entra pelos olhos até o que sai pelas mãos:

```
👁️ Jardim ──► 🧠 Banco ──► ⏱️ Foco ──► ✋ Portfólio
  vi algo      aprendi     fiz no dia   entreguei, com prova
     ▲                         ▲
     │                         │
     └── ideia no meio ────────┘          🩸 Parcelas manda tarefas
         do foco volta                       ("ligar pro credor X")
         pro Jardim                          pro Foco
```

| De | Para | O que passa | Exemplo |
|---|---|---|---|
| Jardim | Banco | Referência vira aprendizado | Post sobre negociação vira "ancore com número" |
| Banco | Foco | "Como aplicar" vira tarefa do dia | "Mandar proposta ao credor com valor fechado" |
| Foco | Portfólio | Tarefa importante concluída vira entrega | "Renegociei dívida X, economia de R$ [confirmar]" |
| Foco | Jardim | Anotação rápida no meio do ciclo | "Ideia de negócio: ..." |
| Parcelas | Foco | Pendência de dinheiro vira tarefa | "Pagar fatura do cartão até dia 10" |
| Banco | Portfólio | Aprendizado aplicado vira prova | "Curso de negociação, aplicado em 4 conversas" |

**Regra de ouro das ligações:** cada dado mora num órgão só. A ligação guarda apenas o endereço `{painel, colecao, doc_id}`. A dívida continua no Parcelas, mesmo quando vira tarefa no Foco.

---

## 🦴 3. Esqueleto técnico (vale pra todos)

1. **1 banco:** Supabase `central-da-familia`, tabela `docs`. Cada órgão é um `painel`: `parcelas`, `jardim`, `banco`, `foco`, `portfolio`.
2. **Cada órgão tem `resumo/atual`:** é dele que a tela principal da Central lê os números de topo, sem abrir o órgão inteiro.
3. **1 site:** cada órgão é uma página deste repositório (`/parcelas/`, `/jardim/`, `/banco/`, `/foco/`, `/portfolio/`), instalável no iPhone.
4. **1 IA:** Claude chamado por Edge Function do Supabase, a chave nunca fica na página.
5. **Arquivos:** Supabase Storage, um bucket privado por órgão.
6. **Exportar tudo:** botão em cada órgão desde a v1.
7. **Limite do plano grátis:** 500 MB de banco, 1 GB de arquivos, pausa após 1 semana sem uso ([fonte](https://supabase.com/pricing)). Fotos do Portfólio são as que mais pesam.

---

## 🎨 4. Um corpo, uma cara

Os 4 prints vêm da mesma família visual, e a Central adota essa linguagem para todos os órgãos:

1. Fundo creme, 1 cor de destaque por órgão (sálvia no Jardim e no Banco, terracota no Foco, sálvia escuro no Portfólio). [confirmar: cor do Parcelas atual]
2. Título serifado com a 2ª palavra em itálico ("Meu dia *em foco*").
3. Mesma estrutura de tela em todos: barra lateral, 5 números no topo, centro, rodapé com 1 dica da IA e 1 botão principal.
4. **Celular captura, computador lê.** Toda captura cabe em 10 segundos no iPhone.

---

## 🧠 5. Princípios do corpo (pensados pro TDAH)

1. **Captura sem campo obrigatório.** Link, print, foto ou 1 frase. A IA organiza depois.
2. **Nada vermelho por falha.** Sequência conta por semana ("5 de 7"), não zera.
3. **1 coisa por vez.** Aviso diário com 1 item e 3 botões: fazer, adiar, soltar.
4. **Revisão de domingo única:** 1 tela que puxa de todos os órgãos (aprendido e não aplicado, tempo da semana, entregas, pendências de dinheiro).
5. **Tempo visível.** O Foco mostra "você leva 1,4x o que estima": treino contra a cegueira de tempo.

---

## 🗺️ 6. Ordem de montagem do corpo

| Fase | O que entra | Por quê | Trava pra passar |
|---|---|---|---|
| 0 | 🩸 Caixa oficial no Parcelas | Foco atual é o dinheiro | Caixa com saldo real conferido |
| 1 | ⏱️ Foco (v1 simples) | Ajuda em tudo o resto já no dia 1, inclusive a renegociar | 4 semanas usando 5 de 7 dias |
| 2 | ✋ Portfólio: mutirão do legado | Janela de acesso ao gabinete fecha com o fim do mandato | Entregas do mandato registradas |
| 3 | 🧠 Banco | Sem depender do Instagram | 4 domingos de revisão |
| 4 | 👁️ Jardim | Precisa do Atalho e da IA lendo print | 50 referências guardadas |
| 5 | 🔁 Ligações + revisão de domingo única | Só faz sentido com os órgãos vivos | Revisão puxando de 3 órgãos |

**Mudei a ordem do documento anterior** (que começava pelo Banco). O Foco sobe porque serve à fase atual: tarefas de dinheiro com hora marcada. O Portfólio sobe por causa da data: [confirmar: dia exato de saída do gabinete, provavelmente 31/01/2027].

---

## 👥 7. Time que pensou cada órgão

| Especialista | O que cobriu |
|---|---|
| Gerente de Produto | Problema, jornadas, o que fica fora, sucesso em 30 dias |
| Designer de Produto | Telas, celular x computador, linguagem visual |
| Arquiteto de Software | Encaixe na tabela `docs`, ligações, Storage, IA |
| Pesquisador de mercado | 40+ concorrentes com preço e fonte |
| Engenheiro de IA | O que a IA faz em cada órgão e o que ela nunca faz |

---

## 📂 8. Documentos desta pasta

1. `contexto-jardim-e-banco.md`: Olhos e Memória.
2. `contexto-foco-e-tempo.md`: Sistema nervoso.
3. `contexto-portfolio-carreira.md`: Mãos.
4. Este arquivo: o corpo inteiro.

---

## ❓ 9. Decisões que são do Romero

1. **Andreza entra quando?** Recomendo: v2, começando pela Agenda e Saúde da família, que são da casa e não só suas.
2. **Os nomes dos órgãos ficam como estão?** Recomendo: nomes simples na tela (Jardim, Aprendizados, Foco, Portfólio) e o corpo humano só como mapa interno.
3. **Ordem de montagem acima:** recomendo aprovar como está.
4. **Data de saída do gabinete:** define o prazo do mutirão do legado.
