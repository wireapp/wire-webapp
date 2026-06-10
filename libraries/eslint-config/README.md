# Wire

This repository is part of the source code of Wire. You can find more information at [wire.com](https://wire.com) or by contacting opensource@wire.com.

You can find the published source code at [github.com/wireapp](https://github.com/wireapp).

For licensing information, see the attached LICENSE file and the list of third-party licenses at [wire.com/legal/licenses/](https://wire.com/legal/licenses/).

## @wireapp/eslint-config

> Wire's [ESLint](https://eslint.org/docs/developer-guide/shareable-configs) config. Made with typescript in mind.

### Usage

**Install (macOS, Linux)**:

```bash
yarn add -D @types/eslint \
@types/prettier \
@typescript-eslint/eslint-plugin \
@typescript-eslint/parser \
eslint \
eslint-config-prettier \
eslint-import-resolver-alias \
eslint-import-resolver-typescript \
eslint-plugin-better-styled-components \
eslint-plugin-header \
eslint-plugin-import \
eslint-plugin-jest \
eslint-plugin-jest-dom \
eslint-plugin-jsdoc \
eslint-plugin-jsx-a11y \
eslint-plugin-no-unsanitized \
eslint-plugin-prettier \
eslint-plugin-react \
eslint-plugin-react-hooks \
eslint-plugin-simple-import-sort \
eslint-plugin-testing-library \
eslint-plugin-unused-imports \
prettier \
typescript
```

**Install (Windows)**:

```powershell
yarn add -D @types/eslint ^
@types/prettier ^
@typescript-eslint/eslint-plugin ^
@typescript-eslint/parser ^
eslint ^
eslint-config-prettier ^
eslint-import-resolver-alias ^
eslint-import-resolver-typescript ^
eslint-plugin-better-styled-components ^
eslint-plugin-header ^
eslint-plugin-import ^
eslint-plugin-jest ^
eslint-plugin-jest-dom ^
eslint-plugin-jsdoc ^
eslint-plugin-jsx-a11y ^
eslint-plugin-no-unsanitized ^
eslint-plugin-prettier ^
eslint-plugin-react ^
eslint-plugin-react-hooks ^
eslint-plugin-simple-import-sort ^
eslint-plugin-testing-library ^
eslint-plugin-unused-imports ^
prettier ^
typescript
```

**Edit `.eslintrc.json`**:

```jsonc
{
  // ...
  "extends": "@wireapp/eslint-config",
}
```
