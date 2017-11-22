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

import * as TrackingActionCreator from './creator/TrackingActionCreator';

export function trackEvent(event) {
  return function(dispatch, getState, {mixpanel}) {
    return Promise.resolve()
      .then(() => dispatch(TrackingActionCreator.startTrackingAction(event)))
      .then(() => mixpanel.track(event.name, event.attributes))
      .then(trackingResult => dispatch(TrackingActionCreator.successfulTrackingAction(trackingResult)))
      .catch(error => dispatch(TrackingActionCreator.failedTrackingAction(error)));
  };
}
