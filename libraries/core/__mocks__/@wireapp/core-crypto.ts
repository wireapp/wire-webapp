/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

import {asyncNoop, noop} from 'noop-esm';

export interface CommitBundle {}

export enum CipherSuite {
  Mls128Dhkemx25519Aes128gcmSha256Ed25519 = 1,
  Mls128Dhkemp256Aes128gcmSha256P256 = 2,
  Mls128Dhkemx25519Chacha20poly1305Sha256Ed25519 = 3,
  Mls256Dhkemx448Aes256gcmSha512Ed448 = 4,
  Mls256Dhkemp521Aes256gcmSha512P521 = 5,
  Mls256Dhkemx448Chacha20poly1305Sha512Ed448 = 6,
  Mls256Dhkemp384Aes256gcmSha384P384 = 7,
  Mls128Mlkem768x25519Aes128gcmSha256Ed25519 = 61441,
  Mls128Mlkem768x25519Aes256gcmSha384Ed25519 = 61442,
  Mls128Mlkem768p256Aes128gcmSha256P256 = 61443,
  Mls128Mlkem768p256Aes256gcmSha384P256 = 61444,
  Mls192Mlkem1024p384Aes256gcmSha384P384 = 61445,
  Mls128Mlkem768Aes256gcmSha384Ed25519 = 61446,
  Mls128Mlkem768Aes256gcmSha384P256 = 61447,
  Mls192Mlkem1024Aes256gcmSha384P384 = 61448,
  Mls128Mlkem768x25519Chacha20poly1305Sha384Mldsa44 = 61449,
  Mls192Mlkem768Aes256gcmSha384Mldsa65 = 61450,
  Mls256Mlkem1024Aes256gcmSha384Mldsa87 = 61451,
}

export enum CredentialType {
  Basic = 1,
  X509 = 2,
}

export enum SignatureScheme {
  EcdsaSecp256r1Sha256 = 1027,
  EcdsaSecp384r1Sha384 = 1283,
  EcdsaSecp521r1Sha512 = 1539,
  Ed25519 = 2055,
  Ed448 = 2056,
}

export enum GroupInfoEncryptionType {
  Plaintext = 1,
  JweEncrypted = 2,
}

export enum RatchetTreeType {
  Full = 1,
  Delta = 2,
  ByRef = 3,
}

export enum DeviceStatus {
  Valid = 1,
  Expired = 2,
  Revoked = 3,
}

export enum HttpMethod {
  Get = 0,
  Post = 1,
  Put = 2,
  Delete = 3,
  Patch = 4,
  Head = 5,
}

export class CoreCrypto {
  proteusInit = jest.fn();
  getPkiEnvironment = async (): Promise<PkiEnvironment | undefined> => {
    return undefined;
  };
  setPkiEnvironment = asyncNoop;
  findCredentials = async (): Promise<CredentialRef[]> => {
    return [];
  };
  proteusNewPrekey = jest.fn(() => {
    return Uint8Array.from([]);
  });
  getRemoteFingerprint = jest.fn();
  getLocalFingerprint = jest.fn();
  proteusSessionExists = jest.fn();
  proteusSessionFromPrekey = jest.fn();
  proteusFingerprintRemote = jest.fn();
  proteusEncryptBatched = jest.fn();
  proteusSessionSave = jest.fn();
  proteusDecrypt = jest.fn().mockResolvedValue(Uint8Array.from([]));
  proteusSessionFromMessage = jest.fn().mockResolvedValue(Uint8Array.from([]));

  static deferredInit(): CoreCrypto {
    return new CoreCrypto();
  }

  static version(): string {
    return '1.0.0';
  }
}

export function version(): string {
  return '1.0.0';
}

class ByteContainer {
  protected readonly bytes: Uint8Array;
  constructor(bytes: Uint8Array) {
    this.bytes = bytes;
  }
  copyBytes(): Uint8Array {
    return Uint8Array.from(this.bytes);
  }
}

