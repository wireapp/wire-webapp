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
window.z.viewModel = z.viewModel || {};

z.viewModel.DarkModeViewModel = class DarkModeViewModel {
  constructor(mainViewModel, repositories) {
    this.propertiesRepository = repositories.properties;

    this.isDarkMode = ko.observable(undefined);
    this.isTransitioning = ko.observable(undefined);
    this.setTheme = this.setTheme.bind(this);

    amplify.subscribe(z.event.WebApp.PROPERTIES.UPDATE.APPEARANCE.DARK, this.setTheme);
    amplify.subscribe(z.event.WebApp.PROPERTIES.UPDATED, properties => {
      this.setTheme(properties.settings.appearance.dark);
    });

    ko.applyBindings(this, document.getElementsByTagName('head')[0]);
  }

  setTheme(newPreference) {
    this.isTransitioning(true);
    this.isDarkMode(newPreference);

    const ANIMATION_DURATION = 250;
    setTimeout(() => this.isTransitioning(false), ANIMATION_DURATION);
  }
};
