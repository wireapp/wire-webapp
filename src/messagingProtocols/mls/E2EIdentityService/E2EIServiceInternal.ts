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

import {Decoder, Encoder} from 'bazinga64';
import logdown from 'logdown';

import {APIClient} from '@wireapp/api-client';

import {AcmeService} from './Connection/AcmeServer';
import {
  AcmeChallenge,
  AcmeDirectory,
  Ciphersuite,
  CoreCrypto,
  E2eiEnrollment,
  InitParams,
  RotateBundle,
} from './E2EIService.types';
import {E2EIServiceExternal} from './E2EIServiceExternal';
import {getE2EIClientId, isResponseStatusValid} from './Helper';
import {createNewAccount} from './Steps/Account';
import {getAuthorization} from './Steps/Authorization';
import {getCertificate} from './Steps/Certificate';
import {doWireDpopChallenge} from './Steps/DpopChallenge';
import {doWireOidcChallenge} from './Steps/OidcChallenge';
import {createNewOrder, finalizeOrder} from './Steps/Order';
import {E2EIStorage} from './Storage/E2EIStorage';

class E2EIServiceInternal {
  private static instance: E2EIServiceInternal;
  private readonly logger = logdown('@wireapp/core/E2EIdentityServiceInternal');
  private readonly coreCryptoClient: CoreCrypto;
  private readonly apiClient: APIClient;
  private readonly e2eServiceExternal: E2EIServiceExternal;
  private readonly keyPackagesAmount;
  private identity?: E2eiEnrollment;
  private acmeService?: AcmeService;
  private isInitialized = false;

  private constructor(
    coreCryptClient: CoreCrypto,
    apiClient: APIClient,
    e2eiServiceExternal: E2EIServiceExternal,
    keyPackagesAmount: number = 100,
  ) {
    this.coreCryptoClient = coreCryptClient;
    this.apiClient = apiClient;
    this.e2eServiceExternal = e2eiServiceExternal;
    this.keyPackagesAmount = keyPackagesAmount;
    this.logger.log('Instance of E2EIServiceInternal created');
  }

  // ############ Public Functions ############

  public static async getInstance(params?: InitParams): Promise<E2EIServiceInternal> {
    if (!E2EIServiceInternal.instance) {
      if (!params) {
        throw new Error('E2EIServiceInternal is not initialized. Please call getInstance with params.');
      }
      const {skipInit = false, coreCryptClient, apiClient, e2eiServiceExternal, keyPackagesAmount} = params;
      E2EIServiceInternal.instance = new E2EIServiceInternal(
        coreCryptClient,
        apiClient,
        e2eiServiceExternal,
        keyPackagesAmount,
      );
      if (!skipInit) {
        const {discoveryUrl, user, clientId} = params;
        if (!discoveryUrl || !user || !clientId) {
          throw new Error('discoveryUrl, user and clientId are required to initialize E2EIServiceInternal');
        }
        E2EIStorage.store.initialData({discoveryUrl, user, clientId});
        await E2EIServiceInternal.instance.init({clientId, discoveryUrl, user});
      }
    }
    return E2EIServiceInternal.instance;
  }

  public async startCertificateProcess() {
    // Step 0: Check if we have a handle in local storage
    // If we don't have a handle, we need to start a new OAuth flow
    try {
      return this.startNewOAuthFlow();
    } catch (error) {
      return this.exitWithError('Error while trying to start OAuth flow with error:', error);
    }
  }

  public async continueCertificateProcess(oAuthIdToken: string): Promise<RotateBundle | undefined> {
    // If we don't have a handle, we need to start a new OAuth flow
    if (this.e2eServiceExternal.isEnrollmentInProgress()) {
      try {
        return this.continueOAuthFlow(oAuthIdToken);
      } catch (error) {
        return this.exitWithError('Error while trying to continue OAuth flow with error:', error);
      }
    }
    this.logger.error('Error while trying to continue OAuth flow. No handle found in local storage');
    return undefined;
  }

  // ############ Internal Functions ############

  private exitWithError(message: string, error?: unknown) {
    this.logger.error(message, error);
    return undefined;
  }

  private async init(params: Required<Pick<InitParams, 'user' | 'clientId' | 'discoveryUrl'>>): Promise<void> {
    try {
      const {user, clientId, discoveryUrl} = params;
      if (!user || !clientId) {
        this.logger.error('user and clientId are required to initialize E2eIdentityService');
        throw new Error();
      }
      this.acmeService = new AcmeService(discoveryUrl);
      this.identity = await this.coreCryptoClient.e2eiNewActivationEnrollment(
        getE2EIClientId(clientId, user.id, user.domain).asString,
        user.displayName,
        user.handle,
        2,
        Ciphersuite.MLS_128_DHKEMX25519_AES128GCM_SHA256_Ed25519,
      );
      this.isInitialized = true;
    } catch (error) {
      this.logger.error('Error while trying to initialize E2eIdentityService', error);
      throw error;
    }
  }

  private async getDirectory(identity: E2eiEnrollment, connection: AcmeService): Promise<AcmeDirectory | undefined> {
    try {
      const directory = await connection.getDirectory();

      if (directory) {
        const parsedDirectory = identity.directoryResponse(directory);
        return parsedDirectory;
      }
    } catch (error) {
      this.logger.error('Error while trying to receive a directory', error);
      throw error;
    }
    return undefined;
  }

