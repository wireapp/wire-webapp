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
window.z.viewModel.list = z.viewModel.list || {};

z.viewModel.list.PreferencesListViewModel = class PreferencesListViewModel {
  /**
   * View model for the preferences list.
   * @param {z.viewModel.ListViewModel} mainViewModel - Main view model
   * @param {z.viewModel.ListViewModel} listViewModel - List view model
   * @param {Object} repositories - Object containing all the repositories
   */
  constructor(mainViewModel, listViewModel, repositories) {
    this.mainViewModel = mainViewModel;
    this.listViewModel = listViewModel;
    this.userRepository = repositories.user;
    this.logger = new z.util.Logger('z.viewModel.list.PreferencesListViewModel', z.config.LOGGER.OPTIONS);

    this.contentViewModel = this.mainViewModel.content;
    this.contentState = this.contentViewModel.state;
    this.isActivatedAccount = this.userRepository.isActivatedAccount;

    this.selectedAbout = ko.pureComputed(() => {
      return this.contentState() === z.viewModel.ContentViewModel.STATE.PREFERENCES_ABOUT;
    });
    this.selectedAccount = ko.pureComputed(() => {
      return this.contentState() === z.viewModel.ContentViewModel.STATE.PREFERENCES_ACCOUNT;
    });
    this.selectedAV = ko.pureComputed(() => {
      return this.contentState() === z.viewModel.ContentViewModel.STATE.PREFERENCES_AV;
    });
    this.selectedDevices = ko.pureComputed(() => {
      const devicesState = [
        z.viewModel.ContentViewModel.STATE.PREFERENCES_DEVICE_DETAILS,
        z.viewModel.ContentViewModel.STATE.PREFERENCES_DEVICES,
      ];
      return devicesState.includes(this.contentState());
    });
    this.selectedOptions = ko.pureComputed(() => {
      return this.contentState() === z.viewModel.ContentViewModel.STATE.PREFERENCES_OPTIONS;
    });
  }

  clickOnClosePreferences() {
    const preventingContentViewStates = [
      z.viewModel.ContentViewModel.STATE.HISTORY_EXPORT,
      z.viewModel.ContentViewModel.STATE.HISTORY_IMPORT,
    ];

    if (!preventingContentViewStates.includes(this.contentState())) {
      if (!this.isActivatedAccount()) {
        return this.listViewModel.showTemporaryGuest();
      }
      this.listViewModel.switchList(z.viewModel.ListViewModel.STATE.CONVERSATIONS);
    }
  }

  clickOnAbout() {
    this._switchContent(z.viewModel.ContentViewModel.STATE.PREFERENCES_ABOUT);
  }

  clickOnAccount() {
    this._switchContent(z.viewModel.ContentViewModel.STATE.PREFERENCES_ACCOUNT);
  }

  clickOnAV() {
    this._switchContent(z.viewModel.ContentViewModel.STATE.PREFERENCES_AV);
  }

  clickOnDevices() {
    this._switchContent(z.viewModel.ContentViewModel.STATE.PREFERENCES_DEVICES);
  }

  clickOnOptions() {
    this._switchContent(z.viewModel.ContentViewModel.STATE.PREFERENCES_OPTIONS);
  }

  _switchContent(newContentState) {
    this.contentViewModel.switchContent(newContentState);
  }
};
