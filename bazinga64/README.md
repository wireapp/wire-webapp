# Wire

This repository is part of the source code of Wire. You can find more information at [wire.com](https://wire.com) or by contacting opensource@wire.com.

You can find the published source code at [github.com/wireapp](https://github.com/wireapp).

For licensing information, see the attached LICENSE file and the list of third-party licenses at [wire.com/legal/licenses/](https://wire.com/legal/licenses/).

## Installation

```
yarn add bazinga64
```

```javascript
const bazinga64 = require('bazinga64');
```

### Development

```
yarn
yarn dist
```

### Usage

```javascript
// Encoding
const encoded = bazinga64.Encoder.toBase64('Hello');
const base64 = encoded.asString;
console.log(base64); // "SGVsbG8="

// Decoding
const decoded = bazinga64.Decoder.fromBase64('SGVsbG8=');
const text = decoded.asString;
console.log(text); // "Hello"
```

### TypeScript Usage

```typescript
import {Decoder} from 'bazinga64';
const typedArray: Uint8Array = Decoder.fromBase64('SGVsbG8=').asBytes;
```

## API

### `Decoder`

- `fromBase64`

### `Encoder`

- `toBase64`
