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

'use strict';

window.z = window.z || {};
window.z.viewModel = z.viewModel || {};
window.z.viewModel.content = z.viewModel.content || {};

/**
 * Message list rendering view model.
 *
 * @todo Get rid of the participants dependencies whenever bubble implementation has changed
 * @todo Remove all jquery selectors
 */
z.viewModel.content.MessageListViewModel = class MessageListViewModel {
  constructor(mainViewModel, contentViewModel, repositories) {
    this._scrollAddedMessagesIntoView = this._scrollAddedMessagesIntoView.bind(this);
    this.bindShowMore = this.bindShowMore.bind(this);
    this.click_on_cancel_request = this.click_on_cancel_request.bind(this);
    this.click_on_like = this.click_on_like.bind(this);
    this.clickOnInvitePeople = this.clickOnInvitePeople.bind(this);
    this.get_timestamp_class = this.get_timestamp_class.bind(this);
    this.handleClickOnMessage = this.handleClickOnMessage.bind(this);
    this.is_last_delivered_message = this.is_last_delivered_message.bind(this);
    this.on_context_menu_click = this.on_context_menu_click.bind(this);
    this.on_session_reset_click = this.on_session_reset_click.bind(this);
    this.should_hide_user_avatar = this.should_hide_user_avatar.bind(this);
    this.showUserDetails = this.showUserDetails.bind(this);
    this._handleWindowResize = this._handleWindowResize.bind(this);
    this.focusMessage = this.focusMessage.bind(this);
    this.show_detail = this.show_detail.bind(this);

    this.mainViewModel = mainViewModel;
    this.conversation_repository = repositories.conversation;
    this.integrationRepository = repositories.integration;
    this.locationRepository = repositories.location;
    this.userRepository = repositories.user;
    this.logger = new z.util.Logger('z.viewModel.content.MessageListViewModel', z.config.LOGGER.OPTIONS);

    this.actionsViewModel = this.mainViewModel.actions;
    this.selfUser = this.userRepository.self;

    this.conversation = ko.observable(new z.entity.Conversation());
    this.verticallyCenterMessage = ko.pureComputed(() => {
      if (this.conversation().messages_visible().length === 1) {
        const [messageEntity] = this.conversation().messages_visible();
        return messageEntity.is_member() && messageEntity.isConnection();
      }
    });

    amplify.subscribe(z.event.WebApp.INPUT.RESIZE, this._handleInputResize.bind(this));

    this.conversationLoaded = ko.observable(false);
    // Store last read to show until user switches conversation
    this.conversation_last_read_timestamp = ko.observable(undefined);

    // Store conversation to mark as read when browser gets focus
    this.mark_as_read_on_focus = undefined;

    // Can be used to prevent scroll handler from being executed (e.g. when using scrollTop())
    this.capture_scrolling_event = false;

    // Store message subscription id
    this.messagesChangeSubscription = undefined;
    this.messagesBeforeChangeSubscription = undefined;

    this.onMouseWheel = _.throttle((data, event) => {
      const element = $(event.currentTarget);
      if (element.isScrollable()) {
        // if the element is scrollable, the scroll event will take the relay
        return true;
      }
      const isScrollingUp = event.deltaY > 0;
      const loadExtraMessagePromise = isScrollingUp ? this._loadPrecedingMessages() : this._loadFollowingMessages();

      loadExtraMessagePromise.then(() => {
        const antiscroll = $('.message-list').data('antiscroll');
        if (antiscroll) {
          antiscroll.rebuild();
        }
      });

      return true;
    }, 50);

    this.onScroll = _.throttle((data, event) => {
      if (!this.capture_scrolling_event) {
        return;
      }
      const element = $(event.currentTarget);

      // On some HDPI screen scrollTop returns a floating point number instead of an integer
      // https://github.com/jquery/api.jquery.com/issues/608
      const scrollPosition = Math.ceil(element.scrollTop());
      const scrollEnd = element.scrollEnd();
      const hitTop = scrollPosition <= 0;
      const hitBottom = scrollPosition >= scrollEnd;

      if (hitTop) {
        return this._loadPrecedingMessages();
      }

      if (hitBottom) {
        this._loadFollowingMessages().then(() => {
          this._mark_conversation_as_read_on_focus(this.conversation());
        });
      }
    }, 100);

    this.messagesContainer = undefined;

    $(window).on('focus', () => {
      if (this.mark_as_read_on_focus) {
        window.setTimeout(() => {
          this.conversation_repository.markAsRead(this.mark_as_read_on_focus);
          this.mark_as_read_on_focus = undefined;
        }, z.util.TimeUtil.UNITS_IN_MILLIS.SECOND);
      }
    });

    this.showInvitePeople = ko.pureComputed(() => {
      return (
        this.conversation().isActiveParticipant() && this.conversation().inTeam() && this.conversation().isGuestRoom()
      );
    });
  }

  /**
   * Mark conversation as read if window has focus
   * @param {z.entity.Conversation} conversation_et - Conversation entity to mark as read
   * @returns {undefined} No return value
   */
  _mark_conversation_as_read_on_focus(conversation_et) {
    if (document.hasFocus()) {
      return this.conversation_repository.markAsRead(conversation_et);
    }
    this.mark_as_read_on_focus = conversation_et;
  }

  /**
   * Remove all subscriptions and reset states.
   * @param {z.entity.Conversation} [conversation_et] - Conversation entity to change to
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
    this.capture_scrolling_event = false;
    this.conversation_last_read_timestamp(false);
    this.messagesContainer = undefined;
    window.removeEventListener('resize', this._handleWindowResize);
  }

  _shouldStickToBottom() {
    const messagesContainer = this._getMessagesContainer();
    const scrollPosition = Math.ceil(messagesContainer.scrollTop());
    const scrollEnd = Math.ceil(messagesContainer.scrollEnd());
    return scrollPosition > scrollEnd - z.config.SCROLL_TO_LAST_MESSAGE_THRESHOLD;
  }

  _handleWindowResize() {
    if (this._shouldStickToBottom()) {
      this._getMessagesContainer().scrollToBottom();
    }
  }

  _handleInputResize(inputSizeDiff) {
    const antiscroll = $('.message-list').data('antiscroll');
    if (antiscroll) {
      antiscroll.rebuild();
    }

    if (inputSizeDiff) {
      this._getMessagesContainer().scrollBy(inputSizeDiff);
    } else if (this._shouldStickToBottom()) {
      this._getMessagesContainer().scrollToBottom();
    }
  }

  /**
   * Change conversation.
   *
   * @param {z.entity.Conversation} conversationEntity - Conversation entity to change to
   * @param {z.entity.Message} messageEntity - message to be focused
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
      this.conversation_last_read_timestamp(this.conversation().last_read_timestamp());
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

  _conversationHasExtraMessages(conversationEntity) {
    const lastMessageEntity = conversationEntity.getLastMessage();
    if (!lastMessageEntity) {
      return false;
    }

    const isLastConversationEvent = lastMessageEntity.timestamp() >= this.conversation().last_event_timestamp();
    return !isLastConversationEvent && lastMessageEntity.timestamp();
  }

  _getMessagesContainer() {
    if (!this.messagesContainer) {
      this.messagesContainer = $('.messages-wrap');
    }
    return this.messagesContainer;
  }

  /**
   * Sets the conversation and waits for further processing until knockout has rendered the messages.
   * @param {z.entity.Conversation} conversationEntity - Conversation entity to set
   * @param {z.entity.Message} messageEntity - Message that should be in focus when the conversation loads
   * @returns {Promise} Resolves when conversation was rendered
   */
  _renderConversation(conversationEntity, messageEntity) {
    const messages_container = this._getMessagesContainer();

    const is_current_conversation = conversationEntity === this.conversation();
    if (!is_current_conversation) {
      this.logger.info(`Skipped re-loading current conversation '${conversationEntity.display_name()}'`);
      return Promise.resolve();
    }

    return new Promise(resolve => {
      window.setTimeout(() => {
        // Reset scroll position
        messages_container.scrollTop(0);

        if (messageEntity) {
          this.focusMessage(messageEntity.id);
        } else {
          const unread_message = $('.message-timestamp-unread');
          if (unread_message.length) {
            const unreadMarkerPosition = unread_message.parents('.message').position();

            messages_container.scrollBy(unreadMarkerPosition.top);
          } else {
            messages_container.scrollToBottom();
          }
        }

        if (!messages_container.isScrollable() && !this._conversationHasExtraMessages(this.conversation())) {
          this._mark_conversation_as_read_on_focus(this.conversation());
        }

        this.capture_scrolling_event = true;
        window.addEventListener('resize', this._handleWindowResize);

        let shouldStickToBottomOnMessageAdd;

        this.messagesBeforeChangeSubscription = conversationEntity.messages_visible.subscribe(
          () => {
            // we need to keep track of the scroll position before the message array has changed
            shouldStickToBottomOnMessageAdd = this._shouldStickToBottom();
          },
          null,
          'beforeChange'
        );

        // Subscribe for incoming messages
        this.messagesChangeSubscription = conversationEntity.messages_visible.subscribe(
          changedMessages => {
            this._scrollAddedMessagesIntoView(changedMessages, shouldStickToBottomOnMessageAdd);
            shouldStickToBottomOnMessageAdd = undefined;
          },
          null,
          'arrayChange'
        );
        resolve();
      }, 100);
    });
  }

  /**
   * Checks how to scroll message list and if conversation should be marked as unread.
   * @param {Array} changedMessages - List of the messages that were added or removed from the list
   * @param {boolean} shouldStickToBottom - should the list stick to the bottom
   * @returns {undefined} No return value
   */
  _scrollAddedMessagesIntoView(changedMessages, shouldStickToBottom) {
    const messages_container = this._getMessagesContainer();
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
        window.requestAnimationFrame(() => messages_container.scrollToBottom());
        return;
      }
    }

    // Scroll to the end of the list if we are under a certain threshold
    if (shouldStickToBottom) {
      window.requestAnimationFrame(() => messages_container.scrollToBottom());

      if (document.hasFocus()) {
        this.conversation_repository.markAsRead(this.conversation());
      }
    }

    // Mark as read when conversation is not scrollable
    if (!messages_container.isScrollable()) {
      this._mark_conversation_as_read_on_focus(this.conversation());
    }
  }

  /**
   * Fetch older messages beginning from the oldest message in view
   * @returns {Promise<any>} A promise that resolves when the loading is done
   */
  _loadPrecedingMessages() {
    const shouldPullMessages = !this.conversation().is_pending() && this.conversation().hasAdditionalMessages();
    const [messagesContainer] = this._getMessagesContainer().children();

    if (shouldPullMessages && messagesContainer) {
      const initialListHeight = messagesContainer.scrollHeight;

      this.capture_scrolling_event = false;
      return this.conversation_repository.getPrecedingMessages(this.conversation()).then(() => {
        if (messagesContainer) {
          const newListHeight = messagesContainer.scrollHeight;
          this._getMessagesContainer().scrollTop(newListHeight - initialListHeight);
          this.capture_scrolling_event = true;
        }
      });
    }
    return Promise.resolve();
  }

  /**
   * Fetch newer messages beginning from the newest message in view
   * @returns {Promise<any>} A promise that resolves when the loading is done
   */
  _loadFollowingMessages() {
    const last_message = this.conversation().getLastMessage();

    if (last_message && this._conversationHasExtraMessages(this.conversation())) {
      this.capture_scrolling_event = false;
      return this.conversation_repository
        .getSubsequentMessages(this.conversation(), last_message, false)
        .then(message_ets => {
          this.capture_scrolling_event = true;
        });
    }
    return Promise.resolve();
  }

  /**
   * Scroll to given message in the list.
   *
   * @note Ideally message is centered horizontally
   * @param {string} messageId - Target message's id
   * @returns {undefined} No return value
   */
  focusMessage(messageId) {
    const messageIsLoaded = !!this.conversation().getMessage(messageId);
    const conversationEntity = this.conversation();

    const loadMessagePromise = messageIsLoaded
      ? Promise.resolve()
      : this.conversation_repository
          .get_message_in_conversation_by_id(conversationEntity, messageId)
          .then(messageEntity => {
            conversationEntity.remove_messages();
            return this.conversation_repository.getMessagesWithOffset(conversationEntity, messageEntity);
          });

    loadMessagePromise.then(() => {
      z.util.afterRender(() => {
        const messagesContainer = this._getMessagesContainer();
        const messageElement = messagesContainer.find(`.message[data-uie-uid="${messageId}"]`);

        if (messageElement.length) {
          messageElement.removeClass('message-marked');
          messagesContainer.scrollBy(messageElement.offset().top - messagesContainer.height() / 2);
          messageElement.addClass('message-marked');
        }
      });
    });
  }

  /**
   * Triggered when user clicks on an avatar in the message list.
   * @param {z.entity.User} userEntity - User entity of the selected user
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
   * @param {z.entity.DecryptErrorMessage} message_et - Decrypt error message
   * @returns {undefined} No return value
   */
  on_session_reset_click(message_et) {
    const reset_progress = () =>
      window.setTimeout(() => {
        message_et.is_resetting_session(false);
        amplify.publish(z.event.WebApp.WARNING.MODAL, z.viewModel.ModalsViewModel.TYPE.SESSION_RESET);
      }, z.motion.MotionDuration.LONG);

    message_et.is_resetting_session(true);
    this.conversation_repository
      .reset_session(message_et.from, message_et.client_id, this.conversation().id)
      .then(() => reset_progress())
      .catch(() => reset_progress());
  }

  getSystemMessageIconComponent(message) {
    const iconComponents = {
      [z.message.SystemMessageType.CONVERSATION_RENAME]: 'edit-icon',
      [z.message.SystemMessageType.CONVERSATION_MESSAGE_TIMER_UPDATE]: 'timer-icon',
    };
    return iconComponents[message.system_message_type];
  }

  /**
   * Shows detail image view.
   *
   * @param {z.entity.Message} message_et - Message with asset to be displayed
   * @param {UIEvent} event - Actual scroll event
   * @returns {undefined} No return value
   */
  show_detail(message_et, event) {
    if (message_et.is_expired() || $(event.currentTarget).hasClass('image-loading')) {
      return;
    }

    this.conversation_repository
      .get_events_for_category(this.conversation(), z.message.MessageCategory.IMAGE)
      .then(items => {
        const message_ets = items.filter(
          item => item.category & z.message.MessageCategory.IMAGE && !(item.category & z.message.MessageCategory.GIF)
        );
        const [image_message_et] = message_ets.filter(item => item.id === message_et.id);

        amplify.publish(z.event.WebApp.CONVERSATION.DETAIL_VIEW.SHOW, image_message_et || message_et, message_ets);
      });
  }

  get_timestamp_class(message_et) {
    const last_message = this.conversation().get_previous_message(message_et);
    if (last_message) {
      if (message_et.is_call()) {
        return '';
      }

      if (last_message.timestamp() === this.conversation_last_read_timestamp()) {
        return 'message-timestamp-visible message-timestamp-unread';
      }

      const last = moment(last_message.timestamp());
      const current = moment(message_et.timestamp());

      if (!last.isSame(current, 'day')) {
        return 'message-timestamp-visible message-timestamp-day';
      }

      if (current.diff(last, 'minutes') > 60) {
        return 'message-timestamp-visible';
      }
    }
  }

  /**
   * Checks its older neighbor in order to see if the avatar should be rendered or not
   * @param {z.entity.Message} message_et - Message to check
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
   * @param {z.entity.Message} message_et - Message to check
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
   * @param {z.entity.Message} messageEntity - Message to check
   * @returns {boolean} Message is in viewport
   */
  getInViewportCallback(messageEntity) {
    if (!messageEntity.is_ephemeral()) {
      const isCreationMessage = messageEntity.is_member() && messageEntity.isCreation();
      if (this.conversation().is1to1() && isCreationMessage) {
        this.integrationRepository.addProviderNameToParticipant(messageEntity.otherUser());
      }
      return null;
    }

    return () => {
      const startTimer = () => {
        if (messageEntity.conversation_id === this.conversation().id) {
          this.conversation_repository.checkMessageTimer(messageEntity);
        }
      };
      return document.hasFocus() ? startTimer() : $(window).one('focus', startTimer);
    };
  }

  on_context_menu_click(message_et, event) {
    const entries = [];

    if (message_et.is_downloadable()) {
      entries.push({
        click: () => message_et.download(),
        label: z.l10n.text(z.string.conversationContextMenuDownload),
      });
    }

    if (message_et.is_reactable() && !this.conversation().removed_from_conversation()) {
      const stringId = message_et.is_liked()
        ? z.string.conversationContextMenuUnlike
        : z.string.conversationContextMenuLike;

      entries.push({
        click: () => this.click_on_like(message_et, false),
        label: z.l10n.text(stringId),
      });
    }

    if (message_et.is_editable() && !this.conversation().removed_from_conversation()) {
      entries.push({
        click: () => amplify.publish(z.event.WebApp.CONVERSATION.MESSAGE.EDIT, message_et),
        label: z.l10n.text(z.string.conversationContextMenuEdit),
      });
    }

    if (message_et.isReplyable() && !this.conversation().removed_from_conversation()) {
      entries.push({
        click: () => amplify.publish(z.event.WebApp.CONVERSATION.MESSAGE.REPLY, message_et),
        label: z.l10n.text(z.string.conversationContextMenuReply),
      });
    }

    if (message_et.isCopyable()) {
      entries.push({
        click: () => message_et.copy(),
        label: z.l10n.text(z.string.conversationContextMenuCopy),
      });
    }

    if (message_et.is_deletable()) {
      entries.push({
        click: () => this.actionsViewModel.deleteMessage(this.conversation(), message_et),
        label: z.l10n.text(z.string.conversationContextMenuDelete),
      });
    }

    const isSendingMessage = message_et.status() === z.message.StatusType.SENDING;
    const canDelete = message_et.user().is_me && !this.conversation().removed_from_conversation() && !isSendingMessage;
    if (canDelete) {
      entries.push({
        click: () => this.actionsViewModel.deleteMessageEveryone(this.conversation(), message_et),
        label: z.l10n.text(z.string.conversationContextMenuDeleteEveryone),
      });
    }

    z.ui.Context.from(event, entries, 'message-options-menu');
  }

  handleClickOnMessage(messageEntity, event) {
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

  bindShowMore(elements, message) {
    const label = elements.find(element => element.className === 'message-header-label');
    if (!label) {
      return;
    }
    const link = label.querySelector('.message-header-show-more');
    if (link) {
      link.addEventListener('click', () =>
        this.mainViewModel.panel.togglePanel(
          z.viewModel.PanelViewModel.STATE.CONVERSATION_PARTICIPANTS,
          message.highlightedUsers()
        )
      );
    }
  }
};
