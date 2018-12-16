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

window.z = window.z || {};
window.z.viewModel = z.viewModel || {};
window.z.viewModel.content = z.viewModel.content || {};

z.viewModel.content.PreferencesAboutViewModel = class PreferencesAboutViewModel {
  constructor(mainViewModel, contentViewModel, repositories) {
    this.logger = new z.util.Logger('z.viewModel.content.PreferencesAboutViewModel', z.config.LOGGER.OPTIONS);

    this.userRepository = repositories.user;
    this.selfUser = this.userRepository.self;
  }

  getTermsOfUseUrl() {
    return this.selfUser().inTeam() ? z.config.URL.TERMS_OF_USE_TEAMS : z.config.URL.TERMS_OF_USE_PERSONAL;
  }

  getWebsiteUrl() {
    return z.config.URL.WEBSITE;
  }

  getPrivacyPolicyUrl() {
    return z.config.URL.PRIVACY_POLICY;
  }

  showWireSection() {
    return !!this.getTermsOfUseUrl() || !!this.getWebsiteUrl() || !!this.getPrivacyPolicyUrl();
  }

  getSupportUrl() {
    return z.config.URL.SUPPORT;
  }

  getSupportContactUrl() {
    return !!this.getSupportUrl() ? `${this.getSupportUrl()}/hc/en-us/requests/new` : undefined;
  }

  showSupportSection() {
    return !!this.getSupportUrl() || !!this.getSupportContactUrl();
  }
};
