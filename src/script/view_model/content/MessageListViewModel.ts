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
import {groupBy} from 'underscore';
import {WebAppEvents} from '@wireapp/webapp-events';
import $ from 'jquery';
import ko from 'knockout';

import {getLogger, Logger} from 'Util/Logger';
import {safeWindowOpen, safeMailOpen} from 'Util/SanitizationUtil';
import {t} from 'Util/LocalizerUtil';

import {ActionsViewModel} from '../ActionsViewModel';
import {ContentMessage} from '../../entity/message/ContentMessage';
import {Conversation} from '../../entity/Conversation';
import {ConversationRepository} from '../../conversation/ConversationRepository';
import {ConversationState} from '../../conversation/ConversationState';
import {DecryptErrorMessage} from '../../entity/message/DecryptErrorMessage';
import {IntegrationRepository} from '../../integration/IntegrationRepository';
import {MainViewModel} from '../MainViewModel';
import {MemberMessage} from '../../entity/message/MemberMessage';
import {Message} from '../../entity/message/Message';
import {MessageCategory} from '../../message/MessageCategory';
import {ModalsViewModel} from '../ModalsViewModel';
import {MotionDuration} from '../../motion/MotionDuration';
import {PanelViewModel} from '../PanelViewModel';
import {ServerTimeHandler} from '../../time/serverTimeHandler';
import {Text} from '../../entity/message/Text';
import {User} from '../../entity/User';
import {UserError} from '../../error/UserError';
import {UserRepository} from '../../user/UserRepository';
import {UserState} from '../../user/UserState';
import type {MessageRepository} from '../../conversation/MessageRepository';

/*
 * Message list rendering view model.
 *
 * @todo Get rid of the participants dependencies whenever bubble implementation has changed
 * @todo Remove all jQuery selectors
 */
export class MessageListViewModel {
  private readonly logger: Logger;
  readonly actionsViewModel: ActionsViewModel;
  readonly selfUser: ko.Observable<User>;
  readonly initialMessage: ko.Observable<Message | undefined> = ko.observable();
  readonly conversation: ko.Observable<Conversation>;
  readonly conversationLoaded = ko.observable(false);
  private readonly readMessagesBuffer: ko.ObservableArray<{conversation: Conversation; message: Message}>;
  showInvitePeople: ko.PureComputed<boolean>;

  constructor(
    private readonly mainViewModel: MainViewModel,
    private readonly conversationRepository: ConversationRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly serverTimeHandler: ServerTimeHandler,
    private readonly userRepository: UserRepository,
    private readonly messageRepository: MessageRepository,
    private readonly userState = container.resolve(UserState),
    private readonly conversationState = container.resolve(ConversationState),
  ) {
    this.logger = getLogger('MessageListViewModel');

    this.actionsViewModel = this.mainViewModel.actions;
    this.selfUser = this.userState.self;

    this.conversation = ko.observable(new Conversation());

    // this buffer will collect all the read messages and send a read receipt in batch
    this.readMessagesBuffer = ko.observableArray();

    this.readMessagesBuffer
      .extend({rateLimit: {method: 'notifyWhenChangesStop', timeout: 500}})
      .subscribe(readMessages => {
        if (readMessages.length) {
          const groupedMessages = groupBy(readMessages, ({conversation, message}) => conversation.id + message.from);
          Object.values(groupedMessages).forEach(readMessagesBatch => {
            const {conversation, message: firstMessage} = readMessagesBatch.pop();
            const otherMessages = readMessagesBatch.map(({message}) => message);
            this.messageRepository.sendReadReceipt(conversation, firstMessage, otherMessages);
          });
          this.readMessagesBuffer.removeAll();
        }
      });

    this.showInvitePeople = ko.pureComputed(() => {
      return (
        this.conversation().isActiveParticipant() &&
        this.conversation().inTeam() &&
        (this.conversation().isGuestRoom() || this.conversation().isGuestAndServicesRoom())
      );
    });
  }

  readonly releaseConversation = (conversation_et: Conversation): void => {
    if (conversation_et) {
      conversation_et.release();
    }
  };

  changeConversation = async (conversationEntity: Conversation, messageEntity: Message): Promise<void> => {
    // Clean up old conversation
    this.conversationLoaded(false);
    if (this.conversation()) {
      this.releaseConversation(this.conversation());
    }

    // Update new conversation
    this.initialMessage(messageEntity);
    this.conversation(conversationEntity);
    return new Promise(resolve => {
      const subscription = this.conversationLoaded.subscribe(isLoaded => {
        if (isLoaded) {
          resolve();
          subscription.dispose();
        }
      });
    });
  };

