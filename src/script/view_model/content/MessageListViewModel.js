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

import $ from 'jquery';
import {groupBy} from 'underscore';

import {getLogger} from 'Util/Logger';
import {scrollEnd, scrollToBottom, scrollBy} from 'Util/scroll-helpers';
import {t} from 'Util/LocalizerUtil';
import {safeWindowOpen, safeMailOpen} from 'Util/SanitizationUtil';
import {isSameDay, differenceInMinutes} from 'Util/TimeUtil';

import {Config} from '../../Config';
import {Conversation} from '../../entity/Conversation';
import {ModalsViewModel} from '../ModalsViewModel';
import {WebAppEvents} from '../../event/WebApp';
import {MessageCategory} from '../../message/MessageCategory';
import {MotionDuration} from '../../motion/MotionDuration';

/*
 * Message list rendering view model.
 *
 * @todo Get rid of the participants dependencies whenever bubble implementation has changed
 * @todo Remove all jQuery selectors
 */
class MessageListViewModel {
  constructor(mainViewModel, contentViewModel, repositories) {
    this._scrollAddedMessagesIntoView = this._scrollAddedMessagesIntoView.bind(this);
    this.onMessageContainerInitiated = this.onMessageContainerInitiated.bind(this);
    this.click_on_cancel_request = this.click_on_cancel_request.bind(this);
    this.click_on_like = this.click_on_like.bind(this);
    this.clickOnInvitePeople = this.clickOnInvitePeople.bind(this);
    this.handleClickOnMessage = this.handleClickOnMessage.bind(this);
    this.is_last_delivered_message = this.is_last_delivered_message.bind(this);
    this.on_session_reset_click = this.on_session_reset_click.bind(this);
    this.should_hide_user_avatar = this.should_hide_user_avatar.bind(this);
    this.showUserDetails = this.showUserDetails.bind(this);
    this.focusMessage = this.focusMessage.bind(this);
    this.showParticipants = this.showParticipants.bind(this);
    this.showMessageDetails = this.showMessageDetails.bind(this);
    this.show_detail = this.show_detail.bind(this);

    this.mainViewModel = mainViewModel;
    this.conversation_repository = repositories.conversation;
    this.integrationRepository = repositories.integration;
    this.serverTimeHandler = repositories.serverTime;
    this.userRepository = repositories.user;
    this.logger = getLogger('MessageListViewModel');

    this.actionsViewModel = this.mainViewModel.actions;
    this.selfUser = this.userRepository.self;
    this.focusedMessage = ko.observable(null);

    this.conversation = ko.observable(new Conversation());
    this.verticallyCenterMessage = ko.pureComputed(() => {
      if (this.conversation().messages_visible().length === 1) {
        const [messageEntity] = this.conversation().messages_visible();
        return messageEntity.is_member() && messageEntity.isConnection();
      }
    });

    amplify.subscribe(WebAppEvents.INPUT.RESIZE, this._handleInputResize.bind(this));

    this.conversationLoaded = ko.observable(false);
    // Store last read to show until user switches conversation
    this.conversation_last_read_timestamp = undefined;

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
            this.conversation_repository.sendReadReceipt(conversation, firstMessage, otherMessages);
          });
          this.readMessagesBuffer.removeAll();
        }
      });

    // Store message subscription id
    this.messagesChangeSubscription = undefined;
    this.messagesBeforeChangeSubscription = undefined;

    this.messagesContainer = undefined;

    this.showInvitePeople = ko.pureComputed(() => {
      return (
        this.conversation().isActiveParticipant() && this.conversation().inTeam() && this.conversation().isGuestRoom()
      );
    });
  }

  onMessageContainerInitiated(messagesContainer) {
    this.messagesContainer = messagesContainer;
  }

  /**
   * Remove all subscriptions and reset states.
   * @param {Conversation} [conversation_et] Conversation entity to change to
   * @returns {undefined} No return value
   */
  release_conversation(conversation_et) {
    if (conversation_et) {
      conversation_et.release();
    }
    if (this.messagesBeforeChangeSubscription) {
      this.messagesBeforeChangeSubscription.dispose();
    }
    if (this.messagesChangeSubscription) {
      this.messagesChangeSubscription.dispose();
    }
    this.conversation_last_read_timestamp = undefined;
    window.removeEventListener('resize', this._adjustScroll);
  }

  _shouldStickToBottom() {
    const messagesContainer = this.getMessagesContainer();
    const scrollPosition = Math.ceil(messagesContainer.scrollTop);
    const scrollEndValue = Math.ceil(scrollEnd(messagesContainer));
    return scrollPosition > scrollEndValue - Config.SCROLL_TO_LAST_MESSAGE_THRESHOLD;
  }

  /**
   * Adjust the scroll position
   * @returns {void} - nothing
   */
  _adjustScroll = () => {
    if (this._shouldStickToBottom()) {
      scrollToBottom(this.getMessagesContainer());
    }
  };

  _handleInputResize(inputSizeDiff) {
    if (inputSizeDiff) {
      scrollBy(this.getMessagesContainer(), inputSizeDiff);
    } else if (this._shouldStickToBottom()) {
      scrollToBottom(this.getMessagesContainer());
    }
  }

  /**
   * Change conversation.
   *
   * @param {Conversation} conversationEntity Conversation entity to change to
   * @param {Message} messageEntity message to be focused
   * @returns {Promise} Resolves when conversation was changed
   */
  changeConversation(conversationEntity, messageEntity) {
    // Clean up old conversation
    this.conversationLoaded(false);
    if (this.conversation()) {
      this.release_conversation(this.conversation());
    }

    // Update new conversation
    this.conversation(conversationEntity);

    // Keep last read timestamp to render unread when entering conversation
    if (this.conversation().unreadState().allEvents.length) {
      this.conversation_last_read_timestamp = this.conversation().last_read_timestamp();
    }

    conversationEntity.is_loaded(false);
    return this._loadConversation(conversationEntity, messageEntity)
      .then(() => this._renderConversation(conversationEntity, messageEntity))
      .then(() => {
        conversationEntity.is_loaded(true);
        this.conversationLoaded(true);
      });
  }

  _loadConversation(conversationEntity, messageEntity) {
    return this.conversation_repository
      .updateParticipatingUserEntities(conversationEntity, false, true)
      .then(_conversationEntity => {
        return messageEntity
          ? this.conversation_repository.getMessagesWithOffset(_conversationEntity, messageEntity)
          : this.conversation_repository.getPrecedingMessages(_conversationEntity);
      });
  }

  _isLastReceivedMessage(messageEntity, conversationEntity) {
    return messageEntity.timestamp() && messageEntity.timestamp() >= conversationEntity.last_event_timestamp();
  }

  getMessagesContainer() {
    return this.messagesContainer;
  }

  /**
   * Sets the conversation and waits for further processing until knockout has rendered the messages.
   * @param {Conversation} conversationEntity Conversation entity to set
   * @param {Message} messageEntity Message that should be in focus when the conversation loads
   * @returns {Promise} Resolves when conversation was rendered
   */
  _renderConversation(conversationEntity, messageEntity) {
    const messages_container = this.getMessagesContainer();

    const is_current_conversation = conversationEntity === this.conversation();
    if (!is_current_conversation) {
      this.logger.info(`Skipped re-loading current conversation '${conversationEntity.display_name()}'`);
      return Promise.resolve();
    }

    return new Promise(resolve => {
      window.setTimeout(() => {
        // Reset scroll position
        messages_container.scrollTop = 0;

        if (messageEntity) {
          this.focusMessage(messageEntity.id);
        } else {
          const unread_message = $('.message-timestamp-unread');
          if (unread_message.length) {
            const unreadMarkerPosition = unread_message.parents('.message').position();

            scrollBy(messages_container, unreadMarkerPosition.top);
          } else {
            scrollToBottom(messages_container);
          }
        }

        window.addEventListener('resize', this._adjustScroll);

        let shouldStickToBottomOnMessageAdd;

        this.messagesBeforeChangeSubscription = conversationEntity.messages_visible.subscribe(
          () => {
            // we need to keep track of the scroll position before the message array has changed
            shouldStickToBottomOnMessageAdd = this._shouldStickToBottom();
          },
          null,
          'beforeChange',
        );

        // Subscribe for incoming messages
        this.messagesChangeSubscription = conversationEntity.messages_visible.subscribe(
          changedMessages => {
            this._scrollAddedMessagesIntoView(changedMessages, shouldStickToBottomOnMessageAdd);
            shouldStickToBottomOnMessageAdd = undefined;
          },
          null,
          'arrayChange',
        );
        resolve();
      }, 100);
    });
  }

  /**
   * Checks how to scroll message list and if conversation should be marked as unread.
   * @param {Array} changedMessages List of the messages that were added or removed from the list
   * @param {boolean} shouldStickToBottom should the list stick to the bottom
   * @returns {undefined} No return value
   */
  _scrollAddedMessagesIntoView(changedMessages, shouldStickToBottom) {
    const messages_container = this.getMessagesContainer();
    const lastAddedItem = changedMessages
      .slice()
      .reverse()
      .find(changedMessage => changedMessage.status === 'added');

    // We are only interested in items that were added
    if (!lastAddedItem) {
      return;
    }

    const lastMessage = lastAddedItem.value;

    if (lastMessage) {
      // Message was prepended
      if (lastMessage.timestamp() < this.conversation().last_event_timestamp()) {
        return;
      }

      // Scroll to bottom if self user send the message
      if (lastMessage.from === this.selfUser().id) {
        window.requestAnimationFrame(() => scrollToBottom(messages_container));
        return;
      }
    }

    // Scroll to the end of the list if we are under a certain threshold
    if (shouldStickToBottom) {
      window.requestAnimationFrame(() => scrollToBottom(messages_container));
    }
  }

  /**
   * Fetch older messages beginning from the oldest message in view
   * @returns {Promise<any>} A promise that resolves when the loading is done
   */
  loadPrecedingMessages() {
    const shouldPullMessages = !this.conversation().is_pending() && this.conversation().hasAdditionalMessages();
    const [messagesContainer] = this.getMessagesContainer().children;

    if (shouldPullMessages && messagesContainer) {
      const initialListHeight = messagesContainer.scrollHeight;

      return this.conversation_repository.getPrecedingMessages(this.conversation()).then(() => {
        if (messagesContainer) {
          const newListHeight = messagesContainer.scrollHeight;
          this.getMessagesContainer().scrollTop = newListHeight - initialListHeight;
        }
      });
    }
    return Promise.resolve();
  }

  /**
   * Fetch newer messages beginning from the newest message in view
   * @returns {Promise<any>} A promise that resolves when the loading is done
   */
  loadFollowingMessages() {
    const lastMessage = this.conversation().getLastMessage();

    if (lastMessage) {
      if (!this._isLastReceivedMessage(lastMessage, this.conversation())) {
        // if the last loaded message is not the last of the conversation, we load the subsequent messages
        return this.conversation_repository.getSubsequentMessages(this.conversation(), lastMessage, false);
      }
      if (document.hasFocus()) {
        // if the message is the last of the conversation and the app is in the foreground, then we update the last read timestamp of the conversation
        this.updateConversationLastRead(this.conversation(), lastMessage);
      }
    }
    return Promise.resolve();
  }

  /**
   * Scroll to given message in the list.
   *
   * @note Ideally message is centered horizontally
   * @param {string} messageId Target message's id
   * @returns {undefined} No return value
   */
  focusMessage(messageId) {
    const messageIsLoaded = !!this.conversation().getMessage(messageId);
    this.focusedMessage(messageId);

    if (!messageIsLoaded) {
      const conversationEntity = this.conversation();
      this.conversation_repository
        .get_message_in_conversation_by_id(conversationEntity, messageId)
        .then(messageEntity => {
          conversationEntity.remove_messages();
          return this.conversation_repository.getMessagesWithOffset(conversationEntity, messageEntity);
        });
    }
  }

  onMessageMarked = messageElement => {
    const messagesContainer = this.getMessagesContainer();
    messageElement.classList.remove('message-marked');
    scrollBy(messagesContainer, messageElement.getBoundingClientRect().top - messagesContainer.offsetHeight / 2);
    messageElement.classList.add('message-marked');
    this.focusedMessage(null);
  };

  /**
   * Triggered when user clicks on an avatar in the message list.
   * @param {User} userEntity User entity of the selected user
   * @returns {undefined} No return value
   */
  showUserDetails(userEntity) {
    userEntity = ko.unwrap(userEntity);
    const conversationEntity = this.conversation_repository.active_conversation();
    const isSingleModeConversation = conversationEntity.is1to1() || conversationEntity.isRequest();

    if (isSingleModeConversation && !userEntity.is_me) {
      return this.mainViewModel.panel.togglePanel(z.viewModel.PanelViewModel.STATE.CONVERSATION_DETAILS);
    }

    const params = {entity: userEntity};
    const panelId = userEntity.isService
      ? z.viewModel.PanelViewModel.STATE.GROUP_PARTICIPANT_SERVICE
      : z.viewModel.PanelViewModel.STATE.GROUP_PARTICIPANT_USER;

    this.mainViewModel.panel.togglePanel(panelId, params);
  }

  /**
   * Triggered when user clicks on the session reset link in a decrypt error message.
   * @param {DecryptErrorMessage} message_et Decrypt error message
   * @returns {undefined} No return value
   */
  on_session_reset_click(message_et) {
    const reset_progress = () =>
      window.setTimeout(() => {
        message_et.is_resetting_session(false);
        amplify.publish(WebAppEvents.WARNING.MODAL, ModalsViewModel.TYPE.SESSION_RESET);
      }, MotionDuration.LONG);

    message_et.is_resetting_session(true);
    this.conversation_repository
      .reset_session(message_et.from, message_et.client_id, this.conversation().id)
      .then(() => reset_progress())
      .catch(() => reset_progress());
  }

  /**
   * Shows detail image view.
   *
   * @param {Message} message_et Message with asset to be displayed
   * @param {UIEvent} event Actual scroll event
   * @returns {undefined} No return value
   */
  show_detail(message_et, event) {
    if (message_et.is_expired() || $(event.currentTarget).hasClass('image-asset--no-image')) {
      return;
    }

    this.conversation_repository.get_events_for_category(this.conversation(), MessageCategory.IMAGE).then(items => {
      const message_ets = items.filter(
        item => item.category & MessageCategory.IMAGE && !(item.category & MessageCategory.GIF),
      );
      const [image_message_et] = message_ets.filter(item => item.id === message_et.id);

      amplify.publish(WebAppEvents.CONVERSATION.DETAIL_VIEW.SHOW, image_message_et || message_et, message_ets);
    });
  }

  get_timestamp_class = messageEntity => {
    const previousMessage = this.conversation().get_previous_message(messageEntity);
    if (!previousMessage || messageEntity.is_call()) {
      return '';
    }

    const isFirstUnread =
      previousMessage.timestamp() <= this.conversation_last_read_timestamp &&
      messageEntity.timestamp() > this.conversation_last_read_timestamp;

    if (isFirstUnread) {
      return 'message-timestamp-visible message-timestamp-unread';
    }

    const last = previousMessage.timestamp();
    const current = messageEntity.timestamp();

    if (!isSameDay(last, current)) {
      return 'message-timestamp-visible message-timestamp-day';
    }

    if (differenceInMinutes(current, last) > 60) {
      return 'message-timestamp-visible';
    }
  };

  /**
   * Checks its older neighbor in order to see if the avatar should be rendered or not
   * @param {Message} message_et Message to check
   * @returns {boolean} Should user avatar be hidden
   */
  should_hide_user_avatar(message_et) {
    // @todo avoid double check
    if (this.get_timestamp_class(message_et)) {
      return false;
    }

    if (message_et.is_content() && message_et.replacing_message_id) {
      return false;
    }

    const last_message = this.conversation().get_previous_message(message_et);
    return last_message && last_message.is_content() && last_message.user().id === message_et.user().id;
  }

  /**
   * Checks if the given message is the last delivered one
   * @param {Message} message_et Message to check
   * @returns {boolean} Message is last delivered one
   */
  is_last_delivered_message(message_et) {
    return this.conversation().getLastDeliveredMessage() === message_et;
  }

  click_on_cancel_request(messageEntity) {
    const conversationEntity = this.conversation_repository.active_conversation();
    const nextConversationEntity = this.conversation_repository.get_next_conversation(conversationEntity);
    this.actionsViewModel.cancelConnectionRequest(messageEntity.otherUser(), true, nextConversationEntity);
  }

  click_on_like(message_et, button = true) {
    this.conversation_repository.toggle_like(this.conversation(), message_et, button);
  }

  clickOnInvitePeople() {
    this.mainViewModel.panel.togglePanel(z.viewModel.PanelViewModel.STATE.GUEST_OPTIONS);
  }

  /**
   * Message appeared in viewport.
   * @param {Conversation} conversationEntity Conversation the message belongs to
   * @param {Message} messageEntity Message to check
   * @returns {Function|null} Callback or null
   */
  getInViewportCallback(conversationEntity, messageEntity) {
    const messageTimestamp = messageEntity.timestamp();
    const callbacks = [];

    if (!messageEntity.is_ephemeral()) {
      const isCreationMessage = messageEntity.is_member() && messageEntity.isCreation();
      if (conversationEntity.is1to1() && isCreationMessage) {
        this.integrationRepository.addProviderNameToParticipant(messageEntity.otherUser());
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
        await this.conversation_repository.checkMessageTimer(messageEntity);
      }
    };

    if (messageEntity.is_ephemeral()) {
      callbacks.push(startTimer);
    }

    const isUnreadMessage = messageTimestamp > conversationEntity.last_read_timestamp();
    const isNotOwnMessage = !messageEntity.user().is_me;

    let shouldSendReadReceipt = false;

    if (messageEntity.expectsReadConfirmation) {
      if (conversationEntity.is1to1()) {
        shouldSendReadReceipt = this.conversation_repository.expectReadReceipt(conversationEntity);
      } else if (conversationEntity.isGroup() && (conversationEntity.inTeam() || conversationEntity.isGuestRoom())) {
        shouldSendReadReceipt = true;
      }
    }

    if (this._isLastReceivedMessage(messageEntity, conversationEntity)) {
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
  }

  updateConversationLastRead(conversationEntity, messageEntity) {
    const conversationLastRead = conversationEntity.last_read_timestamp();
    const lastKnownTimestamp = conversationEntity.get_last_known_timestamp(this.serverTimeHandler.toServerTimestamp());
    const needsUpdate = conversationLastRead < lastKnownTimestamp;
    if (needsUpdate && this._isLastReceivedMessage(messageEntity, conversationEntity)) {
      conversationEntity.setTimestamp(lastKnownTimestamp, Conversation.TIMESTAMP_TYPE.LAST_READ);
      this.conversation_repository.markAsRead(conversationEntity);
    }
  }

  handleClickOnMessage(messageEntity, event) {
    const emailTarget = event.target.closest('[data-email-link]');
    if (emailTarget) {
      safeMailOpen(emailTarget.href);
      return false;
    }
    const linkTarget = event.target.closest('[data-md-link]');
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
      return false;
    }
    const hasMentions = messageEntity.mentions().length;
    const mentionElement = hasMentions && event.target.closest('.message-mention');
    const userId = mentionElement && mentionElement.dataset.userId;

    if (userId) {
      this.userRepository
        .get_user_by_id(userId)
        .then(userEntity => this.showUserDetails(userEntity))
        .catch(error => {
          if (error.type !== z.error.UserError.TYPE.USER_NOT_FOUND) {
            throw error;
          }
        });
    }

    // need to return `true` because knockout will prevent default if we return anything else (including undefined)
    return true;
  }

  showParticipants(participants) {
    this.mainViewModel.panel.togglePanel(z.viewModel.PanelViewModel.STATE.CONVERSATION_PARTICIPANTS, participants);
  }

  showMessageDetails(view, showLikes) {
    if (!this.conversation().is1to1()) {
      this.mainViewModel.panel.togglePanel(z.viewModel.PanelViewModel.STATE.MESSAGE_DETAILS, {
        entity: {id: view.message.id},
        showLikes,
      });
    }
  }
}

export {MessageListViewModel};
