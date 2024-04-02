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

import logdown from 'logdown';

import {APIClient} from '@wireapp/api-client';

import {AcmeService} from './Connection/AcmeServer';
import {AcmeDirectory, Ciphersuite, CoreCrypto, E2eiEnrollment} from './E2EIService.types';
import {isResponseStatusValid} from './Helper';
import {createNewAccount} from './Steps/Account';
import {getAuthorizationChallenges} from './Steps/Authorization';
import {getCertificate} from './Steps/Certificate';
import {doWireDpopChallenge} from './Steps/DpopChallenge';
import {doWireOidcChallenge} from './Steps/OidcChallenge';
import {createNewOrder, finalizeOrder} from './Steps/Order';
import {createE2EIEnrollmentStorage} from './Storage/E2EIStorage';
import {EnrollmentFlowData, InitialData, UnidentifiedEnrollmentFlowData} from './Storage/E2EIStorage.schema';

import {CoreDatabase} from '../../../storage/CoreDB';

export type getTokenCallback = (challengesData?: {challenge: any; keyAuth: string}) => Promise<string | undefined>;
export class E2EIServiceInternal {
  private readonly logger = logdown('@wireapp/core/E2EIdentityServiceInternal');
  private acmeService: AcmeService;
  private enrollmentStorage: ReturnType<typeof createE2EIEnrollmentStorage>;

  public constructor(
    coreDb: CoreDatabase,
    private readonly coreCryptoClient: CoreCrypto,
    private readonly apiClient: APIClient,
    /** number of seconds the certificate should be valid */
    private readonly certificateTtl: number,
    private readonly keyPackagesAmount: number,
    private readonly initialData: InitialData,
  ) {
    const {discoveryUrl} = initialData;
    this.acmeService = new AcmeService(discoveryUrl);
    this.enrollmentStorage = createE2EIEnrollmentStorage(coreDb);
  }

  /**
   * Will get a certificate for the user
   * @param getOAuthToken function called when the process needs an oauth token
   * @param refresh should the process refresh the current certificate or get a new one
   */
  public async generateCertificate(getOAuthToken: getTokenCallback, refresh: boolean) {
    const stashedEnrollmentData = await this.enrollmentStorage.getPendingEnrollmentData();

    if (stashedEnrollmentData) {
      // In case we have stashed data, we continue the enrollment flow (we are coming back from a redirect)
      const oAuthToken = await getOAuthToken();
      if (!oAuthToken) {
        throw new Error('No OAuthToken received for in progress enrollment process');
      }
      return this.continueCertificateGeneration(oAuthToken, stashedEnrollmentData);
    }

    // We first get the challenges needed to validate the user identity
    const identity = await this.initIdentity(refresh);
    const enrollmentChallenges = await this.getEnrollmentChallenges(identity);
    const {keyauth, oidcChallenge} = enrollmentChallenges.authorization;
    const challengeData = {challenge: oidcChallenge, keyAuth: keyauth};

    // store auth data for continuing the flow later on (in case we are redirected to the identity provider)
    const handle = await this.coreCryptoClient.e2eiEnrollmentStash(identity);
    const enrollmentData = {
      handle,
      ...enrollmentChallenges,
    };
    await this.enrollmentStorage.savePendingEnrollmentData(enrollmentData);

    // At this point we might be redirected to the identity provider. We have
    const oAuthToken = await getOAuthToken(challengeData);
    if (!oAuthToken) {
      throw new Error('No OAuthToken received for in initial enrollment process');
    }
    return this.continueCertificateGeneration(oAuthToken, enrollmentData);
  }

  private async continueCertificateGeneration(oAuthToken: string, enrollmentData: EnrollmentFlowData) {
    const handle = enrollmentData.handle;
    const identity = await this.coreCryptoClient.e2eiEnrollmentStashPop(handle);
    return this.getRotateBundle(identity, oAuthToken, enrollmentData);
  }

  // ############ Internal Functions ############

  private async initIdentity(hasActiveCertificate: boolean) {
    const {user} = this.initialData;

    // How long the issued certificate should be maximal valid
    const ciphersuite = Ciphersuite.MLS_128_DHKEMX25519_AES128GCM_SHA256_Ed25519;

    return hasActiveCertificate
      ? this.coreCryptoClient.e2eiNewRotateEnrollment(
          this.certificateTtl,
          ciphersuite,
          user.displayName,
          user.handle,
          user.teamId,
        )
      : this.coreCryptoClient.e2eiNewActivationEnrollment(
          user.displayName,
          user.handle,
          this.certificateTtl,
          ciphersuite,
          user.teamId,
        );
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
  private async getEnrollmentChallenges(identity: E2eiEnrollment) {
    // Get the directory
    const {acmeService: acmeService} = this;
    const directory = await this.getDirectory(identity, acmeService);
    if (!directory) {
      throw new Error('Error while trying to start OAuth flow. No directory received');
    }

    // Step 1: Get a new nonce from ACME server
    const nonce = await this.getInitialNonce(directory, acmeService);
    if (!nonce) {
      throw new Error('Error while trying to start OAuth flow. No nonce received');
    }

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

    return {orderUrl: orderData.orderUrl, ...authChallenges};
  }

  /**
   * Continuation of the ACME enrollment flow
   * Needs to be called after the user has authenticated with the OIDC provider
   * Stores the received certificate data in local storage for later use
   *
   * @param oAuthIdToken
   * @returns RotateBundle
   */
  private async getRotateBundle(
    identity: E2eiEnrollment,
    oAuthIdToken: string,
    enrollmentData: UnidentifiedEnrollmentFlowData,
  ) {
    // Step 7: Do OIDC client challenge
    const oidcData = await doWireOidcChallenge({
      oAuthIdToken,
      authData: enrollmentData,
      connection: this.acmeService,
      identity,
      nonce: enrollmentData.nonce,
    });
    this.logger.log('oidc data', oidcData);

    if (!oidcData.data.validated) {
      throw new Error('Error while trying to continue OAuth flow. OIDC challenge not validated');
    }

    const {user: wireUser, clientId} = this.initialData;
    //Step 8: Do DPOP Challenge
    const dpopData = await doWireDpopChallenge({
      authData: enrollmentData,
      clientId,
      connection: this.acmeService,
      identity,
      userDomain: wireUser.domain,
      apiClient: this.apiClient,
      expirySecs: 30,
      nonce: oidcData.nonce,
    });
    this.logger.log('dpop data', dpopData);

    if (!isResponseStatusValid(dpopData.data.status)) {
      throw new Error('Error while trying to continue OAuth flow. DPOP challenge not validated');
    }

    //Step 9: Finalize Order
    const finalizeOrderData = await finalizeOrder({
      connection: this.acmeService,
      identity,
      nonce: dpopData.nonce,
      orderUrl: enrollmentData.orderUrl,
    });

    if (!finalizeOrderData.certificateUrl) {
      throw new Error('Error while trying to continue OAuth flow. No certificateUrl received');
    }

    // Step 9: Get certificate
    const {certificate} = await getCertificate({
      certificateUrl: finalizeOrderData.certificateUrl,
      nonce: finalizeOrderData.nonce,
      connection: this.acmeService,
      identity,
    });

    if (!certificate) {
      throw new Error('Error while trying to continue OAuth flow. No certificate received');
    }

    // Step 10: Initialize MLS with the certificate
    return this.coreCryptoClient.e2eiRotateAll(identity, certificate, this.keyPackagesAmount);
  }
}
