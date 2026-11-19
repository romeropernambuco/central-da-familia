# Proposta clean: pasta de análise

Documentos para comparar a versão antiga com a proposta clean e decidir o upgrade.

- `INVENTARIO-FUNCOES.md`: o que o app tem x o que a proposta clean cobre.
- `REGISTRO-DA-CONVERSA.md`: como chegamos aqui, decisões e regras do dono.

## As duas portas

- **5199, versão nova** (precisa do servidor de desenvolvimento ligado):
  - App completo em modo exemplo: `http://localhost:5199/`
  - Propostas A a M: `http://localhost:5199/src/propostas/propostas.html#/m`
- **5200, versão antiga** (build de produção da `fase-final`, de 14/11): `http://localhost:5200/app/`. Pede e-mail e código (dados reais).

## Subir de novo

Nova (a partir da pasta `codigo`):

```bash
npx vite --mode exemplo --port 5199 --strictPort
```

Antiga (a worktree fica em `../central-da-familia-rodada/antiga-fase-final`):

```bash
python -m http.server 5200 --directory ../central-da-familia-rodada/antiga-fase-final
```
