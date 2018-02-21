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
window.z.viewModel.list = z.viewModel.list || {};

z.viewModel.list.PreferencesListViewModel = class PreferencesListViewModel {
  /**
   * View model for the preferences list.
   * @param {z.viewModel.ListViewModel} mainViewModel - Main view model
   */
  constructor(mainViewModel) {
    this.list_view_model = mainViewModel.list;
    this.content_view_model = mainViewModel.content;
    this.logger = new z.util.Logger('z.viewModel.list.PreferencesListViewModel', z.config.LOGGER.OPTIONS);

    this.preferences_state = this.content_view_model.content_state;
    this.should_update_scrollbar = ko
      .computed(() => this.list_view_model.last_update())
      .extend({notify: 'always', rateLimit: 500});

    this.selected_about = ko.pureComputed(
      () => this.preferences_state() === z.viewModel.content.CONTENT_STATE.PREFERENCES_ABOUT
    );
    this.selected_account = ko.pureComputed(
      () => this.preferences_state() === z.viewModel.content.CONTENT_STATE.PREFERENCES_ACCOUNT
    );
    this.selected_av = ko.pureComputed(
      () => this.preferences_state() === z.viewModel.content.CONTENT_STATE.PREFERENCES_AV
    );
    this.selected_devices = ko.pureComputed(() =>
      [
        z.viewModel.content.CONTENT_STATE.PREFERENCES_DEVICE_DETAILS,
        z.viewModel.content.CONTENT_STATE.PREFERENCES_DEVICES,
      ].includes(this.preferences_state())
    );
    this.selected_options = ko.pureComputed(
      () => this.preferences_state() === z.viewModel.content.CONTENT_STATE.PREFERENCES_OPTIONS
    );
  }

  click_on_close_preferences() {
    this.list_view_model.switch_list(z.viewModel.list.LIST_STATE.CONVERSATIONS);
  }

  click_on_about() {
    this.content_view_model.switch_content(z.viewModel.content.CONTENT_STATE.PREFERENCES_ABOUT);
  }

  click_on_account() {
    this.content_view_model.switch_content(z.viewModel.content.CONTENT_STATE.PREFERENCES_ACCOUNT);
  }

  click_on_av() {
    this.content_view_model.switch_content(z.viewModel.content.CONTENT_STATE.PREFERENCES_AV);
  }

  click_on_devices() {
    this.content_view_model.switch_content(z.viewModel.content.CONTENT_STATE.PREFERENCES_DEVICES);
  }

  click_on_options() {
    this.content_view_model.switch_content(z.viewModel.content.CONTENT_STATE.PREFERENCES_OPTIONS);
  }
};