  private readonly isLastReceivedMessage = (messageEntity: Message, conversationEntity: Conversation): boolean => {
    return messageEntity.timestamp() && messageEntity.timestamp() >= conversationEntity.last_event_timestamp();
  };

  loadPrecedingMessages = async (): Promise<void> => {
    const shouldPullMessages = !this.conversation().is_pending() && this.conversation().hasAdditionalMessages();
    if (shouldPullMessages) {
      await this.conversationRepository.getPrecedingMessages(this.conversation());
    }
  };

  readonly loadFollowingMessages = () => {
    const lastMessage = this.conversation().getLastMessage();

    if (lastMessage) {
      if (!this.isLastReceivedMessage(lastMessage, this.conversation())) {
        // if the last loaded message is not the last of the conversation, we load the subsequent messages
        this.conversationRepository.getSubsequentMessages(this.conversation(), lastMessage as ContentMessage);
      }
    }
  };

  readonly showUserDetails = (userEntity: User): void => {
    userEntity = ko.unwrap(userEntity);
    const conversationEntity = this.conversationState.activeConversation();
    const isSingleModeConversation = conversationEntity.is1to1() || conversationEntity.isRequest();

    if (userEntity.isDeleted || (isSingleModeConversation && !userEntity.isMe)) {
      return this.mainViewModel.panel.togglePanel(PanelViewModel.STATE.CONVERSATION_DETAILS, {
        entity: conversationEntity,
      });
    }

    const params = {entity: userEntity};
    const panelId = userEntity.isService
      ? PanelViewModel.STATE.GROUP_PARTICIPANT_SERVICE
      : PanelViewModel.STATE.GROUP_PARTICIPANT_USER;

    this.mainViewModel.panel.togglePanel(panelId, params);
  };

  onSessionResetClick = async (messageEntity: DecryptErrorMessage): Promise<void> => {
    const resetProgress = () =>
      window.setTimeout(() => {
        messageEntity.is_resetting_session(false);
        amplify.publish(WebAppEvents.WARNING.MODAL, ModalsViewModel.TYPE.SESSION_RESET);
      }, MotionDuration.LONG);

    messageEntity.is_resetting_session(true);
    try {
      await this.messageRepository.resetSession(
        {domain: messageEntity.fromDomain, id: messageEntity.from},
        messageEntity.client_id,
        this.conversation(),
      );
      resetProgress();
    } catch (error) {
      this.logger.warn('Error while trying to reset session', error);
      resetProgress();
    }
  };

  showDetail = async (messageEntity: Message, event: MouseEvent): Promise<void> => {
    if (messageEntity.isExpired() || $(event.currentTarget).hasClass('image-asset--no-image')) {
      return;
    }

    const items: Message[] = await this.conversationRepository.getEventsForCategory(
      this.conversation(),
      MessageCategory.IMAGE,
    );
    const messageEntities = items.filter(
      item => item.category & MessageCategory.IMAGE && !(item.category & MessageCategory.GIF),
    );
    const [imageMessageEntity] = messageEntities.filter(item => item.id === messageEntity.id);

    amplify.publish(WebAppEvents.CONVERSATION.DETAIL_VIEW.SHOW, imageMessageEntity || messageEntity, messageEntities);
  };

  readonly isLastDeliveredMessage = (messageEntity: Message): boolean => {
    return this.conversation().getLastDeliveredMessage() === messageEntity;
  };

  readonly clickOnCancelRequest = (messageEntity: MemberMessage): void => {
    const conversationEntity = this.conversationState.activeConversation();
    const nextConversationEntity = this.conversationRepository.getNextConversation(conversationEntity);
    this.actionsViewModel.cancelConnectionRequest(messageEntity.otherUser(), true, nextConversationEntity);
  };

  readonly clickOnLike = (messageEntity: ContentMessage): void => {
    this.messageRepository.toggleLike(this.conversation(), messageEntity);
  };

  readonly clickOnInvitePeople = (conversation: Conversation): void => {
    this.mainViewModel.panel.togglePanel(PanelViewModel.STATE.GUEST_OPTIONS, {entity: conversation});
  };

