# Wire

This repository is part of the source code of Wire. You can find more information at [wire.com](https://wire.com) or by contacting opensource@wire.com.

You can find the published source code at [github.com/wireapp](https://github.com/wireapp).

For licensing information, see the attached LICENSE file and the list of third-party licenses at [wire.com/legal/licenses/](https://wire.com/legal/licenses/).

## @wireapp/tslint-config

> Wire's [TSLint](https://palantir.github.io/tslint/) config.

### Usage

**Install (macOS, Linux)**:

```bash
yarn add --dev @wireapp/tslint-config \
               tslint-config-prettier \
               tslint-plugin-prettier \
               tslint-react-hooks \
               tslint-react \
               prettier \
               tslint
```

**Install (Windows)**:

```powershell
yarn add --dev @wireapp/tslint-config ^
               tslint-config-prettier ^
               tslint-plugin-prettier ^
               tslint-react-hooks ^
               tslint-react ^
               prettier ^
               tslint
```

**Edit `tslint.json`**:

```jsonc
{
  // ...
  "extends": "@wireapp/tslint-config"
}
```
