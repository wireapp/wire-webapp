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
import {container, singleton} from 'tsyringe';
import {FeatureStatus} from '@wireapp/api-client/src/team/feature/';

import {TeamState} from '../team/TeamState';

const defaultEnabled = true;
const defaultEnforced = false;
const defaultTimeoutSecs = 10;

@singleton()
export class AppLockState {
  public readonly isAppLockAvailable: ko.PureComputed<boolean>;
  public readonly isAppLockEnforced: ko.PureComputed<boolean>;
  public readonly isAppLockActivated: ko.PureComputed<boolean>;
  public readonly appLockInactivityTimeoutSecs: ko.PureComputed<number>;
  public readonly isAppLockEnabled: ko.PureComputed<boolean>;
  public readonly hasPassphrase: ko.Observable<boolean>;
  public readonly isActivatedInPreferences: ko.Observable<boolean>;

  constructor(teamState = container.resolve(TeamState)) {
    this.isAppLockAvailable = ko.pureComputed(() =>
      teamState.isTeam() ? teamState.teamFeatures()?.appLock?.status === FeatureStatus.ENABLED : defaultEnabled,
    );

    this.isAppLockEnforced = ko.pureComputed(
      () =>
        this.isAppLockAvailable() &&
        (teamState.isTeam() ? teamState.teamFeatures()?.appLock?.config?.enforceAppLock : defaultEnforced),
    );

    this.appLockInactivityTimeoutSecs = ko.pureComputed(() =>
      teamState.isTeam() ? teamState.teamFeatures()?.appLock?.config?.inactivityTimeoutSecs : defaultTimeoutSecs,
    );

    this.isAppLockActivated = ko.pureComputed(() => this.isAppLockEnabled() && this.hasPassphrase());
    this.hasPassphrase = ko.observable(false);
    this.isActivatedInPreferences = ko.observable(false);
    this.isAppLockEnabled = ko.pureComputed(() => this.isAppLockEnforced() || this.isActivatedInPreferences());
  }
}
