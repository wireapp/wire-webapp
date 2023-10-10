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

import {APIClient} from '@wireapp/api-client';
import {E2eiEnrollment, Ciphersuite, CoreCrypto, RotateBundle} from '@wireapp/core-crypto';

import {E2EIServiceExternal} from './E2EIServiceExternal';

/**
 * Proxy types relevant to the E2EIService from CoreCrypto
 */
type OmitFree<T> = Omit<T, 'free'>;
type NewAcmeAuthzOriginal = OmitFree<ReturnType<E2eiEnrollment['newAuthzResponse']>>;
export type AcmeDirectory = OmitFree<ReturnType<E2eiEnrollment['directoryResponse']>>;
export type AcmeChallenge = OmitFree<NonNullable<NewAcmeAuthzOriginal['wireDpopChallenge']>>;
export type NewAcmeOrder = OmitFree<ReturnType<E2eiEnrollment['newOrderResponse']>>;
export type NewAcmeAuthz = Pick<ReturnType<E2eiEnrollment['newAuthzResponse']>, 'identifier'> & {
  wireDpopChallenge?: AcmeChallenge;
  wireOidcChallenge?: AcmeChallenge;
};
export {E2eiEnrollment, Ciphersuite, CoreCrypto, RotateBundle};

export type User = {
  id: string;
  domain: string;
  displayName: string;
  handle: string;
};
export type Account = Uint8Array;
export type Nonce = string;

export interface FinishOidcChallengeParams {
  oidcChallenge: AcmeChallenge;
  nonce: Nonce;
  account: Account;
}

export interface GetNewCertificateParams {
  discoveryUrl: string;
}

export interface InitParams {
  apiClient: APIClient;
  coreCryptClient: CoreCrypto;
  e2eiServiceExternal: E2EIServiceExternal;
  user?: User;
  clientId?: string;
  // If a entrollment is in progress, the init function will not start a new enrollment
  skipInit?: boolean;
  discoveryUrl?: string;
  keyPackagesAmount: number;
}
