# Wire

This repository is part of the source code of Wire. You can find more information at [wire.com](https://wire.com) or by contacting opensource@wire.com.

You can find the published source code at [github.com/wireapp](https://github.com/wireapp).

For licensing information, see the attached LICENSE file and the list of third-party licenses at [wire.com/legal/licenses/](https://wire.com/legal/licenses/).

## CBOR

### Installation

```
yarn add @wireapp/cbor
```

### Usage

#### Browser

- [demo.html](./demo.html)

#### TypeScript

```typescript
import * as CBOR from '@wireapp/cbor';

// prettier-ignore
const payload: Uint8Array = new Uint8Array([255, 18, 15, 34, 210, 168, 165, 188, 81, 33, 34, 40, 73, 61, 149, 198, 154, 54, 128, 76, 191, 161, 58, 176, 45, 75, 1, 33, 80, 157, 28, 89]);

// Encoding
const encoder: CBOR.Encoder = new CBOR.Encoder();
const encoded: ArrayBuffer = encoder
  .object(1)
  .u8(0)
  .bytes(payload)
  .get_buffer();

// Decoding
let decoded: Uint8Array;
const decoder: CBOR.Decoder = new CBOR.Decoder(encoded);
const properties: number = decoder.object();
for (let i = 0; i < properties; i++) {
  switch (decoder.u8()) {
    case 0:
      decoded = new Uint8Array(decoder.bytes());
      break;
    default:
      decoder.skip();
  }
}

// Comparison
const isEqual = decoded.every((row, index) => {
  return decoded[index] === payload[index];
});

console.log(isEqual); // true
```
