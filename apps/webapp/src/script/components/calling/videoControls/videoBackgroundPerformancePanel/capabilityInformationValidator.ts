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

import {Maybe} from 'true-myth';

import {CapabilityInfo} from 'Repositories/media/backgroundEffects/backgroundEffectsWorkerTypes';

// Business logic for checking if the capability info has changed
const capabilityComparator = (initialCapabilityInfo: CapabilityInfo) => (futureCapabilityInfo: CapabilityInfo) => {
  return (
    initialCapabilityInfo.webgl2 === futureCapabilityInfo.webgl2 &&
    initialCapabilityInfo.worker === futureCapabilityInfo.worker &&
    initialCapabilityInfo.offscreenCanvas === futureCapabilityInfo.offscreenCanvas &&
    initialCapabilityInfo.requestVideoFrameCallback === futureCapabilityInfo.requestVideoFrameCallback
  );
};

// Guard for checking if the capability info has changed
export const areCapabilityInfosEqual = (
  initialCapabilityInfo: Maybe<CapabilityInfo>,
  futureCapabilityInfo: Maybe<CapabilityInfo>,
): boolean => {
  return Maybe.just(capabilityComparator).ap(initialCapabilityInfo).ap(futureCapabilityInfo).unwrapOr(false);
};
