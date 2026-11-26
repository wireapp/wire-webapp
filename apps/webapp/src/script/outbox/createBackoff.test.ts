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

import {createBackoff} from './createBackoff';
import {createFakeClock, type FakeClock} from './testing/createFakeClock';
import {createFakeRandom, type FakeRandom} from './testing/createFakeRandom';

describe('createBackoff', () => {
  let clock: FakeClock;
  let fakeRandom: FakeRandom;

  beforeEach(() => {
    clock = createFakeClock();
    fakeRandom = createFakeRandom();
  });

  afterEach(() => {
    clock.dispose();
  });

  it('has a limit that starts at 5 seconds and doubles up to 60 seconds', () => {
    const backoff = createBackoff(undefined, undefined, fakeRandom.random);

    const waits = Array.from({length: 6}, () => {
      return backoff.grow();
    });

    expect(waits).toEqual([5_000, 10_000, 20_000, 40_000, 60_000, 60_000]);
  });

  it('doubles the limit each time up to the maximum', () => {
    const backoff = createBackoff(100, 350, fakeRandom.random);

    expect([backoff.grow(), backoff.grow(), backoff.grow(), backoff.grow()]).toEqual([100, 200, 350, 350]);
  });

  it('waits a random time between 0 and the limit', () => {
    const backoff = createBackoff(100, 400, fakeRandom.random);
    fakeRandom.queue(0, 0.5, 0.25, 0.999);

    expect([backoff.grow(), backoff.grow(), backoff.grow(), backoff.grow()]).toEqual([0, 100, 100, 399]);
  });

  it('uses Math.random when given no source of randomness', () => {
    const random = jest.spyOn(Math, 'random').mockReturnValue(0.5);
    const backoff = createBackoff(100, 1_000);

    expect(backoff.grow()).toBe(50);
    expect(random).toHaveBeenCalled();
    random.mockRestore();
  });

  it('counts down the wait as time passes', async () => {
    const backoff = createBackoff(100, 1_000, fakeRandom.random);

    backoff.grow();
    await clock.advance(40);

    expect(backoff.remainingMilliseconds()).toBe(60);
  });

  it('has no wait before the first growth and after it is over', async () => {
    const backoff = createBackoff(100, 1_000, fakeRandom.random);
    expect(backoff.remainingMilliseconds()).toBe(0);

    backoff.grow();
    await clock.advance(100);

    expect(backoff.remainingMilliseconds()).toBe(0);
  });

  it('starts again from the minimum after a reset, and ends the wait', () => {
    const backoff = createBackoff(100, 1_000, fakeRandom.random);
    backoff.grow();
    backoff.grow();

    backoff.reset();

    expect(backoff.remainingMilliseconds()).toBe(0);
    expect(backoff.grow()).toBe(100);
  });
});
