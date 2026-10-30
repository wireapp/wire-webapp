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

import {Decoder} from 'bazinga64';
import {Maybe, Task, result, task} from 'true-myth';

import {LogFactory} from '@wireapp/commons';
import {
  ConversationId,
  CredentialRef,
  X509CredentialAcquisition,
  type Credential,
  type PkiEnvironment,
  type X509CredentialAcquisitionConfiguration,
} from '@wireapp/core-crypto';

import {Ciphersuite, CoreCrypto, CredentialType} from './e2eiService.types';
import {createE2EIEnrollmentStorage} from './storage/e2eiStorage';
import {InitialData} from './storage/e2eiStorage.schema';

import {CoreDatabase} from '../../../storage/coreDb';
import {createMLSClientId} from '../utils/mlsId';

type CertificateGenerationResult = {keyPackages: Uint8Array[]};

export type getAllConversationsCallback = () => Promise<
  {
    group_id: string;
  }[]
>;

export class E2EIServiceInternal {
  private readonly logger = LogFactory.getLogger('@wireapp/core/E2EIdentityServiceInternal');
  private readonly enrollmentStorage: ReturnType<typeof createE2EIEnrollmentStorage>;

  public constructor(
    coreDb: CoreDatabase,
    private readonly coreCryptoClient: CoreCrypto,
    /** number of seconds the certificate should be valid */
    private readonly certificateTtl: number,
    private readonly keyPackagesAmount: number,
    private readonly initialData: InitialData,
  ) {
    this.enrollmentStorage = createE2EIEnrollmentStorage(coreDb);
  }

  /**
   * Will get a certificate for the user
   * @param refresh should the process refresh the current certificate or get a new one
   * @param getAllConversations function called to get all conversations
   * @param cipherSuite cipher suite of the credential to acquire
   */
  public async generateCertificate(
    refresh: boolean,
    getAllConversations: getAllConversationsCallback,
    cipherSuite: Ciphersuite,
  ): Promise<CertificateGenerationResult> {
    const pkiEnvironment = await this.getPkiEnvironment();
    const acquisition = await this.createAcquisition(pkiEnvironment, refresh, cipherSuite);

    const credential = await acquisition.finalize();

    // From here on CoreCrypto owns the credential. The acquisition itself is not needed anymore.
    acquisition.uniffiDestroy();

    const credentialRef = await this.storeCredential(credential);
    await this.setConversationCredentials(credentialRef, getAllConversations);
    const keyPackages = await this.generateKeyPackages(credentialRef, cipherSuite);

    await this.enrollmentStorage.deletePendingAcquisitionSnapshot();

    return {keyPackages};
  }

  // ############ Internal Functions ############

  private async getPkiEnvironment(): Promise<PkiEnvironment> {
    const pkiEnvironment = await this.coreCryptoClient.getPkiEnvironment();
    if (pkiEnvironment === undefined) {
      throw new Error('The PKI environment is not initialized, E2EIdentity has to be initialized first');
    }
    return pkiEnvironment;
  }

  /**
   * Resumes an acquisition that was interrupted by an identity provider redirect, creates a new
   * activation acquisition, or creates a rotation acquisition based on the latest credential.
   */
  private async createAcquisition(
    pkiEnvironment: PkiEnvironment,
    refresh: boolean,
    cipherSuite: Ciphersuite,
  ): Promise<X509CredentialAcquisition> {
    // The hook that persists the snapshot has already run: we are coming back from the identity provider.
    const pendingSnapshot = await this.enrollmentStorage.getPendingAcquisitionSnapshot();
    if (pendingSnapshot.isJust) {
      return X509CredentialAcquisition.fromBytes(pkiEnvironment, pendingSnapshot.value);
    }

    const config = this.createAcquisitionConfiguration(cipherSuite);

    if (!refresh) {
      return new X509CredentialAcquisition(pkiEnvironment, config);
    }

    const credentialRef = await this.getLatestX509CredentialRef(cipherSuite).match({
      Resolved: value => {
        return Promise.resolve(value);
      },
      Rejected: error => {
        return Promise.reject(error);
      },
    });

    return X509CredentialAcquisition.newFromCredentialRef(pkiEnvironment, config, credentialRef, undefined);
  }

