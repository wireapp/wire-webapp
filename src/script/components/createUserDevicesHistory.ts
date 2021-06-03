/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import ko from 'knockout';
import {UserDevicesHistory, UserDevicesState} from './UserDevices';

export const createUserDevicesHistory = (): UserDevicesHistory => {
  const history = ko.observableArray();
  const headlineHistory = ko.observableArray();
  const current = ko.pureComputed(() => history()[history().length - 1]);
  const headline = ko.pureComputed(() => headlineHistory()[headlineHistory().length - 1]);
  const reset = () => {
    history.removeAll();
    history.push(UserDevicesState.DEVICE_LIST);
  };

  reset();

  return {
    current,
    goBack: () => {
      history.pop();
      headlineHistory.pop();
    },
    goTo: (to: UserDevicesState, head: string) => {
      history.push(to);
      headlineHistory.push(head);
    },
    headline,
    reset,
  };
};
