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

'use strict';

window.z = window.z || {};
window.z.ViewModel = z.ViewModel || {};
window.z.ViewModel.content = z.ViewModel.content || {};

z.ViewModel.content.PreferencesAboutViewModel = class PreferencesAboutViewModel {
  constructor(element_id, userRepository) {
    this.logger = new z.util.Logger('z.ViewModel.content.PreferencesAboutViewModel', z.config.LOGGER.OPTIONS);

    this.userRepository = userRepository;
    this.selfUser = this.userRepository.self;
  }

  clickOnToU() {
    const path = `${z.config.URL_PATH.TERMS_OF_USE}${this.selfUser().is_team_member() ? 'teams' : 'personal'}/`;
    z.util.safe_window_open(z.util.URLUtil.build_url(z.util.URLUtil.TYPE.WEBSITE, path));
  }
};
