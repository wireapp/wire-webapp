/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import type {Ciphersuite, CommitBundle, CredentialType} from '@wireapp/core-crypto';

export interface UploadCommitOptions {
  /**
   * If uploading the commit fails and we endup in a scenario where a retrial is possible, then this callback will be called to re-generate a new commit bundle
   */
  regenerateCommitBundle?: () => Promise<CommitBundle>;

  /**
   * Is the current commitBundle an external commit.
   */
  isExternalCommit?: boolean;
}

export interface MLSServiceConfig {
  /**
   * (milliseconds) period of time between automatic updates of the keying material (30 days by default)
   */
  keyingMaterialUpdateThreshold: number;
  /**
   * number of key packages client should upload to the server (100 by default)
   */
  nbKeyPackages: number;
  /**
   * default ciphersuite to use for MLS (MLS_128_DHKEMX25519_AES128GCM_SHA256_Ed25519 = 1 by default)
   */
  defaultCiphersuite: Ciphersuite;
  /**
   * default credential type to use for MLS (Basic = 1 by default)
   */
  defaultCredentialType: CredentialType;
}
