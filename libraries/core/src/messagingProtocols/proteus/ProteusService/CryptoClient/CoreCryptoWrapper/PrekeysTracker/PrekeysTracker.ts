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

import {PrekeysTrackerStore} from './PrekeysTracker.store';

import {CryptoClient} from '../..';

type CoreCryptoPrekeyGenerator = Pick<CryptoClient, 'newPrekey'>;

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

export class PrekeyTracker {
  private prekeyState: PrekeysTrackerStore;

  constructor(
    private readonly generator: CoreCryptoPrekeyGenerator,
    private config: PrekeysGeneratorConfig,
  ) {
    this.prekeyState = new PrekeysTrackerStore();
  }

  private async generatePrekeys(nb: number): Promise<PreKey[]> {
    const prekeys: PreKey[] = [];
    for (let i = 0; i < nb; i++) {
      prekeys.push(await this.generator.newPrekey());
    }
    return prekeys;
  }

  setInitialState(nbPrekeys: number) {
    return this.prekeyState.addPrekeys(nbPrekeys);
  }

  async consumePrekey() {
    const nbPrekeys = this.prekeyState.consumePrekey();
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
}
