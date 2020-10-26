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

import {noop} from 'Util/util';

import {AVATAR_SIZE} from 'Components/ParticipantAvatar';
import {generateCellState} from '../../conversation/ConversationCellState';
import {ConversationStatusIcon} from '../../conversation/ConversationStatusIcon';
import type {Conversation} from '../../entity/Conversation';
import {MediaType} from '../../media/MediaType';
import {viewportObserver} from '../../ui/viewportObserver';

import 'Components/availabilityState';
import type {User} from '../../entity/User';

interface ConversationListCellProps {
  click: () => void;
  conversation: Conversation;
  index: ko.Observable<number>;
  is_selected: (conversation: Conversation) => boolean;
  isVisibleFunc: (top: number, bottom: number) => boolean;
  offsetTop: ko.Observable<number>;
  onJoinCall: (conversation: Conversation, mediaType: MediaType) => void;
  showJoinButton: boolean;
}

class ConversationListCell {
  conversation: Conversation;
  isSelected: ko.Computed<boolean>;
  on_click: () => void;
  AVATAR_SIZE: typeof AVATAR_SIZE;
  showJoinButton: boolean;
  isGroup: boolean;
  is1To1: boolean;
  isInTeam: boolean;
  isInViewport: ko.Observable<boolean>;
  users: ko.ObservableArray<User>;
  cell_state: ko.Observable<ReturnType<typeof generateCellState>>;
  ConversationStatusIcon: typeof ConversationStatusIcon;
  onClickJoinCall: (viewModel: ConversationListCell, event: MouseEvent) => void;
  dispose: () => void;
  constructor(
    {
      showJoinButton,
      conversation,
      onJoinCall,
      is_selected = () => false,
      click = noop,
      index = ko.observable(0),
      isVisibleFunc = () => false,
      offsetTop = ko.observable(0),
    }: ConversationListCellProps,
    element: HTMLElement,
  ) {
    this.conversation = conversation;
    this.isSelected = ko.computed(() => is_selected(conversation));
    // TODO: "click" should be renamed to "right_click"
    this.on_click = click;
    this.AVATAR_SIZE = AVATAR_SIZE;
    this.showJoinButton = showJoinButton;
    this.isGroup = conversation.isGroup();
    this.is1To1 = conversation.is1to1();
    this.isInTeam = conversation.selfUser().inTeam();

    const cellHeight = 56;
    const cellTop = index() * cellHeight + offsetTop();
    const cellBottom = cellTop + cellHeight;

    /*
     *  We did use getBoundingClientRect to determine the initial visibility
     *  of an element, but this proved to be a major bottleneck with lots
     *  of <conversation-list-cell>s
     */
    const isInitiallyVisible = isVisibleFunc(cellTop, cellBottom);

    this.isInViewport = ko.observable(isInitiallyVisible);

    if (!isInitiallyVisible) {
      viewportObserver.trackElement(
        element,
        (isInViewport: boolean) => {
          if (isInViewport) {
            this.isInViewport(true);
            viewportObserver.removeElement(element);
          }
        },
        false,
        undefined,
      );
    }

    this.users = this.conversation.participating_user_ets;

    this.cell_state = ko.observable({description: null, icon: null});

    this.ConversationStatusIcon = ConversationStatusIcon;

    this.onClickJoinCall = (viewModel, event) => {
      event.preventDefault();
      onJoinCall(conversation, MediaType.AUDIO);
    };

    const cellStateObservable = ko
      .computed(() => this.cell_state(generateCellState(this.conversation)))
      .extend({rateLimit: 500});

    this.dispose = () => {
      viewportObserver.removeElement(element);
      cellStateObservable.dispose();
      this.isSelected.dispose();
    };
  }
}

