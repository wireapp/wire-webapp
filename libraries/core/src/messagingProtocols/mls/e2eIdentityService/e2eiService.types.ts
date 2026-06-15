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

import {CoreCrypto, WireIdentity, E2eiConversationState, DeviceStatus, CredentialType} from '@wireapp/core-crypto/browser';

/**
 * Proxy types relevant to the E2EIService from CoreCrypto
 */
export type E2eiEnrollment = any;
type NewAcmeAuthzOriginal = any;
export type AcmeDirectory = any;
export type AcmeChallenge = any;
export type NewAcmeOrder = any;
export type NewAcmeAuthz = any;
export type {WireIdentity};
export {CoreCrypto, DeviceStatus, E2eiConversationState, CredentialType};

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
