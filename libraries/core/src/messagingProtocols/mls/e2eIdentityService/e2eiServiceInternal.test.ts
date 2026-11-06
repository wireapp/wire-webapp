/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {
  ConversationId,
  CoreCryptoContext,
  Credential,
  CredentialRef,
  CredentialType,
  KeyPackage,
  KeyPackageRef,
  PkiEnvironment,
  X509CredentialAcquisition,
} from '@wireapp/core-crypto';

import {E2EIServiceInternal} from './e2eiServiceInternal';
import {CoreCrypto, Ciphersuite} from './e2eiService.types';
import {InitialData} from './storage/e2eiStorage.schema';

import {CoreDatabase, openDB} from '../../../storage/coreDb';
import {createMLSClientId} from '../utils/mlsId';

const cipherSuite = Ciphersuite.Mls128Dhkemx25519Aes128gcmSha256Ed25519;
const certificateTtl = 3600;
const keyPackagesAmount = 2;

const initialData: InitialData = {
  discoveryUrl: 'https://acme.example/directory',
  clientId: 'a1b2c3d4e5f60718',
  user: {
    id: '48a1c3b0-4b0e-4bcd-93ad-64c7344b1534',
    displayName: 'Alice',
    handle: 'alice',
    domain: 'elna.wire.link',
    teamId: 'f0e1d2c3-4b5a-6978-8a9b-0c1d2e3f4a5b',
  },
};

type MockAcquisition = {
  finalize: jest.Mock;
  uniffiDestroy: jest.Mock;
};

const createAcquisition = (): MockAcquisition => {
  return {
    finalize: jest.fn(),
    uniffiDestroy: jest.fn(),
  };
};

const noConversations = async (): Promise<{group_id: string}[]> => {
  return [];
};

const createCredentialRef = (earliestValidity: bigint): CredentialRef => {
  return {earliestValidity: jest.fn().mockReturnValue(earliestValidity)} as unknown as CredentialRef;
};

type InternalServiceTestSetup = {
  readonly context: jest.Mocked<CoreCryptoContext>;
  readonly coreCrypto: jest.Mocked<CoreCrypto>;
  readonly db: CoreDatabase;
  readonly pkiEnvironment: PkiEnvironment;
  readonly service: E2EIServiceInternal;
};

async function buildService(dbName: string): Promise<InternalServiceTestSetup> {
  const context = {
    addCredential: jest.fn(),
    conversationExists: jest.fn(),
    generateKeyPackage: jest.fn(),
    getKeyPackages: jest.fn().mockResolvedValue([]),
    removeKeyPackage: jest.fn(),
    setConversationCredential: jest.fn(),
  } as unknown as jest.Mocked<CoreCryptoContext>;

  const pkiEnvironment = {} as PkiEnvironment;

  const coreCrypto = {
    findCredentials: jest.fn().mockResolvedValue([]),
    getPkiEnvironment: jest.fn().mockResolvedValue(pkiEnvironment),
    transaction: jest.fn(async (callback: (cx: CoreCryptoContext) => Promise<unknown>) => {
      return callback(context);
    }),
  } as unknown as jest.Mocked<CoreCrypto>;

  const db = await openDB(dbName);

  return {
    context,
    coreCrypto,
    db,
    pkiEnvironment,
    service: new E2EIServiceInternal(db, coreCrypto, certificateTtl, keyPackagesAmount, initialData),
  };
}

async function storePendingSnapshot(db: CoreDatabase, snapshot: Uint8Array<ArrayBuffer>): Promise<void> {
  await db.put('pendingEnrollmentData', {acquisitionSnapshot: snapshot}, 'data');
}

