# Architecture Decision Records (ADRs)

## What are ADRs?

Architecture Decision Records (ADRs) are documents that describe significant architectural decisions made in a project. They capture the context, decision, and consequences of important technical choices.

## Why Use ADRs?

ADRs provide several benefits:

- **Historical Context**: New team members can understand why decisions were made
- **Decision Traceability**: Track the evolution of architecture over time
- **Documentation**: Create a permanent record of architectural choices
- **Reversibility**: Make it easier to understand what would need to change if a decision is reversed

## ADR Template

Each ADR should follow this structure:

```markdown
# YYYY-MM-DD - [Short Title]

## Context

What is the issue that we're seeing that is motivating this decision or change?

## Decision

What is the change that we're proposing and/or doing?

## Consequences

- **Positive**: What becomes easier or more difficult to do because of this change?
- **Negative**: What becomes easier or more difficult to do because of this change?

## Alternatives Considered

What other approaches did we consider, and why did we reject them?

## Related ADRs

Links to related decisions
```

## Naming Convention

ADRs use a date prefix for chronological ordering: `YYYY-MM-DD-topic.md`

## When to Create an ADR

Create an ADR for:

1. **Major Architectural Changes** - Structural changes to the codebase
2. **Technology Selection** - Choosing new frameworks, libraries, or tools
3. **Breaking Changes** - Changes that require updates across the codebase
4. **Process Changes** - Significant changes to development workflows
5. **Infrastructure Decisions** - Changes to deployment, CI/CD, or tooling

## When NOT to Create an ADR

Don't create an ADR for:

1. **Minor Refactoring** - Small code improvements
2. **Bug Fixes** - Unless they reveal architectural issues
3. **Implementation Details** - Low-level coding decisions
4. **Temporary Workarounds** - Unless they become permanent

## References

- [Michael Nygard's ADR Format](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
- [ThoughtWorks Architecture Decision Records](https://www.thoughtworks.com/radar/techniques/practice/architecture-decision-record)
- [ADR Tools and Templates](https://adr.github.io/)
