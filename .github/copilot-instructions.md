# Copilot — Repository Instructions (Security-first)

## Goals & tone

- Apply our **Web Coding Standards** during **PR description drafting** and **code review**.
- Prefer **specific, actionable** comments with short code examples.
- Use severities: **[Blocker]**, **[Important]**, **[Suggestion]**.
- Do **not** nitpick items handled by automation (formatting, lint rules).

Related docs:

- **Coding Standards:** ../docs/coding-standards.md
- **Tech Radar:** ../docs/tech-radar.md

---

## PR description — Auto-checks Copilot should perform

---

## Security Checklist (required)

- [ ] **External inputs validated & sanitised** (client/server as applicable). _Tick if_ validation/sanitisation is visible before use.
- [ ] **API responses validated**; unexpected shapes handled (fallbacks/errors). _Tick if_ guards/schemas are present at boundaries.
- [ ] **No unsafe HTML is rendered**; if unavoidable, sanitisation is applied **and** noted where it happens. _Fail signal:_ `dangerouslySetInnerHTML` without sanitiser (e.g., `DOMPurify.sanitize`).
- [ ] **Injection risks (XSS/SQL/command) mitigated** via safe APIs/escaping. _Tick if_ sinks are avoided or safely wrapped.

---

## When reviewing pull requests (Copilot)

**Scope & approach**

- Review **from the code diff only**; do not assume runtime behavior.
- Use severities: **[Blocker]**, **[Important]**, **[Suggestion]**.
- Provide concise, actionable comments; include a minimal before/after snippet where useful.

### Security (focus of inline review)

- Avoid/flag `dangerouslySetInnerHTML`; if present, require sanitisation and name the sanitizer.
- No raw DOM insertion into trusted contexts; validate URLs/redirect targets.
- Validate untrusted inputs and API responses **before** use; prefer schemas/guards.
- Check for secrets/tokens in code, configs, and tests.
- Call out missing error/fallback paths on boundary failures.

### Accessibility (minimum check)

- Keyboard access (Esc closes dialogs), visible focus, correct roles/labels.
- Use of `aria-live` for async status where appropriate.

### Everything else

- For imports/TS/React/testing/naming/readability: **refer to** the [Coding Standards](../docs/coding-standards.md).
  - If a standard is violated, link the relevant section and suggest a minimal change.

### Technology choices

- Compare any new dependencies in `package.json`/lockfiles to the [Tech Radar](../docs/tech-radar.md).
  - If not **Adopt**/**Trial**, mark **[Blocker]** and request an RFC/approval link.
  - For **Trial**, ensure usage is narrowly scoped and success criteria exist.

---

## Comment format Copilot should use

**Top-level summary**

- Verdict: **Ready** / **Changes requested**, with counts of Blockers/Important/Suggestions.
- Mini checklist (only items evidenced by diff): Security, Accessibility, Tech choices, (then link to Coding Standards for any non-security notes).

**Inline comments**

- One issue per comment with severity, file:line, brief reason, and (when helpful) a minimal suggested patch.

**Approval**

- Approve only if there are **no Blockers** and Important items are fixed or explicitly deferred with rationale.
