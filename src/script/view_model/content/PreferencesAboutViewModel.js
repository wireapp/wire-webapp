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

import {getLogger} from 'Util/Logger';
import {Config} from '../../Config';

import {getPrivacyPolicyUrl, getTermsOfUsePersonalUrl, getTermsOfUseTeamUrl, getWebsiteUrl} from '../../externalRoute';

window.z = window.z || {};
window.z.viewModel = z.viewModel || {};
window.z.viewModel.content = z.viewModel.content || {};

z.viewModel.content.PreferencesAboutViewModel = class PreferencesAboutViewModel {
  constructor(mainViewModel, contentViewModel, repositories) {
    this.logger = getLogger('z.viewModel.content.PreferencesAboutViewModel');

    this.userRepository = repositories.user;
    this.selfUser = this.userRepository.self;
    this.Config = Config.getConfig();

    this.websiteUrl = getWebsiteUrl();
    this.privacyPolicyUrl = getPrivacyPolicyUrl();
    this.termsOfUseUrl = ko.pureComputed(() => {
      if (this.selfUser()) {
        return this.selfUser().inTeam() ? getTermsOfUseTeamUrl() : getTermsOfUsePersonalUrl();
      }
    });
  }

  showWireSection() {
    return this.termsOfUseUrl() || this.websiteUrl || this.privacyPolicyUrl;
  }

  showSupportSection() {
    return this.Config.URL.SUPPORT.INDEX || this.Config.URL.SUPPORT.CONTACT;
  }
};
