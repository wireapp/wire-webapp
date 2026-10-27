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
export class ClientId extends ByteContainer {}
export class ConversationId extends ByteContainer {}
export class ExternalSenderKey extends ByteContainer {}
export class KeyPackage extends ByteContainer {}
export class SecretKey extends ByteContainer {}

export enum ErrorType {
  Mls = 'Mls',
  Proteus = 'Proteus',
  E2ei = 'E2ei',
  TransactionFailed = 'TransactionFailed',
  Other = 'Other',
}

export enum ProteusErrorType {
  SessionNotFound = 'SessionNotFound',
  DuplicateMessage = 'DuplicateMessage',
  RemoteIdentityChanged = 'RemoteIdentityChanged',
  Other = 'Other',
}

export enum MlsErrorType {
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

export const MlsError = {
  MessageRejected: {
    new: (inner: {reason: string}) => taggedError('MessageRejected', inner),
    instanceOf: (error: unknown) => isTaggedError(error, 'MessageRejected'),
  },
  Other: {
    new: (inner: {msg: string}) => taggedError('Other', inner),
    instanceOf: (error: unknown) => isTaggedError(error, 'Other'),
  },
};

export const CoreCryptoError = {
  Mls: {
    new: (inner: {mlsError: ReturnType<(typeof MlsError)[keyof typeof MlsError]['new']>}) => taggedError('Mls', inner),
    instanceOf: (error: unknown) => isTaggedError(error, 'Mls'),
  },
};

export const MlsTransportError = {
  MessageRejected: {
    new: (inner: {reason: string}) => taggedError('MessageRejected', inner),
    instanceOf: (error: unknown) => isTaggedError(error, 'MessageRejected'),
  },
};

type CoreCryptoError<T extends ErrorType> = Error & {
  type: T;
  context?: {type: string; context: {conversationId?: Uint8Array}};
};

export const isCoreCryptoError = <E extends ErrorType>(error: unknown, errorType: E): error is CoreCryptoError<E> => {
  return typeof error === 'object' && error !== null && (error as any).type === errorType;
};

export const isProteusError = <E extends ProteusErrorType>(
  error: unknown,
  errorType: E,
): error is CoreCryptoError<ErrorType.Proteus> & {context: {type: E}} => {
  return isCoreCryptoError(error, ErrorType.Proteus) && (error as any).context?.type === errorType;
};

export const isProteusSessionNotFoundError = (error: unknown): boolean => {
  return isProteusError(error, ProteusErrorType.SessionNotFound);
};
export const isProteusDuplicateMessageError = (error: unknown): boolean => {
  return isProteusError(error, ProteusErrorType.DuplicateMessage);
};
export const isProteusRemoteIdentityChangedError = (error: unknown): boolean => {
  return isProteusError(error, ProteusErrorType.RemoteIdentityChanged);
};

export const isMlsOrphanWelcomeError = (error: unknown): boolean => {
  return isCoreCryptoError(error, ErrorType.Mls) && (error as any).context?.type === MlsErrorType.OrphanWelcome;
};

// Added to support tests that rely on the core-crypto guard for ConversationAlreadyExists classification
export const isMlsConversationAlreadyExistsError = (error: unknown): boolean => {
  return (
    isCoreCryptoError(error, ErrorType.Mls) &&
    error.context?.type === MlsErrorType.ConversationAlreadyExists &&
    Array.isArray(error.context?.context?.conversationId)
  );
};

export const isMlsMessageRejectedError = (error: unknown): boolean => {
  return isCoreCryptoError(error, ErrorType.Mls) && error.context?.type === MlsErrorType.MessageRejected;
};
