/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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

import BackendError from '../BackendError';

export const TRACKING_ACTION_START = 'TRACKING_ACTION_START';
export const TRACKING_ACTION_SUCCESS = 'TRACKING_ACTION_SUCCESS';
export const TRACKING_ACTION_FAILED = 'TRACKING_ACTION_FAILED';

export const startTrackingAction = params => ({
  params,
  type: TRACKING_ACTION_START,
});

export const successfulTrackingAction = trackingResult => ({
  payload: trackingResult,
  type: TRACKING_ACTION_SUCCESS,
});

export const failedTrackingAction = error => ({
  payload: BackendError.handle(error),
  type: TRACKING_ACTION_FAILED,
});
