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
  CipherSuite as Ciphersuite,
  CoreCrypto,
  WireIdentity,
  E2eiConversationState,
  DeviceStatus,
  CredentialType,
} from '@wireapp/core-crypto';

/**
 * Proxy types relevant to the E2EIService from CoreCrypto
 */
export {Ciphersuite, CoreCrypto, DeviceStatus, WireIdentity, E2eiConversationState, CredentialType};

export type User = {
  id: string;
  domain: string;
  displayName: string;
  teamId: string;
  handle: string;
};

/**
 * Performs the identity provider authentication step of the X509 credential acquisition flow.
 *
 * CoreCrypto calls this through the `PkiEnvironmentHooks.authenticate` hook. The webapp owns the
 * OIDC details, the core owns persisting the acquisition snapshot and resuming the flow after a
 * redirect.
 */
export type E2EIAuthenticateCallback = (params: {
  /** Identity provider the user has to be authenticated against. */
  idp: string;
  /** Key authorization that has to be added as the `key_auth` claim of the id token. */
  keyAuth: string;
  /** ACME audience that has to be added as the `acme_aud` claim of the id token. */
  acmeAudience: string;
  /** Serialized acquisition, used to resume the flow once the user comes back from the IdP. */
  acquisitionSnapshot: Uint8Array;
}) => Promise<string>;
