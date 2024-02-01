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
import {AcmeDirectory, Ciphersuite, CoreCrypto, E2eiEnrollment, InitParams, RotateBundle} from './E2EIService.types';
import {E2EIServiceExternal} from './E2EIServiceExternal';
import {isResponseStatusValid} from './Helper';
import {createNewAccount} from './Steps/Account';
import {getAuthorizationChallenges} from './Steps/Authorization';
import {getCertificate} from './Steps/Certificate';
import {doWireDpopChallenge} from './Steps/DpopChallenge';
import {doWireOidcChallenge} from './Steps/OidcChallenge';
import {createNewOrder, finalizeOrder} from './Steps/Order';
import {E2EIStorage} from './Storage/E2EIStorage';
import {AuthData} from './Storage/E2EIStorage.schema';

import {NewCrlDistributionPointsPayload} from '../MLSService/MLSService.types';

export class E2EIServiceInternal {
  private static instance: E2EIServiceInternal;
  private readonly logger = logdown('@wireapp/core/E2EIdentityServiceInternal');
  private readonly coreCryptoClient: CoreCrypto;
  private readonly apiClient: APIClient;
  private readonly e2eServiceExternal: E2EIServiceExternal;
  private readonly keyPackagesAmount;
  private identity?: E2eiEnrollment;
  private acmeService?: AcmeService;
  private isInitialized = false;
  private readonly dispatchNewCrlDistributionPoints: (payload: NewCrlDistributionPointsPayload) => void;

  private constructor(
    coreCryptClient: CoreCrypto,
    apiClient: APIClient,
    e2eiServiceExternal: E2EIServiceExternal,
    keyPackagesAmount: number = 100,
    dispatchNewCrlDistributionPoints: (payload: NewCrlDistributionPointsPayload) => void,
  ) {
    this.coreCryptoClient = coreCryptClient;
    this.apiClient = apiClient;
    this.e2eServiceExternal = e2eiServiceExternal;
    this.keyPackagesAmount = keyPackagesAmount;
    this.dispatchNewCrlDistributionPoints = dispatchNewCrlDistributionPoints;
    this.logger.log('Instance of E2EIServiceInternal created');
  }

  // ############ Public Functions ############

