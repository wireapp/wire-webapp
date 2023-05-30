/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

const EndTimeKey = 'E2EIdentity_DelayTimer_EndTime';
const LastDelayTimeKey = 'E2EIdentity_DelayTimer_LastDelayTime';
const GracePeriodKey = 'E2EIdentity_DelayTimer_GracePeriod';
const TotalDelayTimeKey = 'E2EIdentity_DelayTimer_TotalDelayTime';

const DelayTimerStore = {
  set: {
    endTime: (endTime: number) => localStorage.setItem(EndTimeKey, String(endTime)),
    gracePeriod: (gracePeriod: number) => localStorage.setItem(GracePeriodKey, String(gracePeriod)),
    lastDelayTime: (lastDelayTime: number) => localStorage.setItem(LastDelayTimeKey, String(lastDelayTime)),
    totalDelayTime: (totalDelayTime: number) => localStorage.setItem(TotalDelayTimeKey, String(totalDelayTime)),
  },
  get: {
    endTime: () => Number(localStorage.getItem(EndTimeKey)),
    gracePeriod: () => Number(localStorage.getItem(GracePeriodKey)),
    lastDelayTime: () => Number(localStorage.getItem(LastDelayTimeKey)),
    totalDelayTime: () => Number(localStorage.getItem(TotalDelayTimeKey)),
  },
  has: {
    endTime: () => localStorage.getItem(EndTimeKey) !== null,
    gracePeriod: () => localStorage.getItem(GracePeriodKey) !== null,
    lastDelayTime: () => localStorage.getItem(LastDelayTimeKey) !== null,
    totalDelayTime: () => localStorage.getItem(TotalDelayTimeKey) !== null,
  },
  clear: {
    endTime: () => localStorage.removeItem(EndTimeKey),
    gracePeriod: () => localStorage.removeItem(GracePeriodKey),
    lastDelayTime: () => localStorage.removeItem(LastDelayTimeKey),
    totalDelayTime: () => localStorage.removeItem(TotalDelayTimeKey),
    all: () => {
      DelayTimerStore.clear.endTime();
      DelayTimerStore.clear.gracePeriod();
      DelayTimerStore.clear.lastDelayTime();
      DelayTimerStore.clear.totalDelayTime();
    },
  },
};

export {DelayTimerStore};