export class Welcome extends ByteContainer {}
export class GroupInfo extends ByteContainer {}
export class Uuid extends ByteContainer {
  constructor(value: string | Uuid) {
    super(typeof value === 'string' ? new TextEncoder().encode(value) : value.copyBytes());
  }
  toString(): string {
    return new TextDecoder().decode(this.bytes);
  }
}
export class DeviceId extends ByteContainer {
  constructor(value: string | DeviceId) {
    super(typeof value === 'string' ? new TextEncoder().encode(value) : value.copyBytes());
  }
  static fromHexString(value: string): DeviceId {
    return new DeviceId(value);
  }
  toHexString(): string {
    return new TextDecoder().decode(this.bytes);
  }
  toU64(): bigint {
    const value = this.toHexString();
    if (/^[0-9a-fA-F]+$/.test(value)) {
      return BigInt(`0x${value}`);
    }
    // Device ids are not necessarily hex encoded (e.g. a UUID in tests), so fall back to the
    // bytes of the value itself instead of failing.
    const bytes = new TextEncoder().encode(value);
    return BigInt(
      `0x${Array.from(bytes, byte => {
        return byte.toString(16).padStart(2, '0');
      }).join('')}`,
    );
  }
}
export class ClientId extends ByteContainer {
  /**
   * Either a Wire formatted client id (`<user-id>:<device-id>@<domain>`), or the parts of it.
   */
  constructor(userId: Uuid | string, deviceId?: DeviceId, domain?: string) {
    const value =
      deviceId === undefined || domain === undefined
        ? String(userId)
        : `${new Uuid(userId).toString()}:${deviceId.toU64().toString(16)}@${domain}`;
    super(new TextEncoder().encode(value));
  }
  toString(): string {
    return new TextDecoder().decode(this.bytes);
  }
}
export class CredentialRef extends ByteContainer {}
export class Credential extends ByteContainer {
  static basic(): Credential {
    return new Credential(new Uint8Array());
  }
}
export class ExternalSender extends ByteContainer {
  static parse(key: Uint8Array): ExternalSender {
    return new ExternalSender(key);
  }
  static parseJwk(jwk: Uint8Array): ExternalSender {
    return new ExternalSender(jwk);
  }
  static parsePublicKey(key: Uint8Array): ExternalSender {
    return new ExternalSender(key);
  }
}

export class PkiEnvironment {
  addTrustAnchor = asyncNoop;
  addIntermediateCert = asyncNoop;
  getTrustAnchors = async (): Promise<string[]> => {
    return [];
  };
  removeTrustAnchor = asyncNoop;
  uniffiDestroy = noop;
  static create = async (): Promise<PkiEnvironment> => {
    return new PkiEnvironment();
  };
}

export class X509CredentialAcquisition {
  finalize = asyncNoop;
  uniffiDestroy = noop;
  static fromBytes = (): X509CredentialAcquisition => {
    return new X509CredentialAcquisition();
  };
  static newFromCredentialRef = async (): Promise<X509CredentialAcquisition> => {
    return new X509CredentialAcquisition();
  };
}
export class ConversationId extends ByteContainer {}
export class ExternalSenderKey extends ByteContainer {}
export class KeyPackage extends ByteContainer {}
export class SecretKey extends ByteContainer {}

type TaggedVariant<Tag extends string, Inner> = {
  tag: Tag;
  inner: Inner;
};

const variant = <Tag extends string, Inner>(tag: Tag, inner: Inner): TaggedVariant<Tag, Inner> => {
  return {tag, inner};
};

const isVariant = <Tag extends string>(value: unknown, tag: Tag): value is TaggedVariant<Tag, unknown> => {
  return typeof value === 'object' && value !== null && 'tag' in value && value.tag === tag;
};

const decryptedMessageVariant = <Tag extends string>(tag: Tag) => {
  return {
    new: <Inner>(inner: Inner) => variant(tag, inner),
    instanceOf: (value: unknown) => isVariant(value, tag),
  };
};

export const DecryptedMessage = {
  ApplicationMessage: decryptedMessageVariant('ApplicationMessage'),
  Commit: decryptedMessageVariant('Commit'),
  Proposal: decryptedMessageVariant('Proposal'),
  Transient: decryptedMessageVariant('Transient'),
  TransientTargeted: decryptedMessageVariant('TransientTargeted'),
  PersistedTargeted: decryptedMessageVariant('PersistedTargeted'),
};

export const BufferedDecryptedMessage = {
  ApplicationMessage: decryptedMessageVariant('ApplicationMessage'),
  Commit: decryptedMessageVariant('Commit'),
  Proposal: decryptedMessageVariant('Proposal'),
  Transient: decryptedMessageVariant('Transient'),
  TransientTargeted: decryptedMessageVariant('TransientTargeted'),
  PersistedTargeted: decryptedMessageVariant('PersistedTargeted'),
};

type TaggedError<Tag extends string, Inner> = Error & {
  tag: Tag;
  inner: Inner;
};