describe('E2EIServiceInternal', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('generateCertificate', () => {
    it('rejects when the PKI environment has not been initialized', async () => {
      const {coreCrypto, service} = await buildService('internalNoPkiEnvironment');
      coreCrypto.getPkiEnvironment.mockResolvedValue(undefined);

      await expect(service.generateCertificate(false, noConversations, cipherSuite)).rejects.toThrow(
        'The PKI environment is not initialized',
      );
    });

    it('resumes an interrupted acquisition and stores the resulting credential', async () => {
      const {context, db, pkiEnvironment, service} = await buildService('internalResumeAcquisition');
      const snapshot = new Uint8Array([1, 2, 3]);
      await storePendingSnapshot(db, snapshot);

      const acquisition = createAcquisition();
      const credential = {} as Credential;
      const credentialRef = {} as CredentialRef;
      acquisition.finalize.mockResolvedValue(credential);
      const fromBytes = jest
        .spyOn(X509CredentialAcquisition, 'fromBytes')
        .mockReturnValue(acquisition as unknown as X509CredentialAcquisition);
      const newFromCredentialRef = jest.spyOn(X509CredentialAcquisition, 'newFromCredentialRef');

      context.addCredential.mockResolvedValue(credentialRef);
      context.generateKeyPackage.mockImplementation(async () => {
        return {
          serialize: () => {
            return new Uint8Array([7, 8]);
          },
        } as unknown as KeyPackage;
      });

      const result = await service.generateCertificate(false, noConversations, cipherSuite);

      expect(fromBytes).toHaveBeenCalledWith(pkiEnvironment, snapshot);
      expect(newFromCredentialRef).not.toHaveBeenCalled();
      expect(acquisition.finalize).toHaveBeenCalledTimes(1);
      expect(acquisition.uniffiDestroy).toHaveBeenCalledTimes(1);
      expect(context.addCredential).toHaveBeenCalledWith(credential);
      expect(result.keyPackages).toHaveLength(keyPackagesAmount);
      await expect(db.get('pendingEnrollmentData', 'data')).resolves.toBeUndefined();
    });

    it('updates the credential of every existing MLS conversation', async () => {
      const {context, db, service} = await buildService('internalSetConversationCredentials');
      await storePendingSnapshot(db, new Uint8Array([1]));

      const credentialRef = {} as CredentialRef;
      const acquisition = createAcquisition();
      acquisition.finalize.mockResolvedValue({} as Credential);
      jest
        .spyOn(X509CredentialAcquisition, 'fromBytes')
        .mockReturnValue(acquisition as unknown as X509CredentialAcquisition);

      context.addCredential.mockResolvedValue(credentialRef);
      // The second conversation does not exist anymore, the last two group ids are unusable.
      context.conversationExists.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
      context.generateKeyPackage.mockResolvedValue({
        serialize: () => {
          return new Uint8Array();
        },
      } as unknown as KeyPackage);

      const conversations = [
        {group_id: Buffer.from('existing-conversation').toString('base64')},
        {group_id: Buffer.from('missing-conversation').toString('base64')},
        {group_id: ''},
        {group_id: 'not base64!!'},
      ];

      await service.generateCertificate(
        false,
        async () => {
          return conversations;
        },
        cipherSuite,
      );

      expect(context.setConversationCredential).toHaveBeenCalledTimes(1);
      const [[conversationId, reference]] = context.setConversationCredential.mock.calls;
      expect(new TextDecoder().decode((conversationId as ConversationId).copyBytes())).toBe('existing-conversation');
      expect(reference).toBe(credentialRef);
    });

    it('removes invalid key packages of the same cipher suite and regenerates them', async () => {
      const {context, db, service} = await buildService('internalKeyPackages');
      await storePendingSnapshot(db, new Uint8Array([1]));

      const credentialRef = {} as CredentialRef;
      const acquisition = createAcquisition();
      acquisition.finalize.mockResolvedValue({} as Credential);
      jest
        .spyOn(X509CredentialAcquisition, 'fromBytes')
        .mockReturnValue(acquisition as unknown as X509CredentialAcquisition);

      const invalidSameCipherSuite = {
        cipherSuite: () => {
          return cipherSuite;
        },
        isValid: () => {
          return false;
        },
      } as unknown as KeyPackageRef;
      const validSameCipherSuite = {
        cipherSuite: () => {
          return cipherSuite;
        },
        isValid: () => {
          return true;
        },
      } as unknown as KeyPackageRef;
      const invalidOtherCipherSuite = {
        cipherSuite: () => {
          return Ciphersuite.Mls128Dhkemp256Aes128gcmSha256P256;
        },
        isValid: () => {
          return false;
        },
      } as unknown as KeyPackageRef;
      context.getKeyPackages.mockResolvedValue([invalidSameCipherSuite, validSameCipherSuite, invalidOtherCipherSuite]);
      context.addCredential.mockResolvedValue(credentialRef);
      context.generateKeyPackage.mockResolvedValue({
        serialize: () => {
          return new Uint8Array([9]);
        },
      } as unknown as KeyPackage);

      const result = await service.generateCertificate(false, noConversations, cipherSuite);

      expect(context.removeKeyPackage).toHaveBeenCalledTimes(1);
      expect(context.removeKeyPackage).toHaveBeenCalledWith(invalidSameCipherSuite);
      expect(context.generateKeyPackage).toHaveBeenCalledTimes(keyPackagesAmount);
      expect(context.generateKeyPackage).toHaveBeenCalledWith(credentialRef);
      expect(result.keyPackages).toHaveLength(keyPackagesAmount);
    });

    it('rotates the latest X509 credential when refreshing', async () => {
      const {context, coreCrypto, pkiEnvironment, service} = await buildService('internalRotateCredential');
      const olderCredential = createCredentialRef(100n);
      const latestCredential = createCredentialRef(300n);
      coreCrypto.findCredentials.mockResolvedValue([olderCredential, latestCredential]);

      const acquisition = createAcquisition();
      acquisition.finalize.mockResolvedValue({} as Credential);
      const fromBytes = jest.spyOn(X509CredentialAcquisition, 'fromBytes');
      const newFromCredentialRef = jest
        .spyOn(X509CredentialAcquisition, 'newFromCredentialRef')
        .mockResolvedValue(
          acquisition as unknown as Awaited<ReturnType<typeof X509CredentialAcquisition.newFromCredentialRef>>,
        );
      const credentialRef = {} as CredentialRef;
      context.addCredential.mockResolvedValue(credentialRef);
      context.generateKeyPackage.mockResolvedValue({
        serialize: () => {
          return new Uint8Array();
        },
      } as unknown as KeyPackage);

      await service.generateCertificate(true, noConversations, cipherSuite);

      expect(fromBytes).not.toHaveBeenCalled();
      expect(coreCrypto.findCredentials).toHaveBeenCalledWith({cipherSuite, credentialType: CredentialType.X509});
      expect(newFromCredentialRef).toHaveBeenCalledWith(
        pkiEnvironment,
        {
          acmeDirectoryUrl: initialData.discoveryUrl,
          cipherSuite,
          displayName: initialData.user.displayName,
          clientId: createMLSClientId({id: initialData.user.id, domain: initialData.user.domain}, initialData.clientId),
          handle: initialData.user.handle,
          domain: initialData.user.domain,
          team: initialData.user.teamId,
          validityPeriodSecs: BigInt(certificateTtl),
        },
        latestCredential,
        undefined,
      );
    });

    it('does not use the credential rotation flow without a stored X509 credential', async () => {
      const {coreCrypto, service} = await buildService('internalNoStoredCredential');

      await expect(service.generateCertificate(true, noConversations, cipherSuite)).rejects.toThrow(
        `No X509 credential found for cipher suite ${cipherSuite}`,
      );
      expect(coreCrypto.findCredentials).toHaveBeenCalledTimes(1);
    });

    it('surfaces errors from listing the stored credentials', async () => {
      const {coreCrypto, service} = await buildService('internalFindCredentialsError');
      coreCrypto.findCredentials.mockRejectedValue(new Error('database is locked'));

      await expect(service.generateCertificate(true, noConversations, cipherSuite)).rejects.toThrow(
        'database is locked',
      );
    });
  });
});
