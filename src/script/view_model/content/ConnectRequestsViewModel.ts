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
import {scrollToBottom} from 'Util/scroll-helpers';
import {isLastItem} from 'Util/ArrayUtil';

import {AVATAR_SIZE} from 'Components/ParticipantAvatar';
import {MainViewModel} from '../MainViewModel';
import {ActionsViewModel} from '../ActionsViewModel';
import {User} from '../../entity/User';
import {container} from 'tsyringe';
import {UserState} from '../../user/UserState';

export class ConnectRequestsViewModel {
  actionsViewModel: ActionsViewModel;
  connectRequests: ko.Computed<User[]>;
  AVATAR_SIZE: typeof AVATAR_SIZE;
  shouldUpdateScrollbar: ko.Computed<User[]>;

  constructor(
    private readonly mainViewModel: MainViewModel,
    private readonly userState = container.resolve(UserState),
  ) {
    this.actionsViewModel = this.mainViewModel.actions;
    this.connectRequests = this.userState.connectRequests;
    this.AVATAR_SIZE = AVATAR_SIZE;

    this.shouldUpdateScrollbar = ko.computed(() => this.connectRequests()).extend({notify: 'always', rateLimit: 500});
  }

  afterRender = (elements: Object, request: User): void => {
    if (isLastItem(this.connectRequests(), request)) {
      window.requestAnimationFrame(() => scrollToBottom(document.querySelector('.connect-requests')));
    }
  };

  clickOnAccept = (userEntity: User): void => {
    const showConversation = this.connectRequests().length === 1;
    this.actionsViewModel.acceptConnectionRequest(userEntity, showConversation);
  };

  clickOnIgnore = (userEntity: User): void => {
    this.actionsViewModel.ignoreConnectionRequest(userEntity);
  };
}
