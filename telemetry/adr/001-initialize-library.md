# ADR: Initialize library

## Status

Proposed

## Context

Our project currently requires telemetry functionalities across multiple applications, including our web app and team management app. Up until now, we’ve implemented telemetry by manually integrating Countly analytics in each client. This has led to duplicated code and maintenance overhead, as any updates to telemetry functions must be manually applied across all clients.

Additionally, we are directly reliant on Countly as our analytics provider. Direct dependence on this specific provider poses a challenge for future flexibility. If we decide to switch to a different analytics provider, significant refactoring would be required across all clients, as Countly-specific code is embedded directly in each of them.

To address these issues, we’re considering an abstraction layer for telemetry to centralize and simplify our analytics codebase.

## Decision

We will create a telemetry library that abstracts our use of Countly as an analytics provider. This library will act as an intermediary between our applications and the Countly API, enabling a unified implementation of telemetry functions across clients.

This abstraction layer will:

Eliminate the need for redundant telemetry code in multiple clients. Provide a single codebase for implementing telemetry updates, reducing maintenance. Enable flexibility to switch analytics providers in the future by only needing to modify the telemetry library, rather than each client.

## Consequences

### Benefits

- **Reduced Code Duplication**: By centralizing telemetry code, we remove the need to copy-paste analytics code across multiple clients, reducing potential errors and inconsistencies.
- **Easier Maintenance**: Updates or bug fixes in telemetry functions can be made in a single location, making ongoing maintenance more efficient.
- **Provider Flexibility**: Abstracting telemetry functions from the Countly API will allow us to switch to another analytics provider with minimal disruption, as client applications will remain unaffected.

### Potential Drawbacks

- **Initial Development Overhead**: Creating an abstraction layer introduces additional initial development time and complexity.
- **Library Maintenance**: This library will require regular maintenance to ensure compatibility with Countly updates or any future provider we may choose.
