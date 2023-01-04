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

import {PreKey} from '@wireapp/api-client/lib/auth';
import {CoreCrypto} from '@wireapp/core-crypto/platforms/web/corecrypto';
import {Encoder} from 'bazinga64';

import {PrekeysGeneratorStore} from './PrekeysGenerator.store';

import type {CoreDatabase} from '../../../../storage/CoreDB';
import {NewDevicePrekeys} from '../ProteusService.types';

type CoreCryptoPrekeyGenerator = Pick<CoreCrypto, 'proteusNewPrekey'>;

interface PrekeysGeneratorConfig {
  /**
   * The number of prekeys that will be generated for a new device and refilled when the low threshold is hit
   * We consuming a prekey, if this number is reached, then the `onHitThreshold` will be called
   */
  nbPrekeys: number;
  /**
   * called when the number of prekeys left hit a certain threshold and some prekeys are regenerated to refill the stock
   */
  onNewPrekeys: (prekeys: PreKey[]) => void;
}
export const LAST_PREKEY_ID = 65535;

export class PrekeyGenerator {
  private prekeyState: PrekeysGeneratorStore;

  constructor(
    private readonly generator: CoreCryptoPrekeyGenerator,
    db: CoreDatabase,
    private config: PrekeysGeneratorConfig,
  ) {
    this.prekeyState = new PrekeysGeneratorStore(db);
  }

  private async generatePrekey(id: number) {
    const key = await this.generator.proteusNewPrekey(id);
    return {id, key: Encoder.toBase64(key).asString};
  }

  private async generatePrekeys(nb: number): Promise<PreKey[]> {
    const prekeys: PreKey[] = [];
    const ids = await this.prekeyState.createIds(nb);
    for (const id of ids) {
      prekeys.push(await this.generatePrekey(id));
    }
    return prekeys;
  }

  async consumePrekey() {
    const nbPrekeys = await this.prekeyState.consumePrekey();
    const missingPrekeys = this.numberOfMissingPrekeys(nbPrekeys);
    if (missingPrekeys > 0) {
      // when the number of local prekeys hit less than a quarter of what it should be, we refill the stock
      const newPrekeys = await this.generatePrekeys(missingPrekeys);
      this.config.onNewPrekeys(newPrekeys);
    }
  }

  private numberOfMissingPrekeys(currentNumberOfPrekeys: number): number {
    const threshold = Math.ceil(this.config.nbPrekeys / 2);
    const hasHitThreshold = currentNumberOfPrekeys <= threshold;
    return hasHitThreshold ? this.config.nbPrekeys - currentNumberOfPrekeys : 0;
  }

  /**
   * Will generate the initial set of prekeys for a new device
   * @param nbPrekeys the number of prekeys to generate
   * @param generator the class that will be used to generate a single prekey
   */
  async generateInitialPrekeys(): Promise<NewDevicePrekeys> {
    return {
      prekeys: await this.generatePrekeys(this.config.nbPrekeys),
      lastPrekey: await this.generatePrekey(LAST_PREKEY_ID),
    };
  }
}
