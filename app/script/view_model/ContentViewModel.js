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

z.viewModel.ContentViewModel = class ContentViewModel {
  constructor(mainViewModel, repositories) {
    this.show_conversation = this.show_conversation.bind(this);
    this.switch_content = this.switch_content.bind(this);
    this.switch_previous_content = this.switch_previous_content.bind(this);

    this.elementId = 'center-column';
    this.mainViewModel = mainViewModel;
    this.conversation_repository = repositories.conversation;
    this.user_repository = repositories.user;
    this.logger = new z.util.Logger('z.viewModel.ContentViewModel', z.config.LOGGER.OPTIONS);

    // State
    this.content_state = ko.observable(z.viewModel.content.CONTENT_STATE.WATERMARK);
    this.multitasking = {
      auto_minimize: ko.observable(true),
      is_minimized: ko.observable(false),
      reset_minimize: ko.observable(false),
    };

    // Nested view models
    this.collection_details = new z.viewModel.content.CollectionDetailsViewModel();
    this.collection = new z.viewModel.content.CollectionViewModel(mainViewModel, repositories);
    this.connect_requests = new z.viewModel.content.ConnectRequestsViewModel(mainViewModel, repositories);
    this.conversation_input = new z.viewModel.content.ConversationInputViewModel(mainViewModel, repositories);
    this.conversation_titlebar = new z.viewModel.content.ConversationTitlebarViewModel(this, repositories);
    this.giphy = new z.viewModel.content.GiphyViewModel(mainViewModel, repositories);
    this.groupCreation = new z.viewModel.content.GroupCreationViewModel(mainViewModel, repositories);
    this.message_list = new z.viewModel.content.MessageListViewModel(mainViewModel, repositories);
    this.video_calling = new z.viewModel.content.VideoCallingViewModel(this, repositories);

    this.preferencesAbout = new z.viewModel.content.PreferencesAboutViewModel(mainViewModel, repositories);
    this.preferences_account = new z.viewModel.content.PreferencesAccountViewModel(mainViewModel, repositories);
    this.preferences_av = new z.viewModel.content.PreferencesAVViewModel(mainViewModel, repositories);
    this.preferences_device_details = new z.viewModel.content.PreferencesDeviceDetailsViewModel(
      mainViewModel,
      repositories
    );
    this.preferences_devices = new z.viewModel.content.PreferencesDevicesViewModel(mainViewModel, repositories);
    this.preferences_options = new z.viewModel.content.PreferencesOptionsViewModel(mainViewModel, repositories);

    this.previous_state = undefined;
    this.previous_conversation = undefined;

    this.content_state.subscribe(content_state => {
      switch (content_state) {
        case z.viewModel.content.CONTENT_STATE.CONVERSATION:
          this.conversation_input.added_to_view();
          this.conversation_titlebar.added_to_view();
          break;
        case z.viewModel.content.CONTENT_STATE.PREFERENCES_ACCOUNT:
          this.preferences_account.check_new_clients();
          break;
        case z.viewModel.content.CONTENT_STATE.PREFERENCES_AV:
          this.preferences_av.initiate_devices();
          break;
        case z.viewModel.content.CONTENT_STATE.PREFERENCES_DEVICES:
          this.preferences_devices.update_device_info();
          break;
        case z.viewModel.content.CONTENT_STATE.COLLECTION:
          this.collection.set_conversation(this.previous_conversation);
          break;
        default:
          this.conversation_input.removed_from_view();
          this.conversation_titlebar.removed_from_view();
      }
    });

    this.user_repository.connect_requests.subscribe(requests => {
      const requests_state = this.content_state() === z.viewModel.content.CONTENT_STATE.CONNECTION_REQUESTS;
      if (requests_state && !requests.length) {
        this.show_conversation(this.conversation_repository.getMostRecentConversation());
      }
    });

    this._init_subscriptions();

    ko.applyBindings(this, document.getElementById(this.elementId));
  }

  _init_subscriptions() {
    amplify.subscribe(z.event.WebApp.CONTENT.SWITCH, this.switch_content.bind(this));
    amplify.subscribe(z.event.WebApp.CONVERSATION.SHOW, this.show_conversation.bind(this));
    amplify.subscribe(z.event.WebApp.LIST.SCROLL, this.conversation_input.show_separator);
    amplify.subscribe(z.event.WebApp.WINDOW.RESIZE.HEIGHT, this.message_list.scroll_height);
  }

  /**
   * Slide in specified content.
   * @param {string} content_selector - DOM element to apply slide in animation
   * @returns {undefined} No return value
   */
  _shift_content(content_selector) {
    const incoming_css_class = 'content-animation-incoming-horizontal-left';

    $(content_selector)
      .removeClass(incoming_css_class)
      .off(z.util.alias.animationend)
      .addClass(incoming_css_class)
      .one(z.util.alias.animationend, function() {
        $(this)
          .removeClass(incoming_css_class)
          .off(z.util.alias.animationend);
      });
  }

  /**
   * Opens the specified conversation.
   *
   * @note If the conversation_et is not defined, it will open the incoming connection requests instead
   *  Conversation_et can also just be the conversation ID
   *
   * @param {Conversation|string} conversation - Conversation entity or conversation ID
   * @param {z.entity.Message} [messageEt] - Message to scroll to
   * @returns {undefined} No return value
   */
  show_conversation(conversation, messageEt) {
    if (!conversation) {
      return this.switch_content(z.viewModel.content.CONTENT_STATE.CONNECTION_REQUESTS);
    }

    const isConversation = typeof conversation === 'object' && conversation.id;
    const isConversationId = typeof conversation === 'string';
    if (!isConversation && !isConversationId) {
      throw new Error(`Wrong input for conversation: ${typeof conversation}`);
    }

    const conversationPromise = isConversation
      ? Promise.resolve(conversation)
      : this.conversation_repository.get_conversation_by_id(conversation);

    conversationPromise.then(conversationEt => {
      const isActiveConversation = conversationEt === this.conversation_repository.active_conversation();
      const isConversationState = this.content_state() === z.viewModel.content.CONTENT_STATE.CONVERSATION;

      if (conversationEt && isActiveConversation && isConversationState) {
        return;
      }

      this._release_content(this.content_state());

      this.content_state(z.viewModel.content.CONTENT_STATE.CONVERSATION);
      this.conversation_repository.active_conversation(conversationEt);
      this.message_list.change_conversation(conversationEt, messageEt).then(() => {
        this._show_content(z.viewModel.content.CONTENT_STATE.CONVERSATION);
        this.mainViewModel.details.participants.changeConversation(conversationEt);
        this.previous_conversation = this.conversation_repository.active_conversation();
      });
    });
  }

  switch_content(new_content_state) {
    if (this.content_state() !== new_content_state) {
      this._release_content(new_content_state);
      this._show_content(this._check_content_availability(new_content_state));
    }
  }

  switch_previous_content() {
    if (this.previous_state !== this.content_state()) {
      if (this.previous_state === z.viewModel.content.CONTENT_STATE.CONNECTION_REQUESTS) {
        this.switch_content(z.viewModel.content.CONTENT_STATE.CONNECTION_REQUESTS);
      }

      if (this.previous_conversation && !this.previous_conversation.is_archived()) {
        return this.show_conversation(this.previous_conversation);
      }

      return this.switch_content(z.viewModel.content.CONTENT_STATE.WATERMARK);
    }
  }

  _check_content_availability(content_state) {
    if (content_state === z.viewModel.content.CONTENT_STATE.CONNECTION_REQUESTS) {
      if (!this.user_repository.connect_requests().length) {
        return z.viewModel.content.CONTENT_STATE.WATERMARK;
      }
    }
    return content_state;
  }

  _get_element_of_content(content_state) {
    switch (content_state) {
      case z.viewModel.content.CONTENT_STATE.COLLECTION:
        return '.collection';
      case z.viewModel.content.CONTENT_STATE.COLLECTION_DETAILS:
        return '.collection-details';
      case z.viewModel.content.CONTENT_STATE.CONVERSATION:
        return '.conversation';
      case z.viewModel.content.CONTENT_STATE.CONNECTION_REQUESTS:
        return '.connect-requests';
      case z.viewModel.content.CONTENT_STATE.PREFERENCES_ABOUT:
        return '.preferences-about';
      case z.viewModel.content.CONTENT_STATE.PREFERENCES_ACCOUNT:
        return '.preferences-account';
      case z.viewModel.content.CONTENT_STATE.PREFERENCES_AV:
        return '.preferences-av';
      case z.viewModel.content.CONTENT_STATE.PREFERENCES_DEVICE_DETAILS:
        return '.preferences-device-details';
      case z.viewModel.content.CONTENT_STATE.PREFERENCES_DEVICES:
        return '.preferences-devices';
      case z.viewModel.content.CONTENT_STATE.PREFERENCES_OPTIONS:
        return '.preferences-options';
      default:
        return '.watermark';
    }
  }

  _release_content(new_content_state) {
    this.previous_state = this.content_state();

    const conversation_state = this.previous_state === z.viewModel.content.CONTENT_STATE.CONVERSATION;
    if (conversation_state) {
      const collection_states = [
        z.viewModel.content.CONTENT_STATE.COLLECTION,
        z.viewModel.content.CONTENT_STATE.COLLECTION_DETAILS,
      ];
      if (!collection_states.includes(new_content_state)) {
        this.conversation_repository.active_conversation(null);
      }

      return this.message_list.release_conversation();
    }

    const preferences_av_state = this.previous_state === z.viewModel.content.CONTENT_STATE.PREFERENCES_AV;
    if (preferences_av_state) {
      this.preferences_av.release_devices();
    }
  }

  _show_content(new_content_state) {
    this.content_state(new_content_state);
    return this._shift_content(this._get_element_of_content(new_content_state));
  }
};
