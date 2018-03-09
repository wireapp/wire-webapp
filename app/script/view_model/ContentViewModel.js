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
  static get STATE() {
    return {
      COLLECTION: 'ContentViewModel.STATE.COLLECTION',
      COLLECTION_DETAILS: 'ContentViewModel.STATE.COLLECTION_DETAILS',
      CONNECTION_REQUESTS: 'ContentViewModel.STATE.CONNECTION_REQUESTS',
      CONVERSATION: 'ContentViewModel.STATE.CONVERSATION',
      PREFERENCES_ABOUT: 'ContentViewModel.STATE.PREFERENCES_ABOUT',
      PREFERENCES_ACCOUNT: 'ContentViewModel.STATE.PREFERENCES_ACCOUNT',
      PREFERENCES_AV: 'ContentViewModel.STATE.PREFERENCES_AV',
      PREFERENCES_DEVICE_DETAILS: 'ContentViewModel.STATE.PREFERENCES_DEVICE_DETAILS',
      PREFERENCES_DEVICES: 'ContentViewModel.STATE.PREFERENCES_DEVICES',
      PREFERENCES_OPTIONS: 'ContentViewModel.STATE.PREFERENCES_OPTIONS',
      WATERMARK: 'ContentViewModel.STATE.WATERMARK',
    };
  }

  constructor(mainViewModel, repositories) {
    this.showConversation = this.showConversation.bind(this);
    this.switchContent = this.switchContent.bind(this);
    this.switchPreviousContent = this.switchPreviousContent.bind(this);

    this.elementId = 'center-column';
    this.mainViewModel = mainViewModel;
    this.conversationRepository = repositories.conversation;
    this.userRepository = repositories.user;
    this.logger = new z.util.Logger('z.viewModel.ContentViewModel', z.config.LOGGER.OPTIONS);

    // State
    this.state = ko.observable(ContentViewModel.STATE.WATERMARK);
    this.multitasking = {
      autoMinimize: ko.observable(true),
      isMinimized: ko.observable(false),
      resetMinimize: ko.observable(false),
    };

    // Nested view models
    this.collectionDetails = new z.viewModel.content.CollectionDetailsViewModel();
    this.collection = new z.viewModel.content.CollectionViewModel(mainViewModel, this, repositories);
    this.connectRequests = new z.viewModel.content.ConnectRequestsViewModel(mainViewModel, this, repositories);
    this.emojiInput = new z.viewModel.content.EmojiInputViewModel(mainViewModel, this, repositories);
    this.giphy = new z.viewModel.content.GiphyViewModel(mainViewModel, this, repositories);
    this.inputBar = new z.viewModel.content.InputBarViewModel(mainViewModel, this, repositories);
    this.groupCreation = new z.viewModel.content.GroupCreationViewModel(mainViewModel, this, repositories);
    this.messageList = new z.viewModel.content.MessageListViewModel(mainViewModel, this, repositories);
    this.titleBar = new z.viewModel.content.TitleBarViewModel(mainViewModel, this, repositories);

    this.preferencesAbout = new z.viewModel.content.PreferencesAboutViewModel(mainViewModel, this, repositories);
    this.preferencesAccount = new z.viewModel.content.PreferencesAccountViewModel(mainViewModel, this, repositories);
    this.preferencesAV = new z.viewModel.content.PreferencesAVViewModel(mainViewModel, this, repositories);
    this.preferencesDeviceDetails = new z.viewModel.content.PreferencesDeviceDetailsViewModel(
      mainViewModel,
      this,
      repositories
    );
    this.preferencesDevices = new z.viewModel.content.PreferencesDevicesViewModel(mainViewModel, this, repositories);
    this.preferencesOptions = new z.viewModel.content.PreferencesOptionsViewModel(mainViewModel, this, repositories);

    this.previousState = undefined;
    this.previousConversation = undefined;

    this.state.subscribe(state => {
      switch (state) {
        case ContentViewModel.STATE.CONVERSATION:
          this.inputBar.added_to_view();
          this.titleBar.addedToView();
          break;
        case ContentViewModel.STATE.PREFERENCES_ACCOUNT:
          this.preferencesAccount.check_new_clients();
          break;
        case ContentViewModel.STATE.PREFERENCES_AV:
          this.preferencesAV.initiateDevices();
          break;
        case ContentViewModel.STATE.PREFERENCES_DEVICES:
          this.preferencesDevices.updateDeviceInfo();
          break;
        case ContentViewModel.STATE.COLLECTION:
          this.collection.setConversation(this.previousConversation);
          break;
        default:
          this.inputBar.removed_from_view();
          this.titleBar.removedFromView();
      }
    });

    this.userRepository.connect_requests.subscribe(requests => {
      const isStateRequests = this.state() === ContentViewModel.STATE.CONNECTION_REQUESTS;
      if (isStateRequests && !requests.length) {
        this.showConversation(this.conversationRepository.getMostRecentConversation());
      }
    });

    this._initSubscriptions();

    ko.applyBindings(this, document.getElementById(this.elementId));
  }

  _initSubscriptions() {
    amplify.subscribe(z.event.WebApp.CONTENT.SWITCH, this.switchContent.bind(this));
    amplify.subscribe(z.event.WebApp.CONVERSATION.SHOW, this.showConversation.bind(this));
    amplify.subscribe(z.event.WebApp.LIST.SCROLL, this.inputBar.show_separator);
    amplify.subscribe(z.event.WebApp.WINDOW.RESIZE.HEIGHT, this.messageList.scroll_height);
  }

  /**
   * Slide in specified content.
   * @param {string} contentSelector - DOM element to apply slide in animation
   * @returns {undefined} No return value
   */
  _shiftContent(contentSelector) {
    const incomingCssClass = 'content-animation-incoming-horizontal-left';

    $(contentSelector)
      .removeClass(incomingCssClass)
      .off(z.util.alias.animationend)
      .addClass(incomingCssClass)
      .one(z.util.alias.animationend, function() {
        $(this)
          .removeClass(incomingCssClass)
          .off(z.util.alias.animationend);
      });
  }

  /**
   * Opens the specified conversation.
   *
   * @note If the conversation_et is not defined, it will open the incoming connection requests instead
   *  Conversation_et can also just be the conversation ID
   *
   * @param {z.entity.Conversation|string} conversation - Conversation entity or conversation ID
   * @param {z.entity.Message} [messageEntity] - Message to scroll to
   * @returns {undefined} No return value
   */
  showConversation(conversation, messageEntity) {
    if (!conversation) {
      return this.switchContent(ContentViewModel.STATE.CONNECTION_REQUESTS);
    }

    const isConversation = typeof conversation === 'object' && conversation.id;
    const isConversationId = typeof conversation === 'string';
    if (!isConversation && !isConversationId) {
      throw new Error(`Wrong input for conversation: ${typeof conversation}`);
    }

    const conversationPromise = isConversation
      ? Promise.resolve(conversation)
      : this.conversationRepository.get_conversation_by_id(conversation);

    conversationPromise.then(conversationEntity => {
      const isActiveConversation = conversationEntity === this.conversationRepository.active_conversation();
      const isConversationState = this.state() === ContentViewModel.STATE.CONVERSATION;

      if (conversationEntity && isActiveConversation && isConversationState) {
        return;
      }

      this._releaseContent(this.state());

      this.state(ContentViewModel.STATE.CONVERSATION);

      if (!isActiveConversation) {
        this.conversationRepository.active_conversation(conversationEntity);
      }

      this.messageList.change_conversation(conversationEntity, messageEntity).then(() => {
        this._showContent(ContentViewModel.STATE.CONVERSATION);
        this.previousConversation = this.conversationRepository.active_conversation();
      });
    });
  }

  switchContent(newContentState) {
    const isStateChange = newContentState !== this.state();
    if (isStateChange) {
      this._releaseContent(newContentState);
      this._showContent(this._checkContentAvailability(newContentState));
    }
  }

  switchPreviousContent() {
    const isStateChange = this.previousState !== this.state();
    if (isStateChange) {
      const isStateRequests = this.previousState === ContentViewModel.STATE.CONNECTION_REQUESTS;
      if (isStateRequests) {
        this.switchContent(ContentViewModel.STATE.CONNECTION_REQUESTS);
      }

      if (this.previousConversation && !this.previousConversation.is_archived()) {
        return this.showConversation(this.previousConversation);
      }

      return this.switchContent(ContentViewModel.STATE.WATERMARK);
    }
  }

  _checkContentAvailability(state) {
    const isStateRequests = state === ContentViewModel.STATE.CONNECTION_REQUESTS;
    if (isStateRequests) {
      const hasConnectRequests = !!this.userRepository.connect_requests().length;
      if (!hasConnectRequests) {
        return ContentViewModel.STATE.WATERMARK;
      }
    }
    return state;
  }

  _getElementOfContent(state) {
    switch (state) {
      case ContentViewModel.STATE.COLLECTION:
        return '.collection';
      case ContentViewModel.STATE.COLLECTION_DETAILS:
        return '.collection-details';
      case ContentViewModel.STATE.CONVERSATION:
        return '.conversation';
      case ContentViewModel.STATE.CONNECTION_REQUESTS:
        return '.connect-requests';
      case ContentViewModel.STATE.PREFERENCES_ABOUT:
        return '.preferences-about';
      case ContentViewModel.STATE.PREFERENCES_ACCOUNT:
        return '.preferences-account';
      case ContentViewModel.STATE.PREFERENCES_AV:
        return '.preferences-av';
      case ContentViewModel.STATE.PREFERENCES_DEVICE_DETAILS:
        return '.preferences-device-details';
      case ContentViewModel.STATE.PREFERENCES_DEVICES:
        return '.preferences-devices';
      case ContentViewModel.STATE.PREFERENCES_OPTIONS:
        return '.preferences-options';
      default:
        return '.watermark';
    }
  }

  _releaseContent(newContentState) {
    this.previousState = this.state();

    const isStateConversation = this.previousState === ContentViewModel.STATE.CONVERSATION;
    if (isStateConversation) {
      const collectionStates = [ContentViewModel.STATE.COLLECTION, ContentViewModel.STATE.COLLECTION_DETAILS];
      const isCollectionState = collectionStates.includes(newContentState);
      if (!isCollectionState) {
        this.conversationRepository.active_conversation(null);
      }

      return this.messageList.release_conversation();
    }

    const isStatePreferencesAv = this.previousState === ContentViewModel.STATE.PREFERENCES_AV;
    if (isStatePreferencesAv) {
      this.preferencesAV.releaseDevices();
    }
  }

  _showContent(newContentState) {
    this.state(newContentState);
    return this._shiftContent(this._getElementOfContent(newContentState));
  }
};
