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

import {PrekeyGenerator, LAST_PREKEY_ID} from './PrekeysGenerator';

import {CoreDatabase, openDB} from '../../../../storage/CoreDB';

describe('PrekeysGenerator', () => {
  let db: CoreDatabase;
  const baseConfig = {
    nbPrekeys: 10,
    onNewPrekeys: jest.fn(),
  };
  const mockPrekeyGenerator = {
    proteusNewPrekey: jest.fn().mockResolvedValue(Uint8Array.from([])),
  };

  beforeEach(async () => {
    db = await openDB('test');
  });

  afterEach(async () => {
    await db.clear('prekeys');
  });

  it('generates initial device prekeys', async () => {
    const prekeyGenerator = new PrekeyGenerator(mockPrekeyGenerator, db, baseConfig);
    const {prekeys, lastPrekey} = await prekeyGenerator.generateInitialPrekeys();
    expect(prekeys).toHaveLength(baseConfig.nbPrekeys);
    expect(lastPrekey.id).toBe(LAST_PREKEY_ID);
  });

  it('triggers the threshold callback when number of prekeys hits the limit', async () => {
    const prekeyGenerator = new PrekeyGenerator(mockPrekeyGenerator, db, baseConfig);

    await prekeyGenerator.generateInitialPrekeys();

    expect(baseConfig.onNewPrekeys).not.toHaveBeenCalled();

    await prekeyGenerator.consumePrekey();
    await prekeyGenerator.consumePrekey();
    await prekeyGenerator.consumePrekey();
    await prekeyGenerator.consumePrekey();
    expect(baseConfig.onNewPrekeys).not.toHaveBeenCalled();

    await prekeyGenerator.consumePrekey();

    expect(baseConfig.onNewPrekeys).toHaveBeenCalledTimes(1);
  });
});
