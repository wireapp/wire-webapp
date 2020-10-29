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

import {WebAppEvents} from '@wireapp/webapp-events';
import ko from 'knockout';
import {amplify} from 'amplify';

import {Config} from '../../Config';
import {getSupportUsernameUrl} from '../../externalRoute';
import {ContentViewModel} from '../ContentViewModel';
import type {UserRepository} from '../../user/UserRepository';
import type {ConversationRepository} from '../../conversation/ConversationRepository';
import type {ListViewModel} from '../ListViewModel';
import type {User} from '../../entity/User';
import {container} from 'tsyringe';
import {UserState} from '../../user/UserState';

export class TakeoverViewModel {
  readonly brandName: string;
  readonly supportUsernameUrl: string;
  readonly name: ko.PureComputed<string>;
  readonly username: ko.PureComputed<string>;
  private readonly selfUser: ko.Observable<User>;

  constructor(
    private readonly listViewModel: ListViewModel,
    private readonly userRepository: UserRepository,
    private readonly conversationRepository: ConversationRepository,
    private readonly userState = container.resolve(UserState),
  ) {
    this.listViewModel = listViewModel;
    this.selfUser = this.userState.self;

    this.name = ko.pureComputed(() => (this.selfUser() ? this.selfUser().name() : ''));
    this.username = ko.pureComputed(() => (this.selfUser() ? this.selfUser().username() : ''));
    this.supportUsernameUrl = getSupportUsernameUrl();
    this.brandName = Config.getConfig().BRAND_NAME;
  }

  chooseUsername = (): void => {
    this.listViewModel.dismissModal();
    window.requestAnimationFrame(() => amplify.publish(WebAppEvents.PREFERENCES.MANAGE_ACCOUNT));
  };

  keepUsername = async (): Promise<boolean | void> => {
    try {
      await this.userRepository.changeUsername(this.username());
      const conversationEntity = this.conversationRepository.getMostRecentConversation();
      if (conversationEntity) {
        return amplify.publish(WebAppEvents.CONVERSATION.SHOW, conversationEntity);
      }

      if (this.userState.connectRequests().length) {
        amplify.publish(WebAppEvents.CONTENT.SWITCH, ContentViewModel.STATE.CONNECTION_REQUESTS);
      }
    } catch (error) {
      amplify.publish(WebAppEvents.PREFERENCES.MANAGE_ACCOUNT);
    } finally {
      this.listViewModel.dismissModal();
    }
  };
}
