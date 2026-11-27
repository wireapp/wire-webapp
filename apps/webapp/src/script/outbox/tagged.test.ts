/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {isInState, isOutcome} from './tagged';
import type {State} from './types';

describe('tagged', () => {
  describe('isOutcome', () => {
    it('accepts the outcomes with one of the tags', () => {
      const isCountedOrBroken = isOutcome('counted', 'broken');

      expect(isCountedOrBroken({outcome: 'counted', count: 1})).toBe(true);
      expect(isCountedOrBroken({outcome: 'broken', at: 1})).toBe(true);
      expect(isCountedOrBroken({outcome: 'other'})).toBe(false);
    });
  });

  describe('isInState', () => {
    it('accepts the values in one of the states', () => {
      type Timer = State<'armed', {timer: number}> | State<'disarmed'>;
      const armed: Timer = {state: 'armed', timer: 1};
      const disarmed: Timer = {state: 'disarmed'};

      expect(isInState('armed')(armed)).toBe(true);
      expect(isInState('armed')(disarmed)).toBe(false);
      expect(isInState('armed', 'disarmed')(disarmed)).toBe(true);
    });
  });
});
