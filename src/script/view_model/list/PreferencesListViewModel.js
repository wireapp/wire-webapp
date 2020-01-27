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
import {Environment} from 'Util/Environment';

import {ContentViewModel} from '../ContentViewModel';

class PreferencesListViewModel {
  /**
   * View model for the preferences list.
   * @param {ContentViewModel} contentViewModel content view model
   * @param {z.viewModel.ListViewModel} listViewModel List view model
   * @param {UserRepository} userRepository Repository managing users
   * @param {CallingRepository} callingRepository Repository managing calls
   */
  constructor(contentViewModel, listViewModel, userRepository, callingRepository) {
    this.listViewModel = listViewModel;
    this.userRepository = userRepository;
    this.logger = getLogger('PreferencesListViewModel');

    this.contentViewModel = contentViewModel;
    this.contentState = this.contentViewModel.state;
    this.isActivatedAccount = this.userRepository.isActivatedAccount;
    this.Environment = Environment;

    this.supportsCalling = callingRepository.supportsCalling;

    this.selectedAbout = ko.pureComputed(() => this.contentState() === ContentViewModel.STATE.PREFERENCES_ABOUT);
    this.selectedAccount = ko.pureComputed(() => this.contentState() === ContentViewModel.STATE.PREFERENCES_ACCOUNT);
    this.selectedAV = ko.pureComputed(() => this.contentState() === ContentViewModel.STATE.PREFERENCES_AV);
    this.selectedDevices = ko.pureComputed(() => {
      const devicesState = [
        ContentViewModel.STATE.PREFERENCES_DEVICE_DETAILS,
        ContentViewModel.STATE.PREFERENCES_DEVICES,
      ];
      return devicesState.includes(this.contentState());
    });
    this.selectedOptions = ko.pureComputed(() => this.contentState() === ContentViewModel.STATE.PREFERENCES_OPTIONS);
  }

  clickOnClosePreferences() {
    const preventingContentViewStates = [ContentViewModel.STATE.HISTORY_EXPORT, ContentViewModel.STATE.HISTORY_IMPORT];

    if (!preventingContentViewStates.includes(this.contentState())) {
      if (!this.isActivatedAccount()) {
        return this.listViewModel.showTemporaryGuest();
      }
      this.listViewModel.switchList(z.viewModel.ListViewModel.STATE.CONVERSATIONS);
    }
  }

  clickOnAbout() {
    this._switchContent(ContentViewModel.STATE.PREFERENCES_ABOUT);
  }

  clickOnAccount() {
    this._switchContent(ContentViewModel.STATE.PREFERENCES_ACCOUNT);
  }

  clickOnAV() {
    this._switchContent(ContentViewModel.STATE.PREFERENCES_AV);
  }

  clickOnDevices() {
    this._switchContent(ContentViewModel.STATE.PREFERENCES_DEVICES);
  }

  clickOnOptions() {
    this._switchContent(ContentViewModel.STATE.PREFERENCES_OPTIONS);
  }

  _switchContent(newContentState) {
    this.contentViewModel.switchContent(newContentState);
  }
}

export {PreferencesListViewModel};
