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

import {Role} from '@wireapp/api-client/lib/team';
import {FeatureList, FEATURE_STATUS, SELF_DELETING_TIMEOUT} from '@wireapp/api-client/lib/team/feature/';
import ko from 'knockout';
import {Conversation} from 'Repositories/entity/Conversation';
import {User} from 'Repositories/entity/User';
import {ROLE, roleMap} from 'Repositories/user/UserPermission';
import {UserState} from 'Repositories/user/UserState';
import {container, singleton} from 'tsyringe';
import {sortUsersByPriority} from 'Util/StringUtil';

import {TeamEntity} from './TeamEntity';

@singleton()
export class TeamState {
  public readonly isTeamDeleted: ko.Observable<boolean>;
  public readonly memberInviters: ko.Observable<Record<string, string>>;
  public readonly memberRoles: ko.Observable<Record<string, ROLE>>;
  public readonly supportsLegalHold: ko.Observable<boolean>;
  public readonly teamName: ko.PureComputed<string>;
  public readonly teamFeatures: ko.Observable<FeatureList | undefined>;
  public readonly classifiedDomains: ko.PureComputed<string[] | undefined>;
  public readonly isConferenceCallingEnabled: ko.PureComputed<boolean>;
  public readonly isFileSharingSendingEnabled: ko.PureComputed<boolean>;
  public readonly isFileSharingReceivingEnabled: ko.PureComputed<boolean>;
  public readonly isVideoCallingEnabled: ko.PureComputed<boolean>;
  public readonly isMLSEnabled: ko.PureComputed<boolean>;
  public readonly isProtocolToggleEnabledForUser: ko.PureComputed<boolean>;
  public readonly isGuestLinkEnabled: ko.PureComputed<boolean>;
  public readonly isSelfDeletingMessagesEnabled: ko.PureComputed<boolean>;
  public readonly isSelfDeletingMessagesEnforced: ko.PureComputed<boolean>;
  public readonly getEnforcedSelfDeletingMessagesTimeout: ko.PureComputed<SELF_DELETING_TIMEOUT>;
  /** all the members of the team */
  readonly teamMembers: ko.PureComputed<User[]>;
  /** all the members of the team + the users the selfUser is connected with */
  readonly teamUsers: ko.PureComputed<User[]>;
  readonly isTeam: ko.PureComputed<boolean>;
  readonly team = ko.observable(new TeamEntity());
  readonly teamDomain: ko.PureComputed<string>;
  readonly teamSize: ko.PureComputed<number>;
  readonly selfRole: ko.PureComputed<Role | undefined>;
  readonly isCellsEnabled: ko.PureComputed<boolean>;
  readonly isAuditLogEnabled: ko.PureComputed<boolean>;

  constructor(private readonly userState = container.resolve(UserState)) {
    this.isTeam = ko.pureComputed(() => !!this.team()?.id);
    this.isTeamDeleted = ko.observable(false);

    /** Note: this does not include the self user */
    this.teamMembers = ko.pureComputed(() => this.userState.users().filter(user => !user.isMe && this.isInTeam(user)));
    this.memberRoles = ko.observable({});
    this.memberInviters = ko.observable({});
    this.teamFeatures = ko.observable();

    this.teamDomain = ko.pureComputed(() => userState.self().domain);
    this.teamName = ko.pureComputed(() => (this.isTeam() ? this.team().name() : this.userState.self().name()));
    this.teamSize = ko.pureComputed(() => this.teamMembers().length + 1);
    this.teamUsers = ko.pureComputed(() => {
      return this.teamMembers()
        .concat(this.userState.connectedUsers())
        .filter((item, index, array) => array.indexOf(item) === index)
        .sort(sortUsersByPriority);
    });

    this.supportsLegalHold = ko.observable(false);

    this.isFileSharingSendingEnabled = ko.pureComputed(() => {
      const status = this.teamFeatures()?.fileSharing?.status;
      return status ? status === FEATURE_STATUS.ENABLED : true;
    });
    this.isFileSharingReceivingEnabled = ko.pureComputed(() => {
      const status = this.teamFeatures()?.fileSharing?.status;
      return status ? status === FEATURE_STATUS.ENABLED : true;
    });

    this.classifiedDomains = ko.pureComputed(() => {
      return this.teamFeatures()?.classifiedDomains?.status === FEATURE_STATUS.ENABLED
        ? this.teamFeatures()?.classifiedDomains?.config.domains
        : undefined;
    });

    this.isSelfDeletingMessagesEnabled = ko.pureComputed(
      () => this.teamFeatures()?.selfDeletingMessages?.status === FEATURE_STATUS.ENABLED,
    );
    this.getEnforcedSelfDeletingMessagesTimeout = ko.pureComputed(
      () =>
        (this.teamFeatures()?.selfDeletingMessages?.config?.enforcedTimeoutSeconds || SELF_DELETING_TIMEOUT.OFF) * 1000,
    );
    this.isSelfDeletingMessagesEnforced = ko.pureComputed(
      () => this.getEnforcedSelfDeletingMessagesTimeout() > SELF_DELETING_TIMEOUT.OFF,
    );

    this.isVideoCallingEnabled = ko.pureComputed(
      // TODO connect to video calling feature config
      () => true || this.teamFeatures()?.videoCalling?.status === FEATURE_STATUS.ENABLED,
    );

    this.isMLSEnabled = ko.pureComputed(() => {
      return this.teamFeatures()?.mls?.status === FEATURE_STATUS.ENABLED;
    });

    this.isProtocolToggleEnabledForUser = ko.pureComputed(
      () => this.teamFeatures()?.mls?.config.protocolToggleUsers.includes(this.userState.self().id) ?? false,
    );

    // this feature is used to check if the customer is part of premium plan
    this.isConferenceCallingEnabled = ko.pureComputed(
      () => this.teamFeatures()?.conferenceCalling?.status === FEATURE_STATUS.ENABLED,
    );

    this.isGuestLinkEnabled = ko.pureComputed(
      () => this.teamFeatures()?.conversationGuestLinks?.status === FEATURE_STATUS.ENABLED,
    );

    this.selfRole = ko.pureComputed(() => {
      const roles = this.memberRoles();
      const userId = this.userState.self()?.id;
      return roles && userId ? roleMap[roles[userId]] : undefined;
    });

    this.isCellsEnabled = ko.pureComputed(() => {
      return this.teamFeatures()?.cells?.status === FEATURE_STATUS.ENABLED;
    });

    this.isAuditLogEnabled = ko.pureComputed(() => {
      return this.teamFeatures()?.assetAuditLog?.status === FEATURE_STATUS.ENABLED;
    });
  }

  isInTeam(entity: User | Conversation): boolean {
    const team = this.team();
    return !!team.id && entity.domain === this.teamDomain() && entity.teamId === team.id;
  }

  isExternal(userId: string): boolean {
    return this.memberRoles()[userId] === ROLE.PARTNER;
  }
}
