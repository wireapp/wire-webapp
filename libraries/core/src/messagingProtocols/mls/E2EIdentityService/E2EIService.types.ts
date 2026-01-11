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
  E2eiEnrollment,
  Ciphersuite,
  CoreCrypto,
  WireIdentity,
  E2eiConversationState,
  DeviceStatus,
  CredentialType,
} from '@wireapp/core-crypto';

/**
 * Proxy types relevant to the E2EIService from CoreCrypto
 */
type OmitFree<T> = Omit<T, 'free'>;
type NewAcmeAuthzOriginal = OmitFree<Awaited<ReturnType<E2eiEnrollment['newAuthzResponse']>>>;
export type AcmeDirectory = OmitFree<Awaited<ReturnType<E2eiEnrollment['directoryResponse']>>>;
export type AcmeChallenge = OmitFree<NonNullable<NewAcmeAuthzOriginal['challenge']>>;
export type NewAcmeOrder = OmitFree<Awaited<ReturnType<E2eiEnrollment['newOrderResponse']>>>;
export type NewAcmeAuthz = Pick<
  Awaited<ReturnType<E2eiEnrollment['newAuthzResponse']>>,
  'identifier' | 'keyauth' | 'challenge'
>;
export {E2eiEnrollment, Ciphersuite, CoreCrypto, DeviceStatus, WireIdentity, E2eiConversationState, CredentialType};

export type User = {
  id: string;
  domain: string;
  displayName: string;
  teamId: string;
  handle: string;
};
export type AcmeAccount = Uint8Array;
export type Nonce = string;
export type KeyAuth = NewAcmeAuthzOriginal['keyauth'];