ko.components.register('conversation-list-cell', {
  template: `
    <div class="conversation-list-cell" data-bind="attr: {'data-uie-uid': conversation.id, 'data-uie-value': conversation.display_name()}, css: {'conversation-list-cell-active': isSelected()}">
    <!-- ko if: isInViewport() -->
      <div class="conversation-list-cell-left" data-bind="css: {'conversation-list-cell-left-opaque': conversation.removed_from_conversation() || conversation.participating_user_ids().length === 0}">
        <!-- ko if: isGroup -->
          <group-avatar class="conversation-list-cell-avatar-arrow" params="users: users(), conversation: conversation"></group-avatar>
        <!-- /ko -->
        <!-- ko if: !isGroup && users().length -->
          <div class="avatar-halo">
            <participant-avatar params="participant: users()[0], size: AVATAR_SIZE.SMALL"></participant-avatar>
          </div>
        <!-- /ko -->
      </div>
      <div class="conversation-list-cell-center">
        <!-- ko if: is1To1 && isInTeam -->
          <availability-state class="conversation-list-cell-availability"
                              data-uie-name="status-availability-item"
                              params="availability: conversation.availabilityOfUser, label: conversation.display_name(), theme: isSelected()">
          </availability-state>
        <!-- /ko -->
        <!-- ko ifnot: is1To1 && isInTeam -->
          <span class="conversation-list-cell-name" data-bind="text: conversation.display_name(), css: {'accent-text': isSelected()}"></span>
        <!-- /ko -->
        <span class="conversation-list-cell-description" data-bind="text: cell_state().description" data-uie-name="secondary-line"></span>
      </div>
      <div class="conversation-list-cell-right">
        <span class="conversation-list-cell-context-menu" data-bind="click: (_, event) => on_click(conversation, event)" data-uie-name="go-options"></span>
        <!-- ko ifnot: showJoinButton -->
          <!-- ko if: cell_state().icon === ConversationStatusIcon.PENDING_CONNECTION -->
            <span class="conversation-list-cell-badge cell-badge-dark" data-uie-name="status-pending"><pending-icon class="svg-icon"></pending-icon></span>
          <!-- /ko -->
          <!-- ko if: cell_state().icon === ConversationStatusIcon.UNREAD_MENTION -->
            <span class="conversation-list-cell-badge cell-badge-light" data-uie-name="status-mention"><mention-icon class="svg-icon"></mention-icon></span>
          <!-- /ko -->
          <!-- ko if: cell_state().icon === ConversationStatusIcon.UNREAD_REPLY -->
            <span class="conversation-list-cell-badge cell-badge-light" data-uie-name="status-reply"><reply-icon class="svg-icon"></reply-icon></span>
          <!-- /ko -->
          <!-- ko if: cell_state().icon === ConversationStatusIcon.UNREAD_PING -->
            <span class="conversation-list-cell-badge cell-badge-light" data-uie-name="status-ping"><ping-icon class="svg-icon"></ping-icon></span>
          <!-- /ko -->
          <!-- ko if: cell_state().icon === ConversationStatusIcon.MISSED_CALL -->
            <span class="conversation-list-cell-badge cell-badge-light" data-uie-name="status-missed-call"><hangup-icon class="svg-icon"></hangup-icon></span>
          <!-- /ko -->
          <!-- ko if: cell_state().icon === ConversationStatusIcon.MUTED -->
            <span class="conversation-list-cell-badge cell-badge-dark conversation-muted" data-uie-name="status-silence"><mute-icon class="svg-icon"></mute-icon></span>
          <!-- /ko -->
          <!-- ko if: cell_state().icon === ConversationStatusIcon.UNREAD_MESSAGES && conversation.unreadState().allMessages.length > 0 -->
            <span class="conversation-list-cell-badge cell-badge-light" data-bind="text: conversation.unreadState().allMessages.length" data-uie-name="status-unread"></span>
          <!-- /ko -->
        <!-- /ko -->
        <!-- ko if: showJoinButton -->
          <div class="call-ui__button call-ui__button--green call-ui__button--join" data-bind="click: onClickJoinCall, text: t('callJoin')" data-uie-name="do-call-controls-call-join"></div>
        <!-- /ko -->
      </div>
      <!-- /ko -->
    </div>
  `,
  viewModel: {
    createViewModel: (props: ConversationListCellProps, componentInfo: any) =>
      new ConversationListCell(props, componentInfo.element),
  },
});
