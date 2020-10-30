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

import {ContentViewModel} from '../ContentViewModel';
import {ListViewModel} from '../ListViewModel';
import type {CallingRepository} from 'src/script/calling/CallingRepository';
import {Runtime} from '@wireapp/commons';
import {container} from 'tsyringe';
import {UserState} from '../../user/UserState';

export class PreferencesListViewModel {
  contentState: ko.Observable<string>;
  isActivatedAccount: ko.PureComputed<boolean>;
  isDesktop: boolean;
  supportsCalling: boolean;
  selectedAbout: ko.PureComputed<boolean>;
  selectedAccount: ko.PureComputed<boolean>;
  selectedAV: ko.PureComputed<boolean>;
  selectedDevices: ko.PureComputed<boolean>;
  selectedOptions: ko.PureComputed<boolean>;

  constructor(
    private readonly contentViewModel: ContentViewModel,
    private readonly listViewModel: ListViewModel,
    callingRepository: CallingRepository,
    private readonly userState = container.resolve(UserState),
  ) {
    this.listViewModel = listViewModel;

    this.contentViewModel = contentViewModel;
    this.contentState = this.contentViewModel.state;
    this.isActivatedAccount = this.userState.isActivatedAccount;
    this.isDesktop = Runtime.isDesktopApp();

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

  clickOnClosePreferences = (): void => {
    const preventingContentViewStates = [ContentViewModel.STATE.HISTORY_EXPORT, ContentViewModel.STATE.HISTORY_IMPORT];

    if (!preventingContentViewStates.includes(this.contentState())) {
      if (!this.isActivatedAccount()) {
        return this.listViewModel.showTemporaryGuest();
      }
      this.listViewModel.switchList(ListViewModel.STATE.CONVERSATIONS);
    }
  };

  clickOnAbout = (): void => {
    this._switchContent(ContentViewModel.STATE.PREFERENCES_ABOUT);
  };

  clickOnAccount = (): void => {
    this._switchContent(ContentViewModel.STATE.PREFERENCES_ACCOUNT);
  };

  clickOnAV = (): void => {
    this._switchContent(ContentViewModel.STATE.PREFERENCES_AV);
  };

  clickOnDevices = (): void => {
    this._switchContent(ContentViewModel.STATE.PREFERENCES_DEVICES);
  };

  clickOnOptions = (): void => {
    this._switchContent(ContentViewModel.STATE.PREFERENCES_OPTIONS);
  };

  private readonly _switchContent = (newContentState: string): void => {
    this.contentViewModel.switchContent(newContentState);
  };
}
