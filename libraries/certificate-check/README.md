# Wire

This repository is part of the source code of Wire. You can find more information at [wire.com](https://wire.com) or by contacting opensource@wire.com.

You can find the published source code at [github.com/wireapp](https://github.com/wireapp).

For licensing information, see the attached LICENSE file and the list of third-party licenses at [wire.com/legal/licenses/](https://wire.com/legal/licenses/).

## Certificate Check

Utilities to check that Wire's domains use the expected certificate.

### Usage

#### Check if hostname should be pinned

The certificate check utility holds a list of pre-defined hostnames which should be pinned. See [`pinningData.ts`](./src/pinningData.ts).

**Example:**

```ts
const wireHost = 'wire.com';
hostnameShouldBePinned(wireHost); // true

const otherHost = 'example.com';
hostnameShouldBePinned(otherHost); // false
```

#### Verify pinned certificate

The certificate check utility holds a list of pre-defined certificates which should be verified. See [`CertUtil.ts`](./src/CertUtil.ts).

Since we only use this utility with Electron, you need to provide an [Electron-like certificate](https://github.com/electron/electron/blob/ced2e8779fb4e4a50f7fb39b4845e4ae7a396234/docs/api/structures/certificate.md).

**Example:**

```ts
const hostname = 'wire.com';
const certificate = {
  data: '-----BEGIN CERTIFICATE----- ...',
  issuerCert: {
    data: '-----BEGIN CERTIFICATE----- ...',
  },
};

verifyPinning(hostname, certificate); // true
```

**Verification sequence:**

1. Find a match for the hostname and if found, get the local certificate
1. Extract the remote issuer (e.g. VeriSign) data from the provided certificate
1. Extract the local issuer data for this hostname
1. Compare the remote issuer data with the local issuer data byte by byte
1. Extract the remote public key from the provided certificate
1. Create a SHA256 hash from the remote public key (also called "fingerprint")
1. Extract the algorithm ID and the fingerprints from the local certificate
1. Compare the remote fingerprint with the local fingerprints for this hostname
1. Compare the remote algorithm ID with the local algorithm ID for this hostname

If all steps succeeded, the verification is done.