  private createAcquisitionConfiguration(cipherSuite: Ciphersuite): X509CredentialAcquisitionConfiguration {
    const {user, clientId, discoveryUrl} = this.initialData;

    return {
      acmeDirectoryUrl: discoveryUrl,
      cipherSuite,
      displayName: user.displayName,
      clientId: createMLSClientId({id: user.id, domain: user.domain}, clientId),
      handle: user.handle,
      domain: user.domain,
      ...(user.teamId.length > 0 ? {team: user.teamId} : {}),
      validityPeriodSecs: BigInt(this.certificateTtl),
    };
  }

  private getLatestX509CredentialRef(cipherSuite: Ciphersuite): Task<CredentialRef, unknown> {
    return task
      .tryOrElse(
        error => {
          return error;
        },
        () => {
          return this.coreCryptoClient.findCredentials({cipherSuite, credentialType: CredentialType.X509});
        },
      )
      .andThen(credentials => {
        const latestCredential = credentials.reduce<Maybe<CredentialRef>>((latest, credential) => {
          return latest.match({
            Just: current => {
              return credential.earliestValidity() > current.earliestValidity() ? Maybe.just(credential) : latest;
            },
            Nothing: () => {
              return Maybe.just(credential);
            },
          });
        }, Maybe.nothing());

        return latestCredential.match({
          Just: credential => {
            return task.resolve(credential);
          },
          Nothing: () => {
            return task.reject(new Error(`No X509 credential found for cipher suite ${cipherSuite}`));
          },
        });
      });
  }

  private storeCredential(credential: Credential): Promise<CredentialRef> {
    return this.coreCryptoClient.transaction(cx => {
      return cx.addCredential(credential);
    });
  }

  /**
   * Changes the credential of every MLS conversation the client takes part in, so that the next
   * outgoing commit is signed with the newly acquired certificate.
   */
  private async setConversationCredentials(
    credentialRef: CredentialRef,
    getAllConversations: getAllConversationsCallback,
  ): Promise<void> {
    const conversations = await getAllConversations();

    await this.coreCryptoClient.transaction(async cx => {
      for (const conversation of conversations) {
        if (conversation.group_id.length === 0) {
          this.logger.error('No group id found in conversation');
          continue;
        }

        const conversationId = result.tryOrElse(
          cause => {
            return new Error('Failed to decode the conversation group id', {cause});
          },
          () => {
            return new ConversationId(Decoder.fromBase64(conversation.group_id).asBytes);
          },
        );

        if (result.isErr(conversationId)) {
          this.logger.warn('Invalid group id found in conversation', {
            groupId: conversation.group_id,
            error: conversationId.error,
          });
          continue;
        }

        const conversationExists = await cx.conversationExists(conversationId.value);
        if (!conversationExists) {
          continue;
        }

        await cx.setConversationCredential(conversationId.value, credentialRef);
      }
    });
  }

  private async generateKeyPackages(credentialRef: CredentialRef, cipherSuite: Ciphersuite): Promise<Uint8Array[]> {
    return this.coreCryptoClient.transaction(async cx => {
      const storedKeyPackages = await cx.getKeyPackages();
      for (const keyPackage of storedKeyPackages) {
        if (keyPackage.cipherSuite() === cipherSuite && !keyPackage.isValid()) {
          await cx.removeKeyPackage(keyPackage);
        }
      }

      const generatedKeyPackages: Uint8Array[] = [];
      for (let index = 0; index < this.keyPackagesAmount; index++) {
        const keyPackage = await cx.generateKeyPackage(credentialRef);
        generatedKeyPackages.push(keyPackage.serialize());
      }
      return generatedKeyPackages;
    });
  }
}
