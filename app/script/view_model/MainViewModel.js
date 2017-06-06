/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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

z.ViewModel.MainViewModel = class MainViewModel {
  constructor(element_id, user_repository) {
    this.user_repository = user_repository;
    this.logger = new z.util.Logger(
      'z.ViewModel.MainViewModel',
      z.config.LOGGER.OPTIONS
    );

    this.user = this.user_repository.self;

    this.main_classes = ko.pureComputed(() => {
      if (this.user()) {
        // deprecated - still used on input control hover
        return `main-accent-color-${this.user().accent_id()} ${this.user().accent_theme()} show`;
      }
    });

    ko.applyBindings(this, document.getElementById(element_id));
  }
};
