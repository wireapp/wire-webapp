# ADR: Custom URL Pattern Matching Implementation

## Status

Proposed

## Context

Our application currently uses the switch-path library for route matching, which has several limitations:

- The library hasn't been updated since 2015
- It doesn't support dynamic URL segments in the format ".../files/segment1/segment2"
- URL parameter implementation doesn't work as expected

We need to implement a new route for Wire Cells that supports both conversation files view and dynamic segments. While solutions like react-router exist, they would require a complete overhaul of our routing system, which is not feasible for a single feature change.

## Decision

We will implement our own custom route matching solution that:

- Maintains compatibility with our existing routing system
- Supports dynamic URL segments
- Replaces the outdated switch-path library
- Provides flexibility for future modifications

This custom implementation will be specifically designed to handle route matching while keeping the core routing system intact.

## Consequences

### Benefits

- **Complete Control**: We own the code and can modify it as needed
- **Minimal Disruption**: Core routing system remains unchanged
- **Flexibility**: Can be easily extended to support new route patterns
- **Modern Solution**: Replaces outdated dependency
- **Focused Implementation**: Tailored specifically to our needs

### Potential Drawbacks

- **Maintenance Responsibility**: We are responsible for maintaining and updating the route matching code

### Mitigations

- The implementation will be well-documented and tested
- The code will be designed with extensibility in mind
- We can revisit the decision to use a different route matching solution in the future if needed
