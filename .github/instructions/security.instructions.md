---
applyTo: 'apps/**/*'
description: Security hygiene for all application code
---

# Copilot — Security hygiene

- Validate and sanitise **all untrusted input** and **all API responses**.
- Avoid `dangerouslySetInnerHTML`. If used, it must be sanitised and commented with the sanitizer reference.
- Avoid raw DOM insertion and unvalidated URLs; suggest safe helpers.
