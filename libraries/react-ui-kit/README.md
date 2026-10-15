# Wire

This repository is part of the source code of Wire. You can find more information at [wire.com](https://wire.com) or by contacting opensource@wire.com.

You can find the published source code at [github.com/wireapp](https://github.com/wireapp).

For licensing information, see the attached LICENSE file and the list of third-party licenses at [wire.com/legal/licenses/](https://wire.com/legal/licenses/).

## React UI Kit

### Installation

```bash
yarn
```

### Creating New Components

When creating a new component, follow these guidelines:

1. **Choose the Right Category**

   - Place your component in the appropriate category folder under `src/`:
     - `dataDisplay/`: For data visualization components (tables, lists)
     - `identity/`: Design system, theme, colors, etc.
     - `inputs/`: For form controls and input elements
     - `layout/`: For structural components
     - `navigation/`: For navigation-related components
     - `surface/`: For containers, cards, modals, and overlays
     - `typography/`: For text-related components
     - `utils/`: For utility components

2. **Component Structure** Create a folder for your component with the files it needs:

   ```
   src/
   └── inputs/
       └── button/
           ├── button.tsx
           ├── button.styles.ts  # When styles need their own file
           ├── button.test.tsx   # For behavior that needs coverage
           └── index.ts
   ```

3. **Component File (componentName.tsx)**

   - Use TypeScript
   - Include proper type definitions
   - Document public props and non-obvious behavior
   - Follow the existing component patterns

4. **Styles and Tests**

   - Keep styles in a separate file when that matches the component's organization
   - Add focused Jest tests for observable behavior and important variants

5. **Index File (index.ts)**
   - Export the component
   - Export its public types and utilities
   - Re-export it from the relevant category and package entry points when it belongs in the public API

Example:

```tsx
// button.tsx
import type {JSX} from 'react';

export type ButtonProps = {
  readonly label: string;
};

export function Button(options: ButtonProps): JSX.Element {
  return <button>{options.label}</button>;
}

// index.ts
export {Button} from './button';
export type {ButtonProps} from './button';
```

Remember to:

- Follow the existing naming conventions
- Add proper TypeScript types
- Export only the component API that consumers need
- Cover behavior with focused tests
