/* @flow */
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

import * as SelfActionCreator from './creator/SelfActionCreator';

export function fetchSelf() {
  return function(dispatch, getState, {apiClient}) {
    dispatch(SelfActionCreator.startFetchSelf());
    return apiClient.self.api
      .getSelf()
      .then(selfUser => {
        return apiClient.teams.team.api.getTeams().then(({teams}) => {
          const boundTeams = teams.filter(team => team.binding);
          if (boundTeams) {
            selfUser.team = boundTeams[0].id;
          }
          return selfUser;
        });
      })
      .then(selfUser => dispatch(SelfActionCreator.successfulFetchSelf(selfUser)))
      .catch(error => dispatch(SelfActionCreator.failedFetchSelf(error)));
  };
}
