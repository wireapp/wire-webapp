# Wire

This repository is part of the source code of Wire. You can find more information at [wire.com](https://wire.com) or by contacting opensource@wire.com.

You can find the published source code at [github.com/wireapp](https://github.com/wireapp).

For licensing information, see the attached LICENSE file and the list of third-party licenses at [wire.com/legal/licenses/](https://wire.com/legal/licenses/).

## React UI Kit

### Installation

```bash
yarn
```

### Start Storybook

```bash
yarn start
```

### Creating New Components

When creating a new component, follow these guidelines:

1. **Choose the Right Category**

   - Place your component in the appropriate category folder under `src/`:
     - `DataDisplay/`: For data visualization components (tables, lists)
     - `Identity/`: Design system, theme, colors, etc.
     - `Inputs/`: For form controls and input elements
     - `Layout/`: For structural components
     - `Navigation/`: For navigation-related components
     - `Surface/`: For containers, cards, modals, and overlays
     - `Typography/`: For text-related components
     - `utils/`: For utility components

2. **Component Structure** Create a new folder for your component with the following files:

   ```
   Category/
   └── ComponentName/
       ├── ComponentName.tsx       # Main component file
       ├── ComponentName.stories.tsx  # Storybook stories
       └── index.ts               # Export file
   ```

3. **Component File (ComponentName.tsx)**

   - Use TypeScript
   - Include proper type definitions
   - Add JSDoc comments for documentation
   - Follow the existing component patterns

4. **Stories File (ComponentName.stories.tsx)**

   - Create stories for all component variants
   - Include proper documentation
   - Add controls for interactive props
   - Follow the existing story patterns

5. **Index File (index.ts)**
   - Export the component
   - Export any types or utilities specific to the component

Example:

```tsx
// Button.tsx
export interface ButtonProps {
  variant: 'primary' | 'secondary';
  // ... other props
}

export const Button = ({variant, ...props}: ButtonProps) => {
  // Component implementation
};

// Button.stories.tsx
export default {
  title: 'Inputs/Button',
  component: Button,
  // ... story configuration
};

// index.ts
export * from './Button';
```

Remember to:

- Follow the existing naming conventions
- Add proper TypeScript types
- Include comprehensive stories
- Document your component thoroughly
- Test your component thoroughly
