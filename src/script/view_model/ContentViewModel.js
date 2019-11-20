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

import {getLogger} from 'Util/Logger';
import {t} from 'Util/LocalizerUtil';
import {alias} from 'Util/util';

import {Config} from '../Config';
import {MessageListViewModel} from './content/MessageListViewModel';
import {UserModalViewModel} from './content/UserModalViewModel';
import {LegalHoldModalViewModel} from './content/LegalHoldModalViewModel';
import {GroupCreationViewModel} from './content/GroupCreationViewModel';
import {EmojiInputViewModel} from './content/EmojiInputViewModel';
import {ModalsViewModel} from './ModalsViewModel';
import {WebAppEvents} from '../event/WebApp';
import {PreferencesAVViewModel} from './content/PreferencesAVViewModel.js';
import {ServiceModalViewModel} from './content/ServiceModalViewModel';
import {InviteModalViewModel} from './content/InviteModalViewModel';

export class ContentViewModel {
  static get STATE() {
    return {
      COLLECTION: 'ContentViewModel.STATE.COLLECTION',
      COLLECTION_DETAILS: 'ContentViewModel.STATE.COLLECTION_DETAILS',
      CONNECTION_REQUESTS: 'ContentViewModel.STATE.CONNECTION_REQUESTS',
      CONVERSATION: 'ContentViewModel.STATE.CONVERSATION',
      HISTORY_EXPORT: 'ContentViewModel.STATE.HISTORY_EXPORT',
      HISTORY_IMPORT: 'ContentViewModel.STATE.HISTORY_IMPORT',
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
    this.switchContent = this.switchContent.bind(this);
    this.switchPreviousContent = this.switchPreviousContent.bind(this);

    this.elementId = 'center-column';
    this.mainViewModel = mainViewModel;
    this.conversationRepository = repositories.conversation;
    this.userRepository = repositories.user;
    this.logger = getLogger('ContentViewModel');
    this.STATE = ContentViewModel.STATE;

    // State
    this.state = ko.observable(ContentViewModel.STATE.WATERMARK);

    // Nested view models
    this.collectionDetails = new z.viewModel.content.CollectionDetailsViewModel();
    this.collection = new z.viewModel.content.CollectionViewModel(mainViewModel, this, repositories);
    this.connectRequests = new z.viewModel.content.ConnectRequestsViewModel(mainViewModel, this, repositories);
    this.emojiInput = new EmojiInputViewModel(repositories.properties);
    this.giphy = new z.viewModel.content.GiphyViewModel(mainViewModel, this, repositories);
    this.inputBar = new z.viewModel.content.InputBarViewModel(mainViewModel, this, repositories);
    this.groupCreation = new GroupCreationViewModel(
      repositories.conversation,
      repositories.search,
      repositories.team,
      repositories.user,
    );
    this.userModal = new UserModalViewModel(repositories.user, mainViewModel.actions);
    this.serviceModal = new ServiceModalViewModel(repositories.integration, mainViewModel.actions);
    this.inviteModal = new InviteModalViewModel(repositories.user);
    this.legalHoldModal = new LegalHoldModalViewModel(
      repositories.user,
      repositories.conversation,
      repositories.team,
      repositories.client,
      repositories.cryptography,
    );
    this.messageList = new MessageListViewModel(mainViewModel, this, repositories);
    this.titleBar = new z.viewModel.content.TitleBarViewModel(
      mainViewModel.calling,
      mainViewModel.panel,
      this,
      repositories,
    );

    this.preferencesAbout = new z.viewModel.content.PreferencesAboutViewModel(mainViewModel, this, repositories);
    this.preferencesAccount = new z.viewModel.content.PreferencesAccountViewModel(mainViewModel, this, repositories);
    this.preferencesAV = new PreferencesAVViewModel(repositories.media, repositories.user, {
      mediaSourceChanged: repositories.calling.changeMediaSource.bind(repositories.calling),
      willChangeMediaSource: repositories.calling.stopMediaSource.bind(repositories.calling),
    });
    this.preferencesDeviceDetails = new z.viewModel.content.PreferencesDeviceDetailsViewModel(
      mainViewModel,
      this,
      repositories,
    );
    this.preferencesDevices = new z.viewModel.content.PreferencesDevicesViewModel(mainViewModel, this, repositories);
    this.preferencesOptions = new z.viewModel.content.PreferencesOptionsViewModel(repositories);

    this.historyExport = new z.viewModel.content.HistoryExportViewModel(mainViewModel, this, repositories);
    this.historyImport = new z.viewModel.content.HistoryImportViewModel(mainViewModel, this, repositories);

    this.previousState = undefined;
    this.previousConversation = undefined;

    this.state.subscribe(state => {
      switch (state) {
        case ContentViewModel.STATE.CONVERSATION:
          this.inputBar.addedToView();
          this.titleBar.addedToView();
          break;
        case ContentViewModel.STATE.PREFERENCES_ACCOUNT:
          this.preferencesAccount.popNotification();
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
          this.inputBar.removedFromView();
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
    if (repositories.team.supportsLegalHold()) {
      this.legalHoldModal.showRequestModal();
    }
    ko.applyBindings(this, document.getElementById(this.elementId));
  }

  _initSubscriptions() {
    amplify.subscribe(WebAppEvents.CONTENT.SWITCH, this.switchContent.bind(this));
    amplify.subscribe(WebAppEvents.CONVERSATION.SHOW, this.showConversation);
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
      .off(alias.animationend)
      .addClass(incomingCssClass)
      .one(alias.animationend, function() {
        $(this)
          .removeClass(incomingCssClass)
          .off(alias.animationend);
      });
  }

  /**
   * Opens the specified conversation.
   *
   * @note If the conversation_et is not defined, it will open the incoming connection requests instead
   *  Conversation_et can also just be the conversation ID
   *
   * @param {Conversation|string} conversation - Conversation entity or conversation ID
   * @param {Object} options - State to open conversation in
   * @param {Message} [options.exposeMessage] - Scroll to message and highlight it
   * @param {boolean} [options.openFirstSelfMention=false] - Open first self mention instead of passed message
   * @param {boolean} [options.openNotificationSettings=false] - Open notification settings of conversation
   * @returns {undefined} No return value
   */
  showConversation = (conversation, options = {}) => {
    const {
      exposeMessage: exposeMessageEntity,
      openFirstSelfMention = false,
      openNotificationSettings = false,
    } = options;

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

    conversationPromise
      .then(conversationEntity => {
        if (!conversationEntity) {
          throw new z.error.ConversationError(z.error.ConversationError.TYPE.CONVERSATION_NOT_FOUND);
        }
        const isActiveConversation = this.conversationRepository.is_active_conversation(conversationEntity);
        const isConversationState = this.state() === ContentViewModel.STATE.CONVERSATION;
        const isOpenedConversation = conversationEntity && isActiveConversation && isConversationState;

        if (isOpenedConversation) {
          if (openNotificationSettings) {
            this.mainViewModel.panel.togglePanel(z.viewModel.PanelViewModel.STATE.NOTIFICATIONS);
          }
          return;
        }

        this._releaseContent(this.state());

        this.state(ContentViewModel.STATE.CONVERSATION);
        this.mainViewModel.list.openConversations();

        if (!isActiveConversation) {
          this.conversationRepository.active_conversation(conversationEntity);
        }

        const messageEntity = openFirstSelfMention
          ? conversationEntity.getFirstUnreadSelfMention()
          : exposeMessageEntity;

        if (conversationEntity.is_cleared()) {
          conversationEntity.cleared_timestamp(0);
        }

        const unarchivePromise = conversationEntity.is_archived()
          ? this.conversationRepository.unarchiveConversation(conversationEntity)
          : Promise.resolve();

        unarchivePromise.then(() => {
          this.messageList.changeConversation(conversationEntity, messageEntity).then(() => {
            this._showContent(ContentViewModel.STATE.CONVERSATION);
            this.previousConversation = this.conversationRepository.active_conversation();
            if (openNotificationSettings) {
              this.mainViewModel.panel.togglePanel(z.viewModel.PanelViewModel.STATE.NOTIFICATIONS);
            }
          });
        });
      })
      .catch(error => {
        const isConversationNotFound = error.type === z.error.ConversationError.TYPE.CONVERSATION_NOT_FOUND;
        if (isConversationNotFound) {
          this.mainViewModel.modals.showModal(ModalsViewModel.TYPE.ACKNOWLEDGE, {
            text: {
              message: t('conversationNotFoundMessage'),
              title: t('conversationNotFoundTitle', Config.BRAND_NAME),
            },
          });
        } else {
          throw error;
        }
      });
  };

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
      const previousId = this.previousConversation && this.previousConversation.id;
      const repoHasConversation = this.conversationRepository.conversations().some(({id}) => id === previousId);

      if (this.previousConversation && repoHasConversation && !this.previousConversation.is_archived()) {
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
}
