# Security policy

## Reporting a vulnerability

Please use GitHub's **private vulnerability reporting** (Security tab → "Report a vulnerability"). Don't open a public issue.

## What this project is

A static, client-side study site on GitHub Pages. No server, no accounts, no analytics, no cookies. Your study progress (starred terms, flashcard boxes, quiz scores and notes) is kept only in your own browser's local storage. You can export it as a JSON file and import it on another device.

## Protections

| Threat | Control |
|---|---|
| Malicious dependency or install script | None to compromise: no npm or pip packages, no `package.json`, no lockfiles. The scanner fails if one appears. |
| Compromised CDN or injected script | No third-party scripts or styles. Fonts are copies kept in `fonts/` (WOFF, SIL OFL / Apache 2.0, licences in `fonts/licenses/`) and checked to be real WOFF files. The Content-Security-Policy allows only the site's own files: `default-src 'none'; script-src 'self'; style-src 'self'; font-src 'self'; connect-src 'self'`. No inline scripts or styles. |
| Hidden network calls | The only request the page makes is `fetch('data/<name>.json')` for its own data files. The scanner rejects any other `fetch`, `XMLHttpRequest`, `WebSocket`, dynamic `import()`, `postMessage` or remote URL in `js/`. The one allowed URL is the SLB glossary link base used to build each term's "Official SLB definition" link. |
| Malicious content in data files | Every string from `data/*.json` is rendered through an allowlist that keeps only `<sub>`, `<sup>`, `<i>`, `<b>` and `<br>` and escapes everything else, and the JS tests prove it. The scanner and `tools/check_data.py` also reject script, event handlers and `javascript:` in data, and non-https resource links. |
| Tampered progress file | Imported or stored progress is treated as untrusted: only known keys, id-shaped names and finite numbers in range are kept; notes are length-limited and shown as plain text. |
| Code injection | No `eval`, `new Function`, string timers or `document.write`. |
| Compromised GitHub Action | Every action is pinned to a full commit SHA; Dependabot proposes reviewed bumps. Workflows have read-only tokens, `persist-credentials: false`, and never use `pull_request_target`. |
| Prompt injection against AI coding agents | No agent instruction files are committed (`CLAUDE.md`, `AGENTS.md`, `.mcp.json`, `.claude/` …). The scanner also rejects hidden or bidirectional Unicode, HTML comments in Markdown and common injection phrases. |
| Leaked secrets | The scanner checks for common key and token formats. The project needs no secrets. |
| AI tools listed as contributors | `.githooks/commit-msg` strips AI co-author trailers; the scanner fails if one is in history. |

Run the checks locally with `python3 tools/security_scan.py`.

## Recommended GitHub settings

1. Two-factor authentication on your GitHub account.
2. Settings → Code security: secret scanning, push protection, Dependabot alerts, private vulnerability reporting.
3. Settings → Branches: protect `main` (require pull requests and the `CI / check` status, block force pushes).
4. Settings → Actions → General: workflow permissions **read repository contents**.
5. Settings → Pages: source **GitHub Actions**.