  readonly getInViewportCallback = (
    conversationEntity: Conversation,
    messageEntity: MemberMessage | ContentMessage,
  ): Function | null => {
    const messageTimestamp = messageEntity.timestamp();
    const callbacks: Function[] = [];

    if (!messageEntity.isEphemeral()) {
      const isCreationMessage = messageEntity.isMember() && messageEntity.isCreation();
      if (conversationEntity.is1to1() && isCreationMessage) {
        this.integrationRepository.addProviderNameToParticipant((messageEntity as MemberMessage).otherUser());
      }
    }

    const sendReadReceipt = () => {
      // add the message in the buffer of read messages (actual read receipt will be sent in the next batch)
      this.readMessagesBuffer.push({conversation: conversationEntity, message: messageEntity});
    };

    const updateLastRead = () => {
      conversationEntity.setTimestamp(messageEntity.timestamp(), Conversation.TIMESTAMP_TYPE.LAST_READ);
    };

    const startTimer = async () => {
      if (messageEntity.conversation_id === conversationEntity.id) {
        this.conversationRepository.checkMessageTimer(messageEntity as ContentMessage);
      }
    };

    if (messageEntity.isEphemeral()) {
      callbacks.push(startTimer);
    }

    const isUnreadMessage = messageTimestamp > conversationEntity.last_read_timestamp();
    const isNotOwnMessage = !messageEntity.user().isMe;

    let shouldSendReadReceipt = false;

    if (messageEntity.expectsReadConfirmation) {
      if (conversationEntity.is1to1()) {
        shouldSendReadReceipt = this.conversationRepository.expectReadReceipt(conversationEntity);
      } else if (
        conversationEntity.isGroup() &&
        (conversationEntity.inTeam() || conversationEntity.isGuestRoom() || conversationEntity.isGuestAndServicesRoom())
      ) {
        shouldSendReadReceipt = true;
      }
    }

    if (this.isLastReceivedMessage(messageEntity, conversationEntity)) {
      callbacks.push(() => this.updateConversationLastRead(conversationEntity, messageEntity));
    }

    if (isUnreadMessage && isNotOwnMessage) {
      callbacks.push(updateLastRead);
      if (shouldSendReadReceipt) {
        callbacks.push(sendReadReceipt);
      }
    }

    if (!callbacks.length) {
      return null;
    }

    return () => {
      const trigger = () => callbacks.forEach(callback => callback());
      return document.hasFocus() ? trigger() : $(window).one('focus', trigger);
    };
  };

  readonly updateConversationLastRead = (conversationEntity: Conversation, messageEntity: Message): void => {
    const conversationLastRead = conversationEntity.last_read_timestamp();
    const lastKnownTimestamp = conversationEntity.getLastKnownTimestamp(this.serverTimeHandler.toServerTimestamp());
    const needsUpdate = conversationLastRead < lastKnownTimestamp;
    if (needsUpdate && this.isLastReceivedMessage(messageEntity, conversationEntity)) {
      conversationEntity.setTimestamp(lastKnownTimestamp, Conversation.TIMESTAMP_TYPE.LAST_READ);
      this.messageRepository.markAsRead(conversationEntity);
    }
  };

  readonly handleClickOnMessage = (messageEntity: ContentMessage | Text, event: MouseEvent): boolean => {
    if (event.button === 2) {
      // Default browser behavior on right click
      return true;
    }

    const emailTarget = (event.target as HTMLElement).closest<HTMLAnchorElement>('[data-email-link]');
    if (emailTarget) {
      safeMailOpen(emailTarget.href);
      event.preventDefault();
      return false;
    }

    const linkTarget = (event.target as HTMLElement).closest<HTMLAnchorElement>('[data-md-link]');
    if (linkTarget) {
      const href = linkTarget.href;
      amplify.publish(WebAppEvents.WARNING.MODAL, ModalsViewModel.TYPE.CONFIRM, {
        primaryAction: {
          action: () => {
            safeWindowOpen(href);
          },
          text: t('modalOpenLinkAction'),
        },
        text: {
          message: t('modalOpenLinkMessage', href),
          title: t('modalOpenLinkTitle'),
        },
      });
      event.preventDefault();
      return false;
    }

    const hasMentions = messageEntity instanceof Text && messageEntity.mentions().length;
    const mentionElement = hasMentions
      ? (event.target as HTMLElement).closest<HTMLSpanElement>('.message-mention')
      : undefined;
    const userId = mentionElement?.dataset.userId;
    const domain = mentionElement?.dataset.domain;

    if (userId) {
      (async () => {
        try {
          const userEntity = await this.userRepository.getUserById({domain, id: userId});
          this.showUserDetails(userEntity);
        } catch (error) {
          if (error.type !== UserError.TYPE.USER_NOT_FOUND) {
            throw error;
          }
        }
      })();
    }

    // need to return `true` because knockout will prevent default if we return anything else (including undefined)
    return true;
  };

  readonly showParticipants = (participants: User[]): void => {
    this.mainViewModel.panel.togglePanel(PanelViewModel.STATE.CONVERSATION_PARTICIPANTS, {
      entity: this.conversation(),
      highlighted: participants,
    });
  };

  readonly showMessageDetails = (message: Message, showLikes: boolean): void => {
    if (!this.conversation().is1to1()) {
      this.mainViewModel.panel.togglePanel(PanelViewModel.STATE.MESSAGE_DETAILS, {
        entity: message,
        showLikes,
      });
    }
  };
}
