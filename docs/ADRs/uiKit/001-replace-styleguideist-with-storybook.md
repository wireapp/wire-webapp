# ADR: Replace React Styleguidist with Storybook

## Status

Accepted

## Context

The react-ui-kit package currently uses React Styleguidist for component documentation and development. While Styleguidist has served its purpose, several factors have prompted us to reconsider this choice:

1. **Community Support**: Storybook has a larger community, more frequent updates, and better ecosystem support compared to Styleguidist.
2. **Modern Features**: Storybook offers more modern features like:
   - Built-in testing capabilities
   - Better TypeScript support
   - More extensive addon ecosystem
   - Better theming and customization options
3. **Developer Experience**: Storybook provides a more intuitive development environment with features like:
   - Hot module reloading
   - Better component isolation
   - Interactive controls and documentation
4. **Industry Standard**: Storybook has become the de facto standard for component development and documentation in the React ecosystem.

## Decision

We will completely replace React Styleguidist with Storybook in a single PR. This involves:

1. Adding Storybook dependencies and configuration
2. Converting existing component documentation to Storybook stories
3. Implementing minimal necessary addons (theme switching and documentation)
4. Removing all Styleguidist-related code and dependencies

## Consequences

### Benefits

- **Better Developer Experience**: Storybook provides a more modern and feature-rich development environment
- **Improved Documentation**: Better support for TypeScript types and interactive documentation
- **Future-Proof**: Better maintainability with regular updates and strong community support
- **Standardization**: Alignment with industry standards and practices
- **Clean Codebase**: No legacy documentation system remaining after migration
- **Incremental Enhancement**: Starting with a minimal setup allows for future improvements

### Potential Drawbacks

- **Learning Curve**: Team members need to learn Storybook's conventions and features

### Implementation Notes

- Complete conversion of all existing documentation to Storybook stories before PR
- Ensure all components have story files with proper documentation
- Update README and contributing guidelines to reflect new documentation system
- Test build and deployment process thoroughly before merging
- Keep initial implementation minimal, focusing only on core documentation needs
- Plan future enhancements:
  - Component testing integration
  - Additional addons for enhanced functionality
  - Deployment pipeline setup
  - Visual regression testing

## Updates

- Initial implementation completed with Storybook 8.5.2
- Successfully configured minimal setup with theme switching and documentation
