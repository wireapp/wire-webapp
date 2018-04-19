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
 * @todo Get rid of the $('.conversation') opacity
 * @todo Get rid of the participants dependencies whenever bubble implementation has changed
 * @todo Remove all jquery selectors
 */
z.viewModel.content.MessageListViewModel = class MessageListViewModel {
  constructor(mainViewModel, contentViewModel, repositories) {
    this._on_message_add = this._on_message_add.bind(this);
    this.click_on_cancel_request = this.click_on_cancel_request.bind(this);
    this.click_on_like = this.click_on_like.bind(this);
    this.clickOnInvitePeople = this.clickOnInvitePeople.bind(this);
    this.get_timestamp_class = this.get_timestamp_class.bind(this);
    this.is_last_delivered_message = this.is_last_delivered_message.bind(this);
    this.on_context_menu_click = this.on_context_menu_click.bind(this);
    this.onMessageUserClick = this.onMessageUserClick.bind(this);
    this.on_session_reset_click = this.on_session_reset_click.bind(this);
    this.should_hide_user_avatar = this.should_hide_user_avatar.bind(this);

    this.mainViewModel = mainViewModel;
    this.conversation_repository = repositories.conversation;
    this.userRepository = repositories.user;
    this.logger = new z.util.Logger('z.viewModel.content.MessageListViewModel', z.config.LOGGER.OPTIONS);

    this.actionsViewModel = this.mainViewModel.actions;
    this.selfUser = this.userRepository.self;

    this.conversation = ko.observable(new z.entity.Conversation());
    this.center_messages = ko.pureComputed(() => {
      const [firstVisibleMessage] = this.conversation().messages_visible();
      if (firstVisibleMessage && firstVisibleMessage.is_member()) {
        return this.conversation().messages_visible().length === 1 && firstVisibleMessage.isConnection();
      }
    });

    // Message that should be focused
    this.marked_message = ko.observable(undefined);

    // Store last read to show until user switches conversation
    this.conversation_last_read_timestamp = ko.observable(undefined);

    // @todo We should align this with hasAdditionalMessages
    this.conversation_reached_bottom = false;

    // Store conversation to mark as read when browser gets focus
    this.mark_as_read_on_focus = undefined;

    // Can be used to prevent scroll handler from being executed (e.g. when using scrollTop())
    this.capture_scrolling_event = false;

    // Store message subscription id
    this.messages_subscription = undefined;

    this.viewport_changed = ko.observable(false);
    this.viewport_changed.extend({rateLimit: 100});

    this.recalculate_timeout = undefined;

    // Should we scroll to bottom when new message comes in
    this.should_scroll_to_bottom = true;

    // Check if the message container is to small and then pull new events
    this.on_mouse_wheel = _.throttle(event => {
      const is_not_scrollable = !$(event.currentTarget).isScrollable();
      const is_scrolling_up = event.deltaY > 0;

      if (is_not_scrollable && is_scrolling_up) {
        return this._pull_messages();
      }
    }, 200);

    this.on_scroll = _.throttle((data, event) => {
      if (this.capture_scrolling_event) {
        this.viewport_changed(!this.viewport_changed());

        const element = $(event.currentTarget);

        // On some HDPI screen scrollTop returns a floating point number instead of an integer
        // https://github.com/jquery/api.jquery.com/issues/608
        const scroll_position = Math.ceil(element.scrollTop());
        const scrollEnd = element.scrollEnd();

        if (scroll_position === 0) {
          this._pull_messages();
        }

        if (scroll_position >= scrollEnd) {
          if (!this.conversation_reached_bottom) {
            this._push_messages();
          }

          this._mark_conversation_as_read_on_focus(this.conversation());
        }

        this.should_scroll_to_bottom = scroll_position > scrollEnd - z.config.SCROLL_TO_LAST_MESSAGE_THRESHOLD;
      }
    }, 100);

    $(window)
      .on('resize', () => {
        this.viewport_changed(!this.viewport_changed());
      })
      .on('focus', () => {
        if (this.mark_as_read_on_focus) {
          window.setTimeout(() => {
            this.conversation_repository.mark_as_read(this.mark_as_read_on_focus);
            this.mark_as_read_on_focus = undefined;
          }, 1000);
        }
      });

    this.showInvitePeople = ko.pureComputed(() => {
      return (
        this.conversation().isActiveParticipant() && this.conversation().inTeam() && this.conversation().isGuestRoom()
      );
    });

    amplify.subscribe(z.event.WebApp.CONVERSATION.INPUT.CLICK, this.on_conversation_input_click.bind(this));
  }

  /**
   * Mark conversation as read if window has focus
   * @param {z.entity.Conversation} conversation_et - Conversation entity to mark as read
   * @returns {undefined} No return value
   */
  _mark_conversation_as_read_on_focus(conversation_et) {
    if (document.hasFocus()) {
      return this.conversation_repository.mark_as_read(conversation_et);
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
    if (this.messages_subscription) {
      this.messages_subscription.dispose();
    }
    this.capture_scrolling_event = false;
    this.conversation_last_read_timestamp(false);
    this.conversation_reached_bottom = false;
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
    if (this.conversation()) {
      this.release_conversation(this.conversation());
    }

    // Update new conversation
    this.conversation(conversationEntity);
    this.marked_message(messageEntity);

    // Keep last read timestamp to render unread when entering conversation
    if (this.conversation().unread_event_count()) {
      this.conversation_last_read_timestamp(this.conversation().last_read_timestamp());
    }

    // @todo Rethink conversation.is_loaded
    if (conversationEntity.is_loaded()) {
      return this._render_conversation(conversationEntity);
    }

    return this.conversation_repository
      .updateParticipatingUserEntities(conversationEntity, false, true)
      .then(_conversationEntity => {
        return this.marked_message()
          ? this.conversation_repository.get_messages_with_offset(_conversationEntity, this.marked_message())
          : this.conversation_repository.getPrecedingMessages(_conversationEntity);
      })
      .then(() => {
        const lastMessageEntity = this.conversation().getLastMessage();
        if (lastMessageEntity && lastMessageEntity.timestamp() === this.conversation().last_event_timestamp()) {
          this.conversation_reached_bottom = true;
        }
        conversationEntity.is_loaded(true);
        return this._render_conversation(conversationEntity);
      });
  }

  /**
   * Sets the conversation and waits for further processing until knockout has rendered the messages.
   * @param {z.entity.Conversation} conversation_et - Conversation entity to set
   * @returns {Promise} Resolves when conversation was rendered
   */
  _render_conversation(conversation_et) {
    // Hide conversation until everything is processed
    $('.conversation').css({opacity: 0});

    const messages_container = $('.messages-wrap');
    messages_container.on('mousewheel', this.on_mouse_wheel);

    const is_current_conversation = conversation_et === this.conversation();
    if (!is_current_conversation) {
      this.logger.info(`Skipped re-loading current conversation '${conversation_et.display_name()}'`);
      return Promise.resolve();
    }

    return new Promise(resolve => {
      window.setTimeout(() => {
        // Reset scroll position
        messages_container.scrollTop(0);

        this.capture_scrolling_event = true;

        if (messages_container.isScrollable()) {
          const unread_message = $('.message-timestamp-unread');

          if (this.marked_message()) {
            this._focus_message(this.marked_message());
          } else if (unread_message.length) {
            const unread_message_position = unread_message
              .parent()
              .parent()
              .position();

            messages_container.scrollBy(unread_message_position.top);
          } else {
            messages_container.scrollToBottom();
          }
        } else {
          this.conversation_repository.mark_as_read(conversation_et);
        }

        $('.conversation').css({opacity: 1});

        // Subscribe for incoming messages
        this.messages_subscription = conversation_et.messages_visible.subscribe(
          this._on_message_add,
          null,
          'arrayChange'
        );
        resolve();
      }, 100);
    });
  }

  /**
   * Checks how to scroll message list and if conversation should be marked as unread.
   * @param {Array} messages - Message entities
   * @returns {undefined} No return value
   */
  _on_message_add(messages) {
    const messages_container = $('.messages-wrap');
    const last_item = messages[messages.length - 1];
    const last_message = last_item.value;

    // We are only interested in items that were added
    if (last_item.status !== 'added') {
      return;
    }

    if (last_message) {
      // Message was prepended
      if (last_message.timestamp() < this.conversation().last_event_timestamp()) {
        return;
      }

      // Scroll to bottom if self user send the message
      if (last_message.from === this.selfUser().id) {
        window.requestAnimationFrame(() => messages_container.scrollToBottom());
        return;
      }
    }

    // Scroll to the end of the list if we are under a certain threshold
    if (this.should_scroll_to_bottom) {
      window.requestAnimationFrame(() => messages_container.scrollToBottom());

      if (document.hasFocus()) {
        this.conversation_repository.mark_as_read(this.conversation());
      }
    }

    // Mark as read when conversation is not scrollable
    if (!messages_container.isScrollable()) {
      this._mark_conversation_as_read_on_focus(this.conversation());
    }
  }

  /**
   * Fetch older messages beginning from the oldest message in view
   * @returns {undefined} No return value
   */
  _pull_messages() {
    if (!this.conversation().is_pending() && this.conversation().hasAdditionalMessages()) {
      const inner_container = $('.messages-wrap').children()[0];
      const old_list_height = inner_container.scrollHeight;

      this.capture_scrolling_event = false;
      this.conversation_repository.getPrecedingMessages(this.conversation()).then(() => {
        const new_list_height = inner_container.scrollHeight;
        $('.messages-wrap').scrollTop(new_list_height - old_list_height);
        this.capture_scrolling_event = true;
      });
    }
  }

  /**
   * Fetch newer messages beginning from the newest message in view
   * @returns {undefined} No return value
   */
  _push_messages() {
    const last_message = this.conversation().getLastMessage();

    if (last_message && !this.conversation_reached_bottom) {
      this.capture_scrolling_event = false;
      this.conversation_repository
        .get_subsequent_messages(this.conversation(), last_message, false)
        .then(message_ets => {
          if (!message_ets.length) {
            this.conversation_reached_bottom = true;
          }
          this.capture_scrolling_event = true;
        });
    }
  }

  /**
   * Scroll to given message in the list.
   *
   * @note Ideally message is centered horizontally
   * @param {z.entity.Message} message_et - Target message
   * @returns {undefined} No return value
   */
  _focus_message(message_et) {
    const message_element = $(`.message[data-uie-uid="${message_et.id}"]`);

    if (message_element.length) {
      const message_list_element = $('.messages-wrap');
      message_list_element.scrollBy(message_element.offset().top - message_list_element.height() / 2);
    }
  }

  scroll_height(change_in_height) {
    $('.messages-wrap').scrollBy(change_in_height);
  }

  on_conversation_input_click() {
    if (this.conversation_reached_bottom) {
      return $('.messages-wrap').scrollToBottom();
    }

    this.conversation().remove_messages();
    this.conversation_repository
      .getPrecedingMessages(this.conversation())
      .then(() => $('.messages-wrap').scrollToBottom());
  }

  /**
   * Triggered when user clicks on an avatar in the message list.
   * @param {z.entity.User} userEntity - User entity of the selected user
   * @returns {undefined} No return value
   */
  onMessageUserClick(userEntity) {
    amplify.publish(z.event.WebApp.PEOPLE.SHOW, userEntity);
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

  /**
   * Gets CSS class that will be applied to the message div in order to style.
   * @param {z.entity.Message} message - Message entity for generating css class
   * @returns {string} CSS class that is applied to the element
   */
  get_css_class(message) {
    switch (message.super_type) {
      case z.message.SuperType.CALL:
        return 'message-system message-call';
      case z.message.SuperType.CONTENT:
        return 'message-normal';
      case z.message.SuperType.MEMBER:
        return 'message message-system message-member';
      case z.message.SuperType.PING:
        return 'message-ping';
      case z.message.SuperType.SYSTEM:
        if (message.system_message_type === z.message.SystemMessageType.CONVERSATION_RENAME) {
          return 'message-system message-rename';
        }
        break;
      case z.message.SuperType.UNABLE_TO_DECRYPT:
        return 'message-system';
      case z.message.SuperType.VERIFICATION:
        return 'message-system';
      default:
        break;
    }
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
    return this.conversation().get_last_delivered_message() === message_et;
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
    this.mainViewModel.panel.switchState(z.viewModel.PanelViewModel.STATE.GUEST_OPTIONS);
  }

  /**
   * Message appeared in viewport.
   * @param {z.entity.Message} message_et - Message to check
   * @returns {boolean} Message is in viewport
   */
  message_in_viewport(message_et) {
    if (!message_et.is_ephemeral()) {
      return true;
    }

    if (document.hasFocus()) {
      this.conversation_repository.check_ephemeral_timer(message_et);
    } else {
      const start_timer_on_focus = this.conversation.id;

      $(window).one('focus', () => {
        if (start_timer_on_focus === this.conversation.id) {
          this.conversation_repository.check_ephemeral_timer(message_et);
        }
      });
    }

    return true;
  }

  on_context_menu_click(message_et, event) {
    const entries = [];

    if (message_et.is_downloadable() && !message_et.is_ephemeral()) {
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
};
