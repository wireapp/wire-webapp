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
import {singleton} from 'tsyringe';
import {User} from '../entity/User';
import {sortUsersByPriority} from 'Util/StringUtil';
import {TIME_IN_MILLIS} from 'Util/TimeUtil';

@singleton()
export class UserState {
  public directlyConnectedUsers: ko.PureComputed<User[]>;
  public isTeam: ko.Observable<boolean> | ko.PureComputed<boolean>;
  public readonly connectedUsers: ko.PureComputed<User[]>;
  public readonly users: ko.ObservableArray<User>;
  public teamMembers: ko.PureComputed<User[]>;
  /** Note: this does not include the self user */
  public teamUsers: ko.PureComputed<User[]>;
  public readonly connectRequests: ko.PureComputed<User[]>;
  public readonly isActivatedAccount: ko.PureComputed<boolean>;
  public readonly isTemporaryGuest: ko.PureComputed<boolean>;
  public readonly numberOfContacts: ko.PureComputed<number>;
  public readonly self: ko.Observable<User>;

  constructor() {
    this.self = ko.observable();
    this.users = ko.observableArray([]);

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

    this.isActivatedAccount = ko.pureComputed(() => !this.self()?.isTemporaryGuest());
    this.isTemporaryGuest = ko.pureComputed(() => this.self()?.isTemporaryGuest());

    this.isTeam = ko.observable();
    this.teamMembers = ko.pureComputed((): User[] => []);
    this.teamUsers = ko.pureComputed((): User[] => []);

    this.directlyConnectedUsers = ko.pureComputed((): User[] => []);

    this.numberOfContacts = ko.pureComputed(() => {
      const contacts = this.isTeam() ? this.teamUsers() : this.connectedUsers();
      return contacts.filter(userEntity => !userEntity.isService).length;
    });
  }
}
