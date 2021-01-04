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

import {amplify} from 'amplify';
import {container} from 'tsyringe';
import {WebAppEvents} from '@wireapp/webapp-events';
import ko from 'knockout';

import {t} from 'Util/LocalizerUtil';

import {Config} from '../../Config';
import {ModalsViewModel} from '../ModalsViewModel';
import {UserState} from '../../user/UserState';
import type {CallingRepository} from '../../calling/CallingRepository';
import type {CallingViewModel} from '../CallingViewModel';
import type {MainViewModel} from '../MainViewModel';
import type {Multitasking} from '../../notification/NotificationRepository';
import type {TeamRepository} from '../../team/TeamRepository';
import type {User} from '../../entity/User';

export class TemporaryGuestViewModel {
  readonly multitasking: Multitasking;
  readonly callingViewModel: CallingViewModel;
  readonly selfUser: ko.Observable<User>;
  readonly isAccountCreationEnabled: boolean;

  constructor(
    mainViewModel: MainViewModel,
    readonly callingRepository: CallingRepository,
    readonly teamRepository: TeamRepository,
    private readonly userState = container.resolve(UserState),
  ) {
    this.multitasking = mainViewModel.multitasking;
    this.callingViewModel = mainViewModel.calling;
    this.selfUser = this.userState.self;
    this.isAccountCreationEnabled = Config.getConfig().FEATURE.ENABLE_ACCOUNT_REGISTRATION;
  }

  readonly clickOnPreferencesButton = (): void => {
    amplify.publish(WebAppEvents.PREFERENCES.MANAGE_ACCOUNT);
  };

  readonly clickToCreateAccount = (): void => {
    amplify.publish(WebAppEvents.WARNING.MODAL, ModalsViewModel.TYPE.CONFIRM, {
      preventClose: true,
      primaryAction: {
        action: () => window.location.replace(`/auth/${location.search}`),
        text: t('modalAccountCreateAction'),
      },
      text: {
        message: t('modalAccountCreateMessage'),
        title: t('modalAccountCreateHeadline'),
      },
    });
  };

  readonly isSelectedConversation = (): true => {
    return true;
  };
}
