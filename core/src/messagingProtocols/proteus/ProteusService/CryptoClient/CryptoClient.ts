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

import {PreKey} from '@wireapp/api-client/lib/auth';

import {CoreCrypto} from '@wireapp/core-crypto';
import {Cryptobox} from '@wireapp/cryptobox';

import {CoreCryptoWrapper} from './CoreCryptoWrapper';
import {CryptoboxWrapper} from './CryptoboxWrapper';
import {CryptoClient} from './CryptoClient.types';

import {CoreDatabase} from '../../../../storage/CoreDB';

type Config = {
  nbPrekeys: number;
  onNewPrekeys: (prekeys: PreKey[]) => void;
};

export function wrapCryptoClient(cryptoClient: CoreCrypto | Cryptobox, db: CoreDatabase, config: Config): CryptoClient {
  const isCoreCrypto = cryptoClient instanceof CoreCrypto;
  return isCoreCrypto ? new CoreCryptoWrapper(cryptoClient, db, config) : new CryptoboxWrapper(cryptoClient, config);
}
