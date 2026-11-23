# AGENTS.md

## Stack & verification
- Vanilla PHP 8.2 + Oracle (Tasy ERP) via PDO; vanilla JS (IIFE modules), CSS. No Composer, npm, build, tests, or lint — do not guess toolchain commands.
- Verify changes via HTTP GET against the local API or `php` CLI. SQL is Oracle (DECODE, NVL, TRUNC, FETCH FIRST) — never "fix" it to MySQL syntax.
- CLI gotcha: run `php` from `api/` — `_bootstrap.php` uses a relative include that resolves against the working directory under `php -r`.
- PowerShell gotcha: wrap `php -r` code in single quotes; double quotes interpolate `$variables`.

## Local environment (Windows / XAMPP)
- App URL: http://localhost/grid-painel/ — Apache alias `/grid-painel` → `D:/www/node/GRID-Painel` defined in `C:\xampp\apache\conf\extra\httpd-vhosts.conf`.
- DB drivers: `pdo_oci` enabled in `C:\xampp\php\php.ini`; Oracle Instant Client 21.9 at `C:\oracle\instantclient_21_9` (on PATH).
- Apache runs as service `Apache2.4` (port 80). Restart needs an elevated shell — the agent shell is not admin; ask the user to restart via XAMPP Control Panel.

## External connection dependency (critical)
- `api/_bootstrap.php` includes `../../../classes/conexao/conexaoTasy.php` → `D:\www\classes\conexao\conexaoTasy.php`, OUTSIDE this repo. It provides `$conectTasy` (PDO) and contains credentials: NEVER read, log, or commit its contents.
- This repo was extracted from a larger `grid` project; comments referencing `grid/pages/painel` are stale. Without that file, all DB endpoints fail (only `configuracoes.php` works — it is file-based).

## Architecture
- Frontend: modules expose frozen `window.Grid*` globals and communicate via CustomEvents (`grid:nova-chamada`, `grid:painel-inicializado`, `grid:configuracoes-atualizadas`, ...). Script order in `index.php` matters (no bundler). Flow: configuracao-painel → painel (orchestrator) → chamadas (1s polling) → fila → audio/historico.
- API: one file per endpoint; shared helpers in `api/_bootstrap.php` (reused by all endpoints).
- Panel config persists in `config/paineis/{computador}.json` (+ `config/backups/`), created lazily on first POST to `api/configuracoes.php`. Runtime-generated: do not commit. `chamada.php` reads monitored queues from that JSON — missing file/empty `filas` returns "no calls" by design, not a bug.

## Constraints (intentional, do not "improve")
- Oracle DB is STRICTLY READ-ONLY: only SELECT via the existing endpoints. Never run INSERT/UPDATE/DELETE/DDL or any write. If a new query is needed, ask the user to create it first.
- 30-min config-sync polling is deliberate; WebSocket/SSE is NOT available on the production server — keep polling.
- Establishment id 125 is hardcoded in `config.php` by design.
- `docs/plano-de-implementacao.md` has a status section: queue selection + config schema/validation are done; themes CRUD, image uploads, panel linking, and admin tabs are still pending.
- Code identifiers, comments, and UI text are pt-BR — keep them in Portuguese.

## Workflow
- Commits: show the file list and proposed message, ask permission, commit only after approval. Split into logical commits (conventional-commit style, e.g. `feat:`, `refactor:`, `chore:`, `docs:`). Never commit runtime files (`config/paineis/`, `config/backups/`, `assets/imagens/`) or secrets. Do not push unless asked.