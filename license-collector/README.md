# Wire

This repository is part of the source code of Wire. You can find more information at [wire.com](https://wire.com) or by contacting opensource@wire.com.

You can find the published source code at [github.com/wireapp](https://github.com/wireapp).

For licensing information, see the attached LICENSE file and the list of third-party licenses at [wire.com/legal/licenses/](https://wire.com/legal/licenses/).

## LicenseCollector

Wire's internal package license collection tool.

Here is what it does:

1. Fetch all top-level dependencies of one or more given repositories
2. Collect the licenses of these dependencies
3. Save these licenses in a JSON file

### Installation

```
yarn add @wireapp/license-collector
```

### CLI Usage

- Add a `repositories.txt` file ([example]('./repositories.txt))
- Optional: add a `filter.txt` file ([example]('./filter.txt'))

- Run
  ```
  collect-licenses
  ```

### API Usage

See [`cli.ts`](./src/main/cli.ts).
