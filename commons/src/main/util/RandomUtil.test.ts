/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

const {RandomUtil} = require('@wireapp/commons');

jest.useRealTimers();

/**
 * @testEnvironment node
 */
describe('RandomUtil', () => {
  describe('"randomInt"', () => {
    it('respects limit', () => {
      const iterations = 100;
      const randomLimit = 10;
      for (let index = 0; index < iterations; index++) {
        if (RandomUtil.randomInt(randomLimit) > randomLimit) {
          throw new Error(`randomInt() exeeded limit "${randomLimit}"`);
        }
      }
    }, 100000);
  });

  describe('"randomArrayElement"', () => {
    it('returns undefined on empty array', () => {
      const actual = RandomUtil.randomArrayElement([]);
      expect(actual).toEqual(undefined);
    });
  });
});
