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
import {t} from 'Util/LocalizerUtil';

import {ModalsViewModel} from '../ModalsViewModel';
import {WebAppEvents} from '../../event/WebApp';

class TemporaryGuestViewModel {
  /**
   * View model for the temporary guest experience.
   *
   * @param {MainViewModel} mainViewModel Main view model
   * @param {z.viewModel.ListViewModel} listViewModel List view model
   * @param {Object} repositories Object containing all repositories
   */
  constructor(mainViewModel, listViewModel, repositories) {
    this.conversationRepository = repositories.conversation;
    this.userRepository = repositories.user;
    this.callingRepository = repositories.calling;
    this.multitasking = mainViewModel.content.multitasking;
    this.permissionRepository = repositories.permission;
    this.videoGridRepository = repositories.videoGrid;
    this.callingViewModel = mainViewModel.calling;

    this.logger = getLogger('TemporaryGuestViewModel');

    this.selfUser = this.userRepository.self;
  }

  clickOnPreferencesButton() {
    amplify.publish(WebAppEvents.PREFERENCES.MANAGE_ACCOUNT);
  }

  clickToCreateAccount() {
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
  }

  isSelectedConversation() {
    return true;
  }
}

export {TemporaryGuestViewModel};
