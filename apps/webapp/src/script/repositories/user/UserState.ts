/*
 * Wire
 * Copyright (C) 2020 Wire Swiss GmbH
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
import {User} from 'Repositories/entity/User';
import {singleton} from 'tsyringe';
import {sortUsersByPriority} from 'Util/StringUtil';
import {TIME_IN_MILLIS} from 'Util/TimeUtil';

@singleton()
export class UserState {
  public readonly self = ko.observable<User | undefined>();
  /** All the users we know of (connected users, conversation users, team members, users we have searched for...) */
  public readonly users = ko.observableArray<User>([]);
  /** All the users that are directly connect to the self user (do not include users that are connected through conversations) */
  public readonly connectedUsers: ko.PureComputed<User[]>;
  public readonly connectRequests: ko.PureComputed<User[]>;

  constructor() {
    this.connectRequests = ko
      .pureComputed(() => this.users().filter(userEntity => userEntity.isIncomingRequest()))
      .extend({rateLimit: 50});

    this.connectedUsers = ko
      .pureComputed(() => {
        return this.users()
          .filter(userEntity => userEntity.isConnected())
          .sort(sortUsersByPriority);
      })
      .extend({rateLimit: TIME_IN_MILLIS.SECOND});
  }
}