const taggedError = <Tag extends string, Inner>(tag: Tag, inner: Inner): TaggedError<Tag, Inner> => {
  return Object.assign(new Error(tag), {tag, inner});
};

const isTaggedError = <Tag extends string>(error: unknown, tag: Tag): error is TaggedError<Tag, unknown> => {
  return error instanceof Error && 'tag' in error && error.tag === tag;
};

export enum MlsError_Tags {
  ConversationAlreadyExists = 'ConversationAlreadyExists',
  DuplicateMessage = 'DuplicateMessage',
  BufferedFutureMessage = 'BufferedFutureMessage',
  WrongEpoch = 'WrongEpoch',
  BufferedCommit = 'BufferedCommit',
  MessageEpochTooOld = 'MessageEpochTooOld',
  SelfCommitIgnored = 'SelfCommitIgnored',
  UnmergedPendingGroup = 'UnmergedPendingGroup',
  StaleProposal = 'StaleProposal',
  StaleCommit = 'StaleCommit',
  OrphanWelcome = 'OrphanWelcome',
  MessageRejected = 'MessageRejected',
  Other = 'Other',
}

export const MlsError = {
  ConversationAlreadyExists: {
    new: (inner: {conversationId: Uint8Array}) => taggedError('ConversationAlreadyExists', inner),
    instanceOf: (error: unknown) => isTaggedError(error, 'ConversationAlreadyExists'),
  },
  DuplicateMessage: {
    new: () => taggedError('DuplicateMessage', undefined),
    instanceOf: (error: unknown) => isTaggedError(error, 'DuplicateMessage'),
  },
  BufferedFutureMessage: {
    new: () => taggedError('BufferedFutureMessage', undefined),
    instanceOf: (error: unknown) => isTaggedError(error, 'BufferedFutureMessage'),
  },
  WrongEpoch: {
    new: () => taggedError('WrongEpoch', undefined),
    instanceOf: (error: unknown) => isTaggedError(error, 'WrongEpoch'),
  },
  UnmergedPendingGroup: {
    new: () => taggedError('UnmergedPendingGroup', undefined),
    instanceOf: (error: unknown) => isTaggedError(error, 'UnmergedPendingGroup'),
  },
  StaleProposal: {
    new: () => taggedError('StaleProposal', undefined),
    instanceOf: (error: unknown) => isTaggedError(error, 'StaleProposal'),
  },
  StaleCommit: {
    new: () => taggedError('StaleCommit', undefined),
    instanceOf: (error: unknown) => isTaggedError(error, 'StaleCommit'),
  },
  OrphanWelcome: {
    new: () => taggedError('OrphanWelcome', undefined),
    instanceOf: (error: unknown) => isTaggedError(error, 'OrphanWelcome'),
  },
  MessageRejected: {
    new: (inner: {reason: string}) => taggedError('MessageRejected', inner),
    instanceOf: (error: unknown) => isTaggedError(error, 'MessageRejected'),
  },
  Other: {
    new: (inner: {msg: string}) => taggedError('Other', inner),
    instanceOf: (error: unknown) => isTaggedError(error, 'Other'),
  },
};

export const ProteusError = {
  SessionNotFound: {
    new: () => taggedError('SessionNotFound', undefined),
    instanceOf: (error: unknown) => isTaggedError(error, 'SessionNotFound'),
  },
  DuplicateMessage: {
    new: () => taggedError('DuplicateMessage', undefined),
    instanceOf: (error: unknown) => isTaggedError(error, 'DuplicateMessage'),
  },
  RemoteIdentityChanged: {
    new: () => taggedError('RemoteIdentityChanged', undefined),
    instanceOf: (error: unknown) => isTaggedError(error, 'RemoteIdentityChanged'),
  },
  Other: {
    new: (inner: {errorCode: number}) => taggedError('Other', inner),
    instanceOf: (error: unknown) => isTaggedError(error, 'Other'),
  },
};

export const CoreCryptoError = {
  Mls: {
    new: (inner: {mlsError: Error}) => taggedError('Mls', inner),
    instanceOf: (error: unknown) => isTaggedError(error, 'Mls'),
  },
  Proteus: {
    new: (inner: {exception: Error}) => taggedError('Proteus', inner),
    instanceOf: (error: unknown) => isTaggedError(error, 'Proteus'),
  },
};

export const MlsTransportError = {
  MessageRejected: {
    new: (inner: {reason: string}) => taggedError('MessageRejected', inner),
    instanceOf: (error: unknown) => isTaggedError(error, 'MessageRejected'),
  },
};
