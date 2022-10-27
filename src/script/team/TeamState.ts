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

import {FeatureList, FeatureStatus, SelfDeletingTimeout} from '@wireapp/api-client/lib/team/feature/';
import ko from 'knockout';
import {container, singleton} from 'tsyringe';

import {sortUsersByPriority} from 'Util/StringUtil';

import {TeamEntity} from './TeamEntity';

import {User} from '../entity/User';
import {ROLE} from '../user/UserPermission';
import {UserState} from '../user/UserState';

@singleton()
export class TeamState {
  public readonly isTeamDeleted: ko.Observable<boolean>;
  public readonly memberInviters: ko.Observable<any>;
  public readonly memberRoles: ko.Observable<any>;
  public readonly supportsLegalHold: ko.Observable<boolean>;
  public readonly teamName: ko.PureComputed<string>;
  public readonly teamFeatures: ko.Observable<FeatureList>;
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
  public readonly getEnforcedSelfDeletingMessagesTimeout: ko.PureComputed<SelfDeletingTimeout>;
  public readonly isAppLockEnabled: ko.PureComputed<boolean>;
  public readonly isAppLockEnforced: ko.PureComputed<boolean>;
  public readonly appLockInactivityTimeoutSecs: ko.PureComputed<number>;
  readonly teamMembers: ko.PureComputed<User[]>;
  readonly teamUsers: ko.PureComputed<User[]>;
  readonly isTeam: ko.PureComputed<boolean>;
  readonly team: ko.Observable<TeamEntity>;
  readonly teamDomain: ko.PureComputed<string>;
  readonly teamSize: ko.PureComputed<number>;

  constructor(private readonly userState = container.resolve(UserState)) {
    this.team = ko.observable();

    this.isTeam = ko.pureComputed(() => !!this.team()?.id);
    this.isTeamDeleted = ko.observable(false);

    /** Note: this does not include the self user */
    this.teamMembers = ko.pureComputed(() => (this.isTeam() ? this.team().members() : []));
    this.memberRoles = ko.observable({});
    this.memberInviters = ko.observable({});
    this.teamFeatures = ko.observable();

    this.teamDomain = ko.pureComputed(() => userState.self().domain);
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

    this.isFileSharingSendingEnabled = ko.pureComputed(() => {
      const status = this.teamFeatures()?.fileSharing?.status;
      return status ? status === FeatureStatus.ENABLED : true;
    });
    this.isFileSharingReceivingEnabled = ko.pureComputed(() => {
      const status = this.teamFeatures()?.fileSharing?.status;
      return status ? status === FeatureStatus.ENABLED : true;
    });

    this.classifiedDomains = ko.pureComputed(() => {
      return this.teamFeatures()?.classifiedDomains.status === FeatureStatus.ENABLED
        ? this.teamFeatures().classifiedDomains.config.domains
        : undefined;
    });

    this.isSelfDeletingMessagesEnabled = ko.pureComputed(
      () => this.teamFeatures()?.selfDeletingMessages?.status === FeatureStatus.ENABLED,
    );
    this.getEnforcedSelfDeletingMessagesTimeout = ko.pureComputed(
      () =>
        (this.teamFeatures()?.selfDeletingMessages?.config?.enforcedTimeoutSeconds || SelfDeletingTimeout.OFF) * 1000,
    );
    this.isSelfDeletingMessagesEnforced = ko.pureComputed(
      () => this.getEnforcedSelfDeletingMessagesTimeout() > SelfDeletingTimeout.OFF,
    );

    this.isVideoCallingEnabled = ko.pureComputed(
      // TODO connect to video calling feature config
      () => true || this.teamFeatures()?.videoCalling?.status === FeatureStatus.ENABLED,
    );

    this.isMLSEnabled = ko.pureComputed(() => this.teamFeatures()?.mls?.status === FeatureStatus.ENABLED ?? false);

    this.isProtocolToggleEnabledForUser = ko.pureComputed(
      () => this.teamFeatures()?.mls?.config.protocolToggleUsers.includes(this.userState.self().id) ?? false,
    );

    this.isConferenceCallingEnabled = ko.pureComputed(
      () => this.teamFeatures()?.conferenceCalling?.status === FeatureStatus.ENABLED,
    );
    this.isAppLockEnabled = ko.pureComputed(() => this.teamFeatures()?.appLock?.status === FeatureStatus.ENABLED);
    this.isAppLockEnforced = ko.pureComputed(() => this.teamFeatures()?.appLock?.config?.enforceAppLock);
    this.appLockInactivityTimeoutSecs = ko.pureComputed(
      () => this.teamFeatures()?.appLock?.config?.inactivityTimeoutSecs,
    );
    this.isGuestLinkEnabled = ko.pureComputed(
      () => this.teamFeatures()?.conversationGuestLinks?.status === FeatureStatus.ENABLED,
    );
  }

  readonly isExternal = (userId: string): boolean => {
    return this.memberRoles()[userId] === ROLE.PARTNER;
  };
}
