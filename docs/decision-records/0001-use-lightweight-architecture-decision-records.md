# 0001: Use Lightweight Architecture Decision Records

## Status

Accepted

## Context

Architectural changes can occur at almost any point in time, especially in agile projects where business requirements evolve frequently. Keeping track of these decisions—particularly the reasons **why** certain choices were made—can be challenging. For new developers joining a project, understanding the rationale behind past architectural decisions is crucial. Without this context, they might either blindly accept decisions or make changes without fully understanding the implications. Both scenarios are problematic for the long-term health of a software project.

Our goal is to make these decisions transparent and to provide clear explanations for those who were not involved in the decision-making process, ensuring that everyone understands why a particular decision was made.

### Alternatives

There are several alternatives or similar concepts, such as the RFC process or the standard ADR process. However, many of these are burdened with unnecessary details and bureaucracy. Additionally, most of them focus on achieving consensus or alignment, which may not always be necessary.

## Decision

We will use [lightweight architecture decision records](https://github.com/peter-evans/lightweight-architecture-decision-records) to document our decisions in this repository, under `docs/decision-records/NNNN-title.md`. These records will apply solely to this project and may not be relevant to other projects at Wire.

Each architectural decision record must include the following sections:

- **Title**: A short, descriptive title.
- **Context**: A description of the relevant context for the decision.
- **Decision**: The actual decision, expressed in the active voice (e.g., "We will …").
- **Consequences**: A description of the resulting context after the decision is implemented.

## Consequences

An architectural decision record captures a significant decision that will be relevant in the long term. These records ensure that developers, regardless of team composition changes, can access and understand past architectural decisions.

The reasoning behind decisions is documented transparently, providing clarity and continuity for the project.
