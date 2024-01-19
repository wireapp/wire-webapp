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

import axios, {AxiosInstance} from 'axios';
import logdown from 'logdown';

import {
  GetDirectoryReturnValue,
  GetInitialNonceReturnValue,
  PostJoseRequestParams,
  PostJoseRequestReturnValue,
} from './AcmeService.types';
import {
  AuthorizationResponseData,
  AuthorizationResponseSchema,
  DirectoryResponseSchema,
  NewAccountResponseData,
  NewAccountResponseSchema,
  NewOrderResponseData,
  NewOrderResponseSchema,
  ResponseHeaderLocation,
  ResponseHeaderLocationSchema,
  ResponseHeaderNonce,
  ResponseHeaderNonceSchema,
  CheckStatusOfOrderResponseData,
  CheckStatusOfOrderResponseSchema,
  DpopChallengeResponseData,
  DpopChallengeResponseSchema,
  FinalizeOrderResponseData,
  FinalizeOrderResponseSchema,
  OidcChallengeResponseData,
  OidcChallengeResponseSchema,
  GetCertificateResponseData,
  GetCertificateResponseSchema,
  LocalCertificateRootResponseSchema,
} from './schema';

import {AcmeChallenge, AcmeDirectory} from '../../E2EIService.types';

export class AcmeService {
  private logger = logdown('@wireapp/core/AcmeService');
  private readonly axiosInstance: AxiosInstance = axios.create();
  private readonly url = {
    ROOTS: '/roots.pem',
  };

  constructor(private discoveryUrl: string) {}

  private get acmeBaseUrl() {
    const {origin} = new URL(this.discoveryUrl);
    return origin;
  }

  // ############ Internal Functions ############

  private extractNonce(headers: any): ResponseHeaderNonce['replay-nonce'] {
    return ResponseHeaderNonceSchema.parse(headers)['replay-nonce'];
  }

  private extractLocation(headers: any): ResponseHeaderLocation['location'] {
    return ResponseHeaderLocationSchema.parse(headers).location;
  }

  private async postJoseRequest<T>({
    payload,
    schema,
    url,
    errorMessage,
    shouldGetLocation = false,
  }: PostJoseRequestParams<T>): PostJoseRequestReturnValue<T> {
    try {
      const {data, headers} = await this.axiosInstance.post(url, payload, {
        headers: {
          'Content-Type': 'application/jose+json',
        },
      });
      let location = undefined;
      const nonce = this.extractNonce(headers);
      if (shouldGetLocation) {
        location = this.extractLocation(headers);
      }
      const accountData = schema.parse(data);
      return {
        data: accountData,
        nonce,
        location,
      };
    } catch (e) {
      this.logger.error(errorMessage, e);
      return undefined;
    }
  }

  // ############ Public Functions ############

  public async getDirectory(): GetDirectoryReturnValue {
    try {
      const {data} = await this.axiosInstance.get(this.discoveryUrl);
      const directory = DirectoryResponseSchema.parse(data);
      return new TextEncoder().encode(JSON.stringify(directory));
    } catch (e) {
      this.logger.error('Error while receiving Directory', e);
      return undefined;
    }
  }

  public async getLocalCertificateRoot(): Promise<string> {
    const {data} = await this.axiosInstance.get(`${this.acmeBaseUrl}${this.url.ROOTS}`);
    const localCertificateRoot = LocalCertificateRootResponseSchema.parse(data);
    return localCertificateRoot;
  }

  public async getInitialNonce(url: AcmeDirectory['newNonce']): GetInitialNonceReturnValue {
    try {
      const {headers} = await this.axiosInstance.head(url);
      const nonce = this.extractNonce(headers);
      return nonce;
    } catch (e) {
      this.logger.error('Error while receiving intial Nonce', e);
      return undefined;
    }
  }

  public async createNewAccount(url: AcmeDirectory['newAccount'], payload: Uint8Array) {
    return this.postJoseRequest<NewAccountResponseData>({
      errorMessage: 'Error while creating new Account',
      payload,
      schema: NewAccountResponseSchema,
      url,
    });
  }

  public async createNewOrder(url: AcmeDirectory['newOrder'], payload: Uint8Array) {
    return this.postJoseRequest<NewOrderResponseData>({
      errorMessage: 'Error while creating new Order',
      payload,
      schema: NewOrderResponseSchema,
      url,
      shouldGetLocation: true,
    });
  }

  public async getAuthorization(url: string, payload: Uint8Array) {
    return this.postJoseRequest<AuthorizationResponseData>({
      errorMessage: 'Error while receiving Authorization',
      payload,
      schema: AuthorizationResponseSchema,
      url,
    });
  }

  public async validateDpopChallenge(url: AcmeChallenge['url'], payload: Uint8Array) {
    return this.postJoseRequest<DpopChallengeResponseData>({
      errorMessage: 'Error while validating DPOP challenge',
      payload,
      schema: DpopChallengeResponseSchema,
      url,
    });
  }

  public async validateOidcChallenge(url: AcmeChallenge['url'], payload: Uint8Array) {
    return this.postJoseRequest<OidcChallengeResponseData>({
      errorMessage: 'Error while validating OIDC challenge',
      payload,
      schema: OidcChallengeResponseSchema,
      url,
    });
  }

  public async checkStatusOfOrder(url: string, payload: Uint8Array) {
    return this.postJoseRequest<CheckStatusOfOrderResponseData>({
      errorMessage: 'Error while checking status of Order',
      payload,
      schema: CheckStatusOfOrderResponseSchema,
      url,
    });
  }

  public async finalizeOrder(url: string, payload: Uint8Array) {
    return this.postJoseRequest<FinalizeOrderResponseData>({
      errorMessage: 'Error while finalizing Order',
      payload,
      schema: FinalizeOrderResponseSchema,
      url,
    });
  }

  public async getCertificate(url: string, payload: Uint8Array) {
    return this.postJoseRequest<GetCertificateResponseData>({
      errorMessage: 'Error while receiving Certificate',
      payload,
      schema: GetCertificateResponseSchema,
      url,
    });
  }
}
