/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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
import {Config, Configuration} from '../../Config';
import {getPrivacyPolicyUrl, getTermsOfUsePersonalUrl, getTermsOfUseTeamUrl, URL} from '../../externalRoute';
import {User} from '../../entity/User';
import {container} from 'tsyringe';
import {UserState} from '../../user/UserState';

export class PreferencesAboutViewModel {
  private readonly selfUser: ko.Observable<User>;
  readonly Config: Configuration;
  readonly websiteUrl: string;
  readonly privacyPolicyUrl: string;
  readonly termsOfUseUrl: ko.PureComputed<string>;

  constructor(private readonly userState = container.resolve(UserState)) {
    this.selfUser = this.userState.self;
    this.Config = Config.getConfig();

    this.websiteUrl = URL.WEBSITE;
    this.privacyPolicyUrl = getPrivacyPolicyUrl();
    this.termsOfUseUrl = ko.pureComputed(() => {
      if (this.selfUser()) {
        return this.selfUser().inTeam() ? getTermsOfUseTeamUrl() : getTermsOfUsePersonalUrl();
      }
      return '';
    });
  }

  showWireSection = (): boolean => {
    return !!(this.termsOfUseUrl() || this.websiteUrl || this.privacyPolicyUrl);
  };

  showSupportSection = (): boolean => {
    return !!(this.Config.URL.SUPPORT.INDEX || this.Config.URL.SUPPORT.CONTACT);
  };
}
