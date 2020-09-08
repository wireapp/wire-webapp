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

import {sortUsersByPriority} from 'Util/StringUtil';

import type {ConversationRepository} from '../../conversation/ConversationRepository';
import type {User} from '../../entity/User';
import {MotionDuration} from '../../motion/MotionDuration';
import type {SearchRepository} from '../../search/SearchRepository';
import type {TeamRepository} from '../../team/TeamRepository';
import {PanelViewModel} from '../PanelViewModel';
import type {PanelParams} from '../PanelViewModel';
import {BasePanelViewModel, PanelViewModelProps} from './BasePanelViewModel';

export class ConversationParticipantsViewModel extends BasePanelViewModel {
  searchRepository: SearchRepository;
  teamRepository: TeamRepository;
  conversationRepository: ConversationRepository;
  participants: ko.PureComputed<User[]>;
  highlightedUsers: ko.Observable<User[]>;
  searchInput: ko.Observable<string>;
  MotionDuration: typeof MotionDuration;
  constructor(params: PanelViewModelProps) {
    super(params);
    this.clickOnShowUser = this.clickOnShowUser.bind(this);

    const repositories = params.repositories;
    this.searchRepository = repositories.search;
    this.teamRepository = repositories.team;
    this.conversationRepository = repositories.conversation;

    this.participants = ko.pureComputed(() => {
      if (this.activeConversation()) {
        const users = this.activeConversation()
          .participating_user_ets()
          .filter((userEntity: User) => !userEntity.isService);
        if (!this.activeConversation().removed_from_conversation()) {
          users.push(this.activeConversation().selfUser());
          return users.sort(sortUsersByPriority);
        }
        return users;
      }
      return [];
    });

    this.highlightedUsers = ko.observable([]);

    this.searchInput = ko.observable('');
    this.MotionDuration = MotionDuration;
  }

  getElementId(): string {
    return 'conversation-participants';
  }

  clickOnShowUser(userEntity: User): void {
    this.navigateTo(PanelViewModel.STATE.GROUP_PARTICIPANT_USER, {entity: userEntity});
  }

  initView({highlighted}: PanelParams = {highlighted: []}): void {
    this.searchInput('');
    this.highlightedUsers(highlighted);
  }
}
