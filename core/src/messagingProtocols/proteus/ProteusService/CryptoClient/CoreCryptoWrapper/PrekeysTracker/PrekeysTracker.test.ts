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

import {PrekeyTracker} from './PrekeysTracker';

describe('PrekeysGenerator', () => {
  const baseConfig = {
    nbPrekeys: 10,
    onNewPrekeys: jest.fn(),
  };
  const mockPrekeyTracker = {
    newPrekey: jest.fn().mockResolvedValue(Uint8Array.from([])),
  };

  it('triggers the threshold callback when number of prekeys hits the limit', async () => {
    const prekeyTracker = new PrekeyTracker(mockPrekeyTracker, baseConfig);

    prekeyTracker.setInitialState(baseConfig.nbPrekeys);

    expect(baseConfig.onNewPrekeys).not.toHaveBeenCalled();

    await prekeyTracker.consumePrekey();
    await prekeyTracker.consumePrekey();
    await prekeyTracker.consumePrekey();
    await prekeyTracker.consumePrekey();
    expect(baseConfig.onNewPrekeys).not.toHaveBeenCalled();

    await prekeyTracker.consumePrekey();

    expect(baseConfig.onNewPrekeys).toHaveBeenCalledTimes(1);
  });
});
