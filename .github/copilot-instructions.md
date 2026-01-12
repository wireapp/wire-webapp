# 🚨 STOP - READ THIS FIRST 🚨

## MANDATORY REQUIREMENTS FOR EVERY RESPONSE

You MUST do ALL of these things in EVERY response:

### 1. 🔒 SECURITY CHECKS (BLOCKER - NEVER SKIP)
- ✓ Validate ALL user inputs before use
- ✓ Check API responses are validated with error handling
- ✓ NO `dangerouslySetInnerHTML` without sanitization
- ✓ NO hardcoded secrets, tokens, or API keys
- ✓ Validate all URL redirects and external links
- ✓ Verify authentication and authorization

### 2. ♿ ACCESSIBILITY CHECKS (BLOCKER - NEVER SKIP)
For ANY UI change in `apps/webapp/src/`:
- ✓ Keyboard navigation works (Tab, Enter, Space, Escape, Arrows)
- ✓ Focus management (visible focus, trapped in modals)
- ✓ ARIA labels on icon buttons (action-focused, not icon name)
- ✓ Form labels tied to inputs with error descriptions
- ✓ Screen reader support (aria-live for dynamic content)

### 3. ✅ USE NX COMMANDS (NEVER USE DIRECT TOOL CALLS)
```bash
nx run webapp:build      # ✅ CORRECT
npm run build           # ❌ WRONG

nx run-many -t test     # ✅ CORRECT
jest                    # ❌ WRONG
```

### 4. 📋 TAG ALL COMMENTS WITH SEVERITY
- `[Blocker]` - Security/accessibility/critical bugs (MUST FIX)
- `[Important]` - TypeScript errors, React anti-patterns, performance
- `[Suggestion]` - Code organization, naming, minor improvements

---

## REPOSITORY STRUCTURE

**Nx Monorepo:**

```
apps/
├── webapp/           # React frontend (security + accessibility focus)
└── server/           # Node.js/Express API (security focus)
libraries/
└── core/             # @wireapp/core - Communication library
                      # ⚠️ CRITICAL: Changes affect authentication, encryption, messaging
```

### Core Library (`@wireapp/core`)
**Location:** `libraries/core/`
**Critical Functions:**
- Authentication and session management
- WebSocket connections
- Protocol message handling (Protobuf)
- Cryptographic operations

⚠️ **Changes to core MUST be reviewed for security and backwards compatibility**

---

## COMMENT FORMAT

**ALWAYS use this exact format:**

```
**[Blocker]** - Security vulnerability in auth.ts:45

The password validation accepts empty strings, allowing unauthorized access.

Suggested fix:
\`\`\`typescript
if (!password?.trim()) {
  throw new Error('Password required');
}
\`\`\`
```

---

## REVIEW PRIORITY ORDER

Review in this exact order:

1. **🔒 SECURITY** (Blocker - stop everything else if found)
2. **♿ ACCESSIBILITY** (Blocker - stop everything else if found)
3. **⚙️ TYPESCRIPT/REACT** (Important)
4. **🎨 CODE STYLE** (Only if linters don't catch it)

---

## NX WORKFLOW (MANDATORY)

**ALWAYS use Nx commands:**
```bash
# Development
nx run webapp:serve

# Building
nx run webapp:build --configuration=production
nx run server:package

# Testing
nx run-many -t test --all
nx affected -t test

# Linting
nx run-many -t lint --all
```

**MCP Tools Available:**
- `nx_workspace` - Get architecture overview, check for errors
- `nx_project_details` - Analyze project structure
- `nx_docs` - Get current Nx configuration docs (NEVER assume)

---

## SECURITY REVIEW CHECKLIST

Check EVERY PR for these (failure = [Blocker]):

| Check | What to Look For |
|-------|------------------|
| **Input Validation** | All `req.body`, `req.query`, `req.params` validated |
| **API Response** | Try-catch blocks, response validation, error handling |
| **XSS Prevention** | No `dangerouslySetInnerHTML`, sanitize HTML, escape output |
| **Secrets** | No API keys, tokens, passwords in code |
| **URL Safety** | Validate redirects, check for open redirects |
| **Auth/Authz** | Verify permission checks, session validation |

**Common Vulnerabilities:**
```typescript
// ❌ BLOCKER - No validation
app.post('/api/user', (req, res) => {
  const user = req.body;
  db.save(user);
});

// ✅ CORRECT - Validated
app.post('/api/user', (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    name: z.string().min(1).max(100)
  });
  const user = schema.parse(req.body);
  db.save(user);
});
```

---

## ACCESSIBILITY REVIEW CHECKLIST

For ANY file in `apps/webapp/src/` (failure = [Blocker]):

| Check | Requirements |
|-------|--------------|
| **Keyboard Nav** | All interactive elements reachable/operable via keyboard |
| **Focus** | Visible focus indicator, logical order, trapped in modals |
| **ARIA** | Icon buttons have action labels ("Delete message", not "Trash icon") |
| **Forms** | Labels for inputs, error messages with `aria-describedby` |
| **Dynamic Content** | Use `aria-live` for status updates, `role="alert"` for errors |

**Common Violations:**
```tsx
// ❌ BLOCKER - No keyboard access, no ARIA
<div onClick={handleDelete}>🗑️</div>

// ✅ CORRECT - Accessible
<button
  onClick={handleDelete}
  aria-label="Delete message"
>
  🗑️
</button>
```

---

## WHAT NOT TO REVIEW

DO NOT comment on:
- Code formatting (prettier handles it)
- Import ordering (automated)
- Trivial naming preferences
- Style that matches existing patterns

---

## APPROVAL CRITERIA

**✅ APPROVE when:**
- Zero [Blocker] issues
- All [Important] issues fixed or justified
- Security + accessibility requirements met

**❌ REQUEST CHANGES when:**
- Any [Blocker] issues exist
- Security vulnerabilities present
- Accessibility requirements not met

---

## SPECIALIZED INSTRUCTIONS

For detailed rules by file type:
- **Security:** `.github/instructions/security.instructions.md`
- **Accessibility:** `.github/instructions/accessibility.instructions.md`
- **React:** `.github/instructions/react.instructions.md`
- **TypeScript:** `.github/instructions/typescript.instructions.md`

**Reference Docs:**
- Coding Standards: `docs/coding-standards.md`
- Tech Radar: `docs/tech-radar.md`

---

## DEPENDENCY MANAGEMENT

When new dependencies are added:
1. Check `docs/tech-radar.md` for approval status
2. **Adopt/Trial** ✅ - Verify follows standards
3. **Hold/Assess** 🚫 - Flag as [Blocker], require team approval
4. Check for security vulnerabilities (npm audit, Snyk)
5. Verify license compatibility

---

## EXAMPLE REVIEW

```markdown
**[Blocker]** - XSS vulnerability in MessageComponent.tsx:67

Using `dangerouslySetInnerHTML` without sanitization allows script injection.

Suggested fix:
\`\`\`typescript
import DOMPurify from 'dompurify';

<div dangerouslySetInnerHTML={{
  __html: DOMPurify.sanitize(message.content)
}} />
\`\`\`

**[Blocker]** - Keyboard inaccessible in MessageActions.tsx:45

Delete button is a `<div>` with `onClick`, not keyboard accessible.

Suggested fix:
\`\`\`typescript
<button
  onClick={handleDelete}
  aria-label="Delete message"
  className="delete-btn"
>
  <TrashIcon />
</button>
\`\`\`

**[Important]** - Missing error handling in api.ts:123

API call has no try-catch or error handling, will crash on network errors.

**[Suggestion]** - Consider extracting validation logic

The validation code could be a reusable schema to reduce duplication.
```