  public static async getInstance(params?: InitParams): Promise<E2EIServiceInternal> {
    if (!E2EIServiceInternal.instance) {
      if (!params) {
        throw new Error('E2EIServiceInternal is not initialized. Please call getInstance with params.');
      }
      const {
        skipInit = false,
        coreCryptClient,
        apiClient,
        e2eiServiceExternal,
        keyPackagesAmount,
        dispatchNewCrlDistributionPoints,
      } = params;
      E2EIServiceInternal.instance = new E2EIServiceInternal(
        coreCryptClient,
        apiClient,
        e2eiServiceExternal,
        keyPackagesAmount,
        dispatchNewCrlDistributionPoints,
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

  public async startCertificateProcess(hasActiveCertificate: boolean) {
    // Step 0: Check if we have a handle in local storage
    // If we don't have a handle, we need to start a new OAuth flow
    await this.initIdentity(hasActiveCertificate);
    return this.startNewOAuthFlow();
  }

  public async continueCertificateProcess(oAuthIdToken: string): Promise<RotateBundle | undefined> {
    // If we don't have a handle, we need to start a new OAuth flow
    if (this.e2eServiceExternal.isEnrollmentInProgress()) {
      return this.continueOAuthFlow(oAuthIdToken);
    }
    throw new Error('Error while trying to continue OAuth flow. No enrollment in progress found');
  }

  // ############ Internal Functions ############

  private async initIdentity(hasActiveCertificate: boolean) {
    const {user} = E2EIStorage.get.initialData();

    // How long the issued certificate should be maximal valid
    const expiryDays = 90;
    const expirySecs = expiryDays * 24 * 60 * 60;
    const ciphersuite = Ciphersuite.MLS_128_DHKEMX25519_AES128GCM_SHA256_Ed25519;

    if (hasActiveCertificate) {
      this.identity = await this.coreCryptoClient.e2eiNewRotateEnrollment(
        expirySecs,
        ciphersuite,
        user.displayName,
        user.handle,
        user.teamId,
      );
    } else {
      this.identity = await this.coreCryptoClient.e2eiNewActivationEnrollment(
        user.displayName,
        user.handle,
        expirySecs,
        ciphersuite,
        user.teamId,
      );
    }
  }

  private async init(params: Required<Pick<InitParams, 'user' | 'clientId' | 'discoveryUrl'>>): Promise<void> {
    const {user, clientId, discoveryUrl} = params;
    if (!user || !clientId) {
      this.logger.error('user and clientId are required to initialize E2eIdentityService');
      throw new Error();
    }
    this.acmeService = new AcmeService(discoveryUrl);
    this.isInitialized = true;
  }

  private async getDirectory(identity: E2eiEnrollment, connection: AcmeService): Promise<AcmeDirectory | undefined> {
    const directory = await connection.getDirectory();

    if (directory) {
      const parsedDirectory = identity.directoryResponse(directory);
      return parsedDirectory;
    }
    return undefined;
  }

  private async getInitialNonce(directory: AcmeDirectory, connection: AcmeService): Promise<string> {
    const nonce = await connection.getInitialNonce(directory.newNonce);
    if (!nonce) {
      throw new Error('No initial-nonce received');
    }
    return nonce;
  }

  /**
   * Start of the ACME enrollment flow
   * Stores the received data in local storage for later use (e.g. in the continue flow)
   *
   * @returns authData
   */
  private async getEnrollmentChallenges() {
    if (!this.isInitialized || !this.identity || !this.acmeService) {
      throw new Error('Error while trying to start OAuth flow. E2eIdentityService is not fully initialized');
    }

    // Get the directory
    const directory = await this.getDirectory(this.identity, this.acmeService);
    if (!directory) {
      throw new Error('Error while trying to start OAuth flow. No directory received');
    }

    // Step 1: Get a new nonce from ACME server
    const nonce = await this.getInitialNonce(directory, this.acmeService);
    if (!nonce) {
      throw new Error('Error while trying to start OAuth flow. No nonce received');
    }
    const {acmeService, identity} = this;

    // Step 2: Create a new account
    const newAccountNonce = await createNewAccount({
      connection: acmeService,
      directory,
      identity,
      nonce,
    });

    // Step 3: Create a new order
    const orderData = await createNewOrder({
      directory,
      connection: acmeService,
      identity,
      nonce: newAccountNonce,
    });

    // Step 4: Get authorization challenges
    const authChallenges = await getAuthorizationChallenges({
      connection: acmeService,
      identity: identity,
      authzUrls: orderData.authzUrls,
      nonce: orderData.nonce,
    });

    // Store the values in local storage for later use (e.g. in the continue flow)
    E2EIStorage.store.authData(authChallenges);
    E2EIStorage.store.orderData({orderUrl: orderData.orderUrl});

    return authChallenges;
  }

  /**
   * Continuation of the ACME enrollment flow
   * Needs to be called after the user has authenticated with the OIDC provider
   * Stores the received certificate data in local storage for later use
   *
   * @param oAuthIdToken
   * @returns RotateBundle
   */
  private async getRotateBundleAndStoreCertificateData(oAuthIdToken: string, authData: AuthData) {
    if (!this.isInitialized || !this.identity || !this.acmeService) {
      throw new Error('Error while trying to start OAuth flow. E2eIdentityService is not fully initialized');
    }

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
      throw new Error('Error while trying to continue OAuth flow. OIDC challenge not validated');
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
      throw new Error('Error while trying to continue OAuth flow. DPOP challenge not validated');
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
      throw new Error('Error while trying to continue OAuth flow. No certificateUrl received');
    }

    // Step 9: Get certificate
    const {certificate} = await getCertificate({
      certificateUrl: finalizeOrderData.certificateUrl,
      nonce: finalizeOrderData.nonce,
      connection: this.acmeService,
      identity: this.identity,
    });
    if (!certificate) {
      throw new Error('Error while trying to continue OAuth flow. No certificate received');
    }

    // Step 10: Initialize MLS with the certificate
    const rotateBundle = await this.coreCryptoClient.e2eiRotateAll(this.identity, certificate, this.keyPackagesAmount);
    this.dispatchNewCrlDistributionPoints(rotateBundle);
    return rotateBundle;
  }

  /**
   *  This function starts a new ACME enrollment flow for either a new client
   *  or a client that wants to refresh its certificate but has no valid refresh token
   */
  private async startNewOAuthFlow() {
    if (this.e2eServiceExternal.isEnrollmentInProgress()) {
      throw new Error('Error while trying to start OAuth flow. There is already a flow in progress');
    }

    if (!this.isInitialized || !this.identity) {
      throw new Error('Error while trying to start OAuth flow. E2eIdentityService is not fully initialized');
    }

    const {
      authorization: {oidcChallenge: wireOidcChallenge, keyauth},
    } = await this.getEnrollmentChallenges();

    if (!wireOidcChallenge || !keyauth) {
      throw new Error('missing wireOidcChallenge or keyauth');
    }
    // stash the identity for later use
    const handle = await this.coreCryptoClient.e2eiEnrollmentStash(this.identity);
    // stash the handle in local storage
    E2EIStorage.store.handle(Encoder.toBase64(handle).asString);
    // we need to pass back the aquired wireOidcChallenge to the UI
    return {challenge: wireOidcChallenge, keyAuth: keyauth};
  }

  /**
   * This function continues an ACME flow for either a new client
   * or a client that wants to refresh its certificate but has no valid refresh token
   *
   * @param oAuthIdToken
   * @returns RotateBundle | undefined
   */
  private async continueOAuthFlow(oAuthIdToken: string) {
    // If we have a handle, the user has already started the process to authenticate with the OIDC provider. We can continue the flow.
    if (!this.acmeService) {
      throw new Error('Error while trying to continue OAuth flow. AcmeService is not initialized');
    }

    const handle = E2EIStorage.get.handle();
    const authData = E2EIStorage.get.authData();

    this.identity = await this.coreCryptoClient.e2eiEnrollmentStashPop(Decoder.fromBase64(handle).asBytes);
    this.logger.log('retrieved identity from stash');

    return this.getRotateBundleAndStoreCertificateData(oAuthIdToken, authData);
  }

  /**
   * This function starts a ACME refresh flow for an existing client with a valid refresh token
   *
   * @param oAuthIdToken
   * @returns
   */
  public async startRefreshCertficateFlow(oAuthIdToken: string, hasActiveCertificate: boolean) {
    // we dont have an oauth flow since we already get the oAuthIdToken from the client
    if (!this.acmeService) {
      throw new Error('Error while trying to continue OAuth flow. AcmeService is not initialized');
    }

    // We need to initialize the identity
    await this.initIdentity(hasActiveCertificate);

    const authData = await this.getEnrollmentChallenges();

    return this.getRotateBundleAndStoreCertificateData(oAuthIdToken, authData);
  }
}
