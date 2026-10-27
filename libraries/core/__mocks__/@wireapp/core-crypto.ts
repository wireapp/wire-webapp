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

export interface CommitBundle {}

export enum Ciphersuite {
  MLS_128_DHKEMX25519_AES128GCM_SHA256_Ed25519 = 1,
  MLS_128_DHKEMP256_AES128GCM_SHA256_P256 = 2,
  MLS_128_DHKEMX25519_CHACHA20POLY1305_SHA256_Ed25519 = 3,
  MLS_256_DHKEMX448_AES256GCM_SHA512_Ed448 = 4,
  MLS_256_DHKEMP521_AES256GCM_SHA512_P521 = 5,
  MLS_256_DHKEMX448_CHACHA20POLY1305_SHA512_Ed448 = 6,
  MLS_256_DHKEMP384_AES256GCM_SHA384_P384 = 7,
  MLS_128_X25519KYBER768DRAFT00_AES128GCM_SHA256_Ed25519 = 61489,
}

export enum CipherSuite {
  Mls128Dhkemx25519Aes128gcmSha256Ed25519 = 1,
  Mls128Dhkemp256Aes128gcmSha256P256 = 2,
  Mls128Dhkemx25519Chacha20poly1305Sha256Ed25519 = 3,
  Mls256Dhkemx448Aes256gcmSha512Ed448 = 4,
  Mls256Dhkemp521Aes256gcmSha512P521 = 5,
  Mls256Dhkemx448Chacha20poly1305Sha512Ed448 = 6,
  Mls256Dhkemp384Aes256gcmSha384P384 = 7,
  Mls128X25519kyber768draft00Aes128gcmSha256Ed25519 = 61489,
}

export enum CredentialType {
  Basic = 1,
  X509 = 2,
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

export class CoreCrypto {
  proteusInit = jest.fn();
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
  constructor(value: string) {
    super(new TextEncoder().encode(value));
  }
  toString(): string {
    return new TextDecoder().decode(this.bytes);
  }
}
export class DeviceId extends ByteContainer {
  private constructor(value: string) {
    super(new TextEncoder().encode(value));
  }
  static fromHexString(value: string): DeviceId {
    return new DeviceId(value);
  }
  toHexString(): string {
    return new TextDecoder().decode(this.bytes);
  }
  toU64(): bigint {
    return BigInt(`0x${this.toHexString()}`);
  }
}
export class ClientId extends ByteContainer {
  constructor(userId: Uuid, deviceId: DeviceId, domain: string) {
    super(new TextEncoder().encode(`${userId.toString()}:${deviceId.toU64().toString(16)}@${domain}`));
  }
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
