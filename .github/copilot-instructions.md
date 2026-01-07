# GitHub Copilot Repository Instructions

## ⚠️ CRITICAL RULES - READ FIRST

**YOU MUST FOLLOW THESE RULES IN EVERY RESPONSE:**

1. ✅ **Always use Nx commands** (`nx run`, `nx run-many`, `nx affected`) - never call tools directly
2. 🔒 **Security is mandatory** - check all input validation, XSS, secrets, and API handling
3. ♿ **Accessibility is mandatory** - verify keyboard nav, ARIA, focus management for all UI changes
4. 📋 **Use severity levels** - tag all comments with [Blocker], [Important], or [Suggestion]
5. 📁 **Check specialized instructions** - load context from `.github/instructions/*.md` for specific file types

## REPOSITORY STRUCTURE

You are reviewing code in an Nx monorepo with these key directories:

```
apps/
├── webapp/           # React frontend application
│   ├── src/          # Source code (components, pages, etc.)
│   └── app-config/   # Webapp configuration
└── server/           # Node.js/Express backend API
    └── src/          # Server source code
libraries/
└── core/             # Core library (@wireapp/core) with messaging protocols
    └── src/          # Library source code
docs/                 # Project documentation
package.json          # Root dependencies (use yarn commands)
```

## ESSENTIAL COMMANDS

```bash
yarn nx run webapp:serve     # Start frontend development
yarn nx run webapp:build     # Build frontend for production
yarn nx run core-lib:build   # Build core library
yarn nx run server:package   # Package server for deployment
```

## NX WORKFLOW GUIDELINES

**Important:** This is an Nx monorepo. Follow these guidelines:

- **Always use Nx commands**: Run tasks through `nx` (e.g., `nx run`, `nx run-many`, `nx affected`) instead of calling underlying tools directly
- **Use Nx MCP tools**: You have access to Nx MCP server tools:
  - `nx_workspace` - Understand workspace architecture and check for errors
  - `nx_project_details` - Analyze specific project structure and dependencies
  - `nx_docs` - Get up-to-date Nx configuration guidance (never assume Nx configuration)
- **Check workspace first**: When answering repository questions, use `nx_workspace` tool first to understand the architecture
- **Get help for errors**: Use `nx_workspace` tool to diagnose Nx configuration or project graph errors

## CODE REVIEW PRIORITIES

**ALWAYS REVIEW IN THIS ORDER:**

1. **SECURITY ISSUES** (CRITICAL - Must fix immediately)
2. **ACCESSIBILITY VIOLATIONS** (CRITICAL - Must fix immediately)
3. **TYPESCRIPT/REACT BEST PRACTICES** (Important - Should fix)
4. **CODE STYLE** (Minor - Only if not handled by linters)

## COMMENT SEVERITY LEVELS

Use these exact formats:

- **[Blocker]** - Security vulnerabilities, accessibility failures, critical functionality issues
- **[Important]** - TypeScript errors, React anti-patterns, performance problems
- **[Suggestion]** - Code organization, naming conventions, minor improvements

## SECURITY CHECKLIST

ALWAYS verify these items in EVERY PR:

- ✓ Input validation and sanitization
- ✓ API response validation and error handling
- ✓ No dangerouslySetInnerHTML without sanitization
- ✓ No hardcoded secrets, tokens, or API keys
- ✓ Safe URL handling and redirect validation
- ✓ Proper authentication and authorization

## ACCESSIBILITY CHECKLIST

For UI changes in apps/webapp/src/:

- ✓ Keyboard navigation (Tab, Enter, Space, Escape, Arrow keys)
- ✓ Focus management (visible focus, proper trapping in modals)
- ✓ ARIA labels and roles (icon buttons need action-focused labels)
- ✓ Form accessibility (labels tied to inputs, error descriptions)
- ✓ Screen reader support (aria-live for dynamic content)

## REVIEW SCOPE

REVIEW these files:

- Security: All code changes (especially APIs and user input)
- Accessibility: apps/webapp/src/**/*
- TypeScript: apps/**/*.{ts,tsx}, libraries/**/*.{ts,tsx}
- React: apps/webapp/src/**/*.{tsx,jsx}

DO NOT REVIEW:

- Code formatting (handled by prettier/eslint)
- Import ordering (automated)
- Trivial naming preferences

## REFERENCE DOCUMENTS

- Web Coding Standards: docs/coding-standards.md
- Technology Radar: docs/tech-radar.md

## SPECIALIZED INSTRUCTION FILES

- Security: .github/instructions/security.instructions.md (apps/**/*)
- Accessibility: .github/instructions/accessibility.instructions.md (apps/webapp/src/**/*)
- React: .github/instructions/react.instructions.md (apps/webapp/src/**/*.{tsx,jsx})
- TypeScript: .github/instructions/typescript.instructions.md (apps/**/*.{ts,tsx})

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
