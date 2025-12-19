---
appliesTo:
  paths:
    - 'src/**/*'
---

# Copilot — Accessibility

- Keyboard access: every control focusable; Enter/Space activate; Arrow keys move in menus/lists with roving tab index; Escape closes overlays.
- Focus management: move focus into opened overlays, trap focus in blocking modals, and restore focus to the trigger on close.
- Semantics: prefer native elements; for custom UI set correct roles/names/states; icon-only controls must have an action-focused `aria-label`/`title`.
- Forms and errors: always use `<label>` tied to inputs; surface errors with text and `aria-describedby`/`aria-invalid`.
- Live updates: use `aria-live="polite"` for async/status messages; keep announcements short.
- Loading and progress: expose busy/progress with text and `aria-busy`/`aria-live`.
- Tooltips: if critical, open on hover and focus and keep them non-focusable (role="tooltip").
