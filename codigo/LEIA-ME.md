# Central da Família: app

App instalável no iPhone, com o código separado por tela (`src/telas/<tela>/`) e ligado ao Supabase (schema `produto`).

- **Ver agora, sem internet:** abra `demo.html`. É a Família Silva de exemplo e nada é gravado.
- **Modo exemplo no site:** acrescente `?exemplo=1` no fim do endereço.
- **Códigos do exemplo:** e-mail com o código 123456; equipe da casa com 2468.

## Subir no GitHub Pages (repo romeropernambuco/central-da-familia), sem terminal

O que vai pro site é a pasta `dist` que já está dentro do zip. Ela foi montada com o banco real configurado.

### No Windows (Chrome ou Edge)

1. Descompacte `central-app.zip` (clique direito, depois "Extrair tudo").
2. Abra github.com/romeropernambuco/central-da-familia.
3. Toque em **Add file**, depois em **Upload files**.
4. Abra a pasta `dist` que você extraiu. Selecione **tudo o que está dentro dela** (Ctrl+A) e arraste pra página.
   - Arraste o conteúdo da pasta, não a pasta.
   - Precisam ir: `index.html`, `sw.js`, `manifest.webmanifest`, os 4 ícones e a pasta `assets`.
5. Escreva "app novo" na caixa de mensagem e toque em **Commit changes**.
6. Vá em **Settings**, depois em **Pages**.
7. Em **Source**, escolha **Deploy from a branch**. Escolha a branch `main` e a pasta `/ (root)` e salve.
8. Espere uns 2 minutos. O endereço aparece no topo da tela de Pages.

> **Cuidado:** se o repositório já tem um `index.html` (o Parcelas), ele vai ser trocado pelo novo. Se quiser manter os 2, crie antes uma pasta `app`:
>
> 1. Toque em **Add file**, depois em **Create new file**.
> 2. Digite `app/` no nome e depois `x.txt`.
> 3. Salve.
> 4. Entre na pasta `app` e faça o upload ali.
> 5. Depois apague o `x.txt`.
>
> O endereço fica `.../central-da-familia/app/`.

### No iPhone (Safari)

O upload de pasta pelo Safari falha com frequência, então faça o upload pelo computador. No iPhone:

1. Abra o endereço do site no **Safari**.
2. Toque em Compartilhar (o quadrado com a seta).
3. Toque em **Adicionar à Tela de Início**.
4. O ícone "Central" abre sem a barra do navegador.

## O que falta pra ligar no banco real

1. **Login por e-mail.** No Supabase, abra Authentication, depois URL Configuration. Ponha o endereço do GitHub Pages em **Site URL** e em **Redirect URLs**.
   - O e-mail de código precisa mostrar o `{{ .Token }}`, em Authentication, Email Templates, Magic Link.
   - Deixe **Confirm email** ligado: o convite por e-mail só entra com e-mail confirmado e sessão aberta pelo código de 6 números.
2. **Equipe da casa.** Ligue o login anônimo em Authentication, Sign In / Providers, **Allow anonymous sign-ins** (com CAPTCHA).
   - O casal toca em "Gerar código" na Casa. O app mostra um **link** (`#/equipe?c=<convite>`) e um **código de 4 números**, e abre o WhatsApp com a mensagem pronta. O app nunca envia nada sozinho.
   - A pessoa abre o link e digita só o código. Sem o link, a tela explica "peça o link pra quem cuida da família".
   - O app chama `entrar_equipe_convite(convite, codigo)`. A entrada antiga, só com os 4 números, não é mais usada: o bloco 6 do SQL pode ser rodado depois que este app estiver no ar.
3. **SQL que o dono ainda roda:** `revisao/sql/RODAR_NO_SUPABASE.sql`, 1 bloco por vez. O app funciona antes e depois de cada bloco.
   - Bloco 1: sem ele ninguém novo cria conta. Bloco 2: liga o botão "apagar a família".
   - Bloco 5: o app usa `lancar_com_chave`; se ela não existir, usa `lancar` com `chave`. Tanto faz rodar ou não.
4. **Funções do banco que o app chama (rodada 3, ver `escritorio2/BANCO2.md`):** guardado_hoje, guardado_criar, guardado_movimentar, guardado_encerrar, guardado_custo_do_gasto, escritorio_hoje, escritorio_responder, escritorio_diario, escritorio_relatorio, lembrete_criar, lembrete_concluir, lembrete_adiar, lembrete_apagar, cartao_salvar, fatura_informar, feira_registrar, feira_anexar_nota, feira_sem_nota, estoque_contar, estoque_item_salvar. Se alguma ainda não existir no banco, a tela avisa "ainda está sendo ligado" e o resto do app segue.
   **As de antes:** criar_familia, resumo_hoje, lancar_com_chave (1 chave por toque), definir_limite, apagar_lancamento, restaurar_lancamento, faturas, convidar, entrar_equipe_convite, entrar_por_convite, casa_da_equipe, casa_marcar, numeros_semana, exportar_familia, apagar_familia.
5. **Limite do mês:** 1 chamada a `definir_limite` (vale do mês atual em diante; mês fechado não muda). **Colchão:** `envelopes.colchao` da Casa mensal.
6. **Equipe da casa:** não vê nem recebe valor em dinheiro. O resumo dela vem do banco só com o nome dos envelopes da Casa e o lançamento volta sem valor.
7. **Lista, serviços, gás, folha, rendas e metas:** antes de gravar, o app relê o banco e junta com o que outro celular mudou. Se juntou, aparece um aviso.
8. **Lançamentos:** a tela abre só o mês de hoje. "Ver meses anteriores" traz 1 mês de cada vez.
9. **IA do cupom** (`ia-ler-cupom` versão 2): 6 fotos por minuto, teto por família, teto geral do mês, e a equipe não usa. Cada caso tem a sua mensagem.

## Pra quem mexe no código

- **Escritório 3D:** o Three.js (pacote `three`, versão 0.160) só é baixado quando a pessoa abre a tela Escritório (`src/telas/escritorio/tres.ts` e `cena3d.ts` entram por `import()`). Sem WebGL, ou com `?sem3d` no endereço, fica a lista. A cena mede as imagens por segundo e liga o modo leve sozinha abaixo de 24.
- **Guardado, Escritório, fichas e lembretes:** telas em `src/telas/guardado` e `src/telas/escritorio`; contas em `src/lib/guardado.ts`; modo exemplo em `src/api/exemplo2.ts`.
- `src/rodada3.test.ts` também escreve `escritorio2/FALAS.md` (todas as falas dos funcionários, conferidas).

- `npm run build` monta a pasta `dist`. **O `sw.js` é gerado no build** (`src/sw.modelo.js` + `scripts/sw.mjs`): ele sai com a lista dos arquivos e uma versão nova a cada build. Não existe mais `public/sw.js` e não se edita o `dist/sw.js` na mão.
- `npm test` roda o Vitest. `npm run build:exemplo && npm run e2e` roda o Playwright no modo exemplo, em 390 e 1280.
- `npm run build:demo` gera o `demo.html`. `npm run zip` monta o `central-app.zip` (sem os prints e sem `node_modules`).
- Os prints do teste ficam em `testes/prints` e não entram no zip. As folhas `folha_390.png` e `folha_1280.png` juntam todos.
