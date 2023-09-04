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

const FiringDateKey = 'E2EIdentity_DelayTimer_FiringDate';
const GracePeriodKey = 'E2EIdentity_DelayTimer_GracePeriod';

const DelayTimerStore = {
  store: {
    firingDate: (firingDate: number) => localStorage.setItem(FiringDateKey, String(firingDate)),
    gracePeriod: (gracePeriod: number) => localStorage.setItem(GracePeriodKey, String(gracePeriod)),
  },
  get: {
    firingDate: () => Number(localStorage.getItem(FiringDateKey)),
    gracePeriod: () => Number(localStorage.getItem(GracePeriodKey)),
  },
  clear: {
    firingDate: () => localStorage.removeItem(FiringDateKey),
    gracePeriod: () => localStorage.removeItem(GracePeriodKey),
    all: () => {
      DelayTimerStore.clear.firingDate();
      DelayTimerStore.clear.gracePeriod();
    },
  },
};

export {DelayTimerStore};
