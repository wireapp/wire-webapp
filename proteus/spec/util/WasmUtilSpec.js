/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

const Proteus = require('@wireapp/proteus');

describe('WASMUtil', () => {
  describe('isUsingWASM', () => {
    it('reports if the target environment supports WebAssembly', async () => {
      // To test the other way round, we would need to start Node.js
      // with the flag `--noexpose_wasm`.
      const isUsingWASM = await Proteus.util.WASMUtil.isUsingWASM();
      expect(isUsingWASM).toBe(true);
    });
  });
});
