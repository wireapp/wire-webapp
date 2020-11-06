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
import {container, singleton} from 'tsyringe';
import {sortUsersByPriority} from 'Util/StringUtil';
import {User} from '../entity/User';
import {UserState} from '../user/UserState';
import {TeamEntity} from './TeamEntity';

@singleton()
export class TeamState {
  public readonly isTeamDeleted: ko.Observable<boolean>;
  public readonly memberInviters: ko.Observable<any>;
  public readonly memberRoles: ko.Observable<any>;
  public readonly supportsLegalHold: ko.Observable<boolean>;
  public readonly teamName: ko.PureComputed<string>;
  readonly teamMembers: ko.PureComputed<User[]>;
  readonly teamUsers: ko.PureComputed<User[]>;
  readonly isTeam: ko.PureComputed<boolean>;
  readonly team: ko.Observable<TeamEntity>;
  readonly teamSize: ko.PureComputed<number>;

  constructor(private readonly userState = container.resolve(UserState)) {
    this.team = ko.observable();

    this.isTeam = ko.pureComputed(() => !!this.team()?.id);
    this.isTeamDeleted = ko.observable(false);

    /** Note: this does not include the self user */
    this.teamMembers = ko.pureComputed(() => (this.isTeam() ? this.team().members() : []));
    this.memberRoles = ko.observable({});
    this.memberInviters = ko.observable({});

    this.teamName = ko.pureComputed(() => (this.isTeam() ? this.team().name() : this.userState.self().name()));
    this.teamSize = ko.pureComputed(() => (this.isTeam() ? this.teamMembers().length + 1 : 0));
    this.teamUsers = ko.pureComputed(() => {
      return this.teamMembers()
        .concat(this.userState.connectedUsers())
        .filter((item, index, array) => array.indexOf(item) === index)
        .sort(sortUsersByPriority);
    });

    this.supportsLegalHold = ko.observable(false);

    this.userState.isTeam = this.isTeam;
    this.userState.teamMembers = this.teamMembers;
    this.userState.teamUsers = this.teamUsers;
  }
}