  private async getInitialNonce(directory: AcmeDirectory, connection: AcmeService): Promise<string> {
    try {
      const nonce = await connection.getInitialNonce(directory.newNonce);
      if (nonce) {
        return nonce;
      }
      throw new Error('No initial-nonce received');
    } catch (error) {
      this.logger.error('Error while trying to receive a nonce', error);
      throw error;
    }
  }

  private async startNewOAuthFlow(): Promise<AcmeChallenge | undefined> {
    if (this.e2eServiceExternal.isEnrollmentInProgress()) {
      return this.exitWithError('Error while trying to start OAuth flow. There is already a flow in progress');
    }
    if (!this.isInitialized || !this.identity || !this.acmeService) {
      return this.exitWithError('Error while trying to start OAuth flow. E2eIdentityService is not fully initialized');
    }

    // Get the directory
    const directory = await this.getDirectory(this.identity, this.acmeService);
    if (!directory) {
      return this.exitWithError('Error while trying to start OAuth flow. No directory received');
    }

    // Step 1: Get a new nonce from ACME server
    const nonce = await this.getInitialNonce(directory, this.acmeService);
    if (!nonce) {
      return this.exitWithError('Error while trying to start OAuth flow. No nonce received');
    }

    // Step 2: Create a new account
    const newAccountNonce = await createNewAccount({
      connection: this.acmeService,
      directory,
      identity: this.identity,
      nonce,
    });

    // Step 3: Create a new order
    const orderData = await createNewOrder({
      directory,
      connection: this.acmeService,
      identity: this.identity,
      nonce: newAccountNonce,
    });

    // Step 4: Get authorization challenges
    const authData = await getAuthorization({
      connection: this.acmeService,
      identity: this.identity,
      authzUrl: orderData.authzUrl,
      nonce: orderData.nonce,
    });
    // Manual copy of the data because of a problem with copying the wasm object

    // Step 6: Start E2E OAuth flow
    const {
      authorization: {wireOidcChallenge},
    } = authData;
    if (wireOidcChallenge) {
      // stash the identity for later use
      const handle = await this.coreCryptoClient.e2eiEnrollmentStash(this.identity);
      // stash the handle in local storage
      E2EIStorage.store.handle(Encoder.toBase64(handle).asString);
      E2EIStorage.store.authData(authData);
      E2EIStorage.store.orderData({orderUrl: orderData.orderUrl});
      // we need to pass back the aquired wireOidcChallenge to the UI
      return wireOidcChallenge;
    }
    return undefined;
  }

  private async continueOAuthFlow(oAuthIdToken: string) {
    // If we have a handle, the user has already started the process to authenticate with the OIDC provider. We can continue the flow.
    try {
      if (!this.acmeService) {
        return this.exitWithError('Error while trying to continue OAuth flow. AcmeService is not initialized');
      }

      const handle = E2EIStorage.get.handle();
      const authData = E2EIStorage.get.authData();

      if (!authData.authorization.wireOidcChallenge) {
        return this.exitWithError('Error while trying to continue OAuth flow. No wireOidcChallenge received');
      }

      this.identity = await this.coreCryptoClient.e2eiEnrollmentStashPop(Decoder.fromBase64(handle).asBytes);
      this.logger.log('retrieved identity from stash');

      // Step 7: Do OIDC client challenge
      const oidcData = await doWireOidcChallenge({
        oAuthIdToken,
        authData,
        connection: this.acmeService,
        identity: this.identity,
        nonce: authData.nonce,
      });
      this.logger.log('received oidcData', oidcData);

      if (!oidcData.data.validated) {
        return this.exitWithError('Error while trying to continue OAuth flow. OIDC challenge not validated');
      }

      const {user: wireUser, clientId} = E2EIStorage.get.initialData();
      //Step 8: Do DPOP Challenge
      const dpopData = await doWireDpopChallenge({
        authData,
        clientId,
        connection: this.acmeService,
        identity: this.identity,
        userDomain: wireUser.domain,
        apiClient: this.apiClient,
        expirySecs: 30,
        nonce: oidcData.nonce,
      });
      this.logger.log('acme dpopData', JSON.stringify(dpopData));
      if (!isResponseStatusValid(dpopData.data.status)) {
        return this.exitWithError('Error while trying to continue OAuth flow. DPOP challenge not validated');
      }

      //Step 9: Finalize Order
      const orderData = E2EIStorage.get.orderData();
      const finalizeOrderData = await finalizeOrder({
        connection: this.acmeService,
        identity: this.identity,
        nonce: dpopData.nonce,
        orderUrl: orderData.orderUrl,
      });
      if (!finalizeOrderData.certificateUrl) {
        return this.exitWithError('Error while trying to continue OAuth flow. No certificateUrl received');
      }

      // Step 9: Get certificate
      const {certificate} = await getCertificate({
        certificateUrl: finalizeOrderData.certificateUrl,
        nonce: finalizeOrderData.nonce,
        connection: this.acmeService,
        identity: this.identity,
      });
      if (!certificate) {
        return this.exitWithError('Error while trying to continue OAuth flow. No certificate received');
      }
      E2EIStorage.store.certificate(certificate);
      // Step 10: Initialize MLS with the certificate
      // TODO: This is not working yet (since we initialize mls beforehand) and will be replaced by a new core-crypto function later on
      return await this.coreCryptoClient.e2eiRotateAll(this.identity, certificate, this.keyPackagesAmount);
    } catch (error) {
      this.logger.error('Error while trying to continue OAuth flow', error);
      throw error;
    }
  }
}

export {E2EIServiceInternal};
