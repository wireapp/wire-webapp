# Wire

This repository is part of the source code of Wire. You can find more information at [wire.com](https://wire.com) or by contacting opensource@wire.com.

You can find the published source code at [github.com/wireapp](https://github.com/wireapp).

For licensing information, see the attached LICENSE file and the list of third-party licenses at [wire.com/legal/licenses/](https://wire.com/legal/licenses/).

## @wireapp/eslint-config

> Wire's [ESLint](https://eslint.org/docs/developer-guide/shareable-configs) config.

### Usage

**Install (macOS, Linux)**:

```bash
yarn add --dev @wireapp/eslint-config \
               @typescript-eslint/eslint-plugin \
               @typescript-eslint/parser \
               eslint-config-prettier \
               eslint-plugin-jsdoc \
               eslint-plugin-no-unsanitized \
               eslint-plugin-prettier \
               eslint-plugin-react \
               eslint-plugin-react-hooks \
               eslint-plugin-sort-keys-fix \
               prettier \
               eslint
```

**Install (Windows)**:

```powershell
yarn add --dev @wireapp/eslint-config ^
               @typescript-eslint/eslint-plugin ^
               @typescript-eslint/parser ^
               eslint-config-prettier ^
               eslint-plugin-jsdoc ^
               eslint-plugin-no-unsanitized ^
               eslint-plugin-prettier ^
               eslint-plugin-react ^
               eslint-plugin-react-hooks ^
               eslint-plugin-sort-keys-fix ^
               prettier ^
               eslint
```

**Edit `.eslintrc.json`**:

```jsonc
{
  // ...
  "extends": "@wireapp/eslint-config"
}
```
