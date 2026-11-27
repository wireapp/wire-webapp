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

import {eachUntilFailure, isInState, isOutcome, pipe} from './tagged';
import type {Outcome, State} from './types';

type Counted = Outcome<'counted', {count: number}>;
type Broken = Outcome<'broken', {at: number}>;

const isBroken = isOutcome('broken');

describe('tagged', () => {
  describe('pipe', () => {
    it('passes each outcome to the next step, sync or async, and answers the last', async () => {
      const result = await pipe(isBroken)(
        (): Counted => {
          return {outcome: 'counted', count: 1};
        },
        async ({count}): Promise<Counted> => {
          return {outcome: 'counted', count: count + 1};
        },
        ({count}): Counted => {
          return {outcome: 'counted', count: count * 10};
        },
      );

      expect(result).toEqual({outcome: 'counted', count: 20});
    });

    it('stops at the first failure and answers it without running the later steps', async () => {
      const later = jest.fn((): Counted => {
        return {outcome: 'counted', count: 0};
      });

      const result = await pipe(isBroken)(
        (): Counted => {
          return {outcome: 'counted', count: 1};
        },
        ({count}): Broken | Counted => {
          return {outcome: 'broken', at: count};
        },
        later,
      );

      expect(result).toEqual({outcome: 'broken', at: 1});
      expect(later).not.toHaveBeenCalled();
    });

    it('answers a failure of the first step', async () => {
      const later = jest.fn((): Counted => {
        return {outcome: 'counted', count: 0};
      });

      expect(
        await pipe(isBroken)((): Broken | Counted => {
          return {outcome: 'broken', at: 0};
        }, later),
      ).toEqual({
        outcome: 'broken',
        at: 0,
      });
      expect(later).not.toHaveBeenCalled();
    });
  });

  describe('eachUntilFailure', () => {
    it('runs the step for each item in order and answers done', async () => {
      const seen: number[] = [];

      const result = await eachUntilFailure(isBroken)(
        [1, 2, 3],
        async (item): Promise<Counted> => {
          seen.push(item);
          return {outcome: 'counted', count: item};
        },
        {outcome: 'done'},
      );

      expect(result).toEqual({outcome: 'done'});
      expect(seen).toEqual([1, 2, 3]);
    });

    it('stops at the first failure and answers it', async () => {
      const seen: number[] = [];

      const result = await eachUntilFailure(isBroken)(
        [1, 2, 3],
        (item): Broken | Counted => {
          seen.push(item);
          return item === 2 ? {outcome: 'broken', at: item} : {outcome: 'counted', count: item};
        },
        {outcome: 'done'},
      );

      expect(result).toEqual({outcome: 'broken', at: 2});
      expect(seen).toEqual([1, 2]);
    });
  });

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
