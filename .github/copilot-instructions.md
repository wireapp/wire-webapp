# GitHub Copilot Repository Instructions

## REPOSITORY STRUCTURE

You are reviewing code in an Nx monorepo with these key directories:

```
apps/
├── webapp/           # React frontend application
│   ├── src/          # Source code (components, pages, etc.)
│   └── app-config/   # Webapp configuration
└── server/           # Node.js/Express backend API
    └── src/          # Server source code
docs/                 # Project documentation
package.json          # Root dependencies (use yarn commands)
```

## ESSENTIAL COMMANDS

```bash
yarn nx run webapp:serve    # Start frontend development
yarn nx run webapp:build    # Build frontend for production
yarn nx run server:package  # Package server for deployment
```

## CODE REVIEW PRIORITIES

REVIEW IN THIS ORDER:

1. SECURITY ISSUES (CRITICAL - Must fix)
2. ACCESSIBILITY VIOLATIONS (CRITICAL - Must fix)
3. TYPESRIPT/REACT BEST PRACTICES (Important)
4. CODE STYLE (Minor - Only if not handled by linters)

## COMMENT SEVERITY LEVELS

Use these exact formats:

- **[Blocker]** - Security vulnerabilities, accessibility failures, critical functionality issues
- **[Important]** - TypeScript errors, React anti-patterns, performance problems
- **[Suggestion]** - Code organization, naming conventions, minor improvements

## SECURITY CHECKLIST

ALWAYS verify these items in EVERY PR:

✓ Input validation and sanitization ✓ API response validation and error handling ✓ No dangerouslySetInnerHTML without sanitization ✓ No hardcoded secrets, tokens, or API keys ✓ Safe URL handling and redirect validation ✓ Proper authentication and authorization

## ACCESSIBILITY CHECKLIST

For UI changes in apps/webapp/src/:

✓ Keyboard navigation (Tab, Enter, Space, Escape, Arrow keys) ✓ Focus management (visible focus, proper trapping in modals) ✓ ARIA labels and roles (icon buttons need action-focused labels) ✓ Form accessibility (labels tied to inputs, error descriptions) ✓ Screen reader support (aria-live for dynamic content)

## REVIEW SCOPE

REVIEW these files:

- Security: All code changes (especially APIs and user input)
- Accessibility: apps/webapp/src/\*_/_
- TypeScript: apps/\*_/_.{ts,tsx}
- React: apps/webapp/src/\*_/_.{tsx,jsx}

DO NOT REVIEW:

- Code formatting (handled by prettier/eslint)
- Import ordering (automated)
- Trivial naming preferences

## REFERENCE DOCUMENTS

- Web Coding Standards: docs/coding-standards.md
- Technology Radar: docs/tech-radar.md

## SPECIALIZED INSTRUCTION FILES

- Security: .github/instructions/security.instructions.md (apps/\*_/_)
- Accessibility: .github/instructions/accessibility.instructions.md (apps/webapp/src/\*_/_)
- React: .github/instructions/react.instructions.md (apps/webapp/src/\*_/_.{tsx,jsx})
- TypeScript: .github/instructions/typescript.instructions.md (apps/\*_/_.{ts,tsx})

## Pull Request Review Process

### When Reviewing PRs

**Your Approach:**

1. Review only the code changes shown in the diff
2. Focus on security, accessibility, and critical functionality
3. Use clear severity levels in comments
4. Provide specific, actionable feedback with code examples when helpful

### Comment Guidelines

**Format each comment with:**

- Severity level: **[Blocker]**, **[Important]**, or **[Suggestion]**
- File location and line numbers
- Clear explanation of the issue
- Specific fix suggestion when appropriate

**Example:**

````
**[Blocker]** - Security vulnerability in authentication.ts:45

The password validation logic allows empty strings. This could allow unauthorized access.

**Suggested fix:**
```typescript
if (!password || password.trim().length === 0) {
  throw new Error('Password cannot be empty');
}
````

```

### Security Review Checklist
For every PR, check these security items:

- **Input Validation**: All user inputs are validated before use
- **API Response Handling**: Responses are validated and have error handling
- **XSS Prevention**: No unsafe HTML rendering without sanitization
- **Secret Management**: No hardcoded secrets, tokens, or API keys
- **URL Safety**: All redirects and external URLs are validated

### Accessibility Review Checklist
For UI changes in `apps/webapp/src/`:

- **Keyboard Navigation**: All interactive elements are keyboard accessible
- **Focus Management**: Proper focus handling in modals and dynamic content
- **ARIA Labels**: Icon buttons have meaningful labels
- **Form Accessibility**: Inputs have proper labels and error descriptions

### Technology Review
When new dependencies are added:

1. Check if the dependency is in the [Tech Radar](docs/tech-radar.md)
2. If **Adopt** or **Trial**: Verify it follows project standards
3. If **Hold** or **Assess**: Flag as **[Blocker]** and require team approval
4. Check for security vulnerabilities and licensing issues

### Approval Criteria
**Approve the PR when:**
- No **[Blocker]** issues remain
- All **[Important]** issues are either fixed or properly justified
- Security and accessibility requirements are met

**Request changes when:**
- Any **[Blocker]** issues exist
- Critical security vulnerabilities are found
- Essential accessibility features are missing
```
