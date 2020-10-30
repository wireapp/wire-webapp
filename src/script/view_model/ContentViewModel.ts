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

import {getLogger, Logger} from 'Util/Logger';
import {t} from 'Util/LocalizerUtil';
import {alias} from 'Util/util';
import ko from 'knockout';
import {amplify} from 'amplify';

import {Config} from '../Config';
import {MessageListViewModel} from './content/MessageListViewModel';
import {UserModalViewModel} from './content/UserModalViewModel';
import {LegalHoldModalViewModel} from './content/LegalHoldModalViewModel';
import {GroupCreationViewModel} from './content/GroupCreationViewModel';
import {EmojiInputViewModel} from './content/EmojiInputViewModel';
import {ModalsViewModel} from './ModalsViewModel';
import {PreferencesAVViewModel} from './content/PreferencesAVViewModel';
import {ServiceModalViewModel} from './content/ServiceModalViewModel';
import {InviteModalViewModel} from './content/InviteModalViewModel';
import {PreferencesOptionsViewModel} from './content/PreferencesOptionsViewModel';
import {ConversationError} from '../error/ConversationError';
import {CollectionViewModel} from './content/CollectionViewModel';
import {ConnectRequestsViewModel} from './content/ConnectRequestsViewModel';
import {CollectionDetailsViewModel} from './content/CollectionDetailsViewModel';
import {GiphyViewModel} from './content/GiphyViewModel';
import {HistoryImportViewModel} from './content/HistoryImportViewModel';
import {HistoryExportViewModel} from './content/HistoryExportViewModel';
import {PreferencesAccountViewModel} from './content/PreferencesAccountViewModel';
import {TitleBarViewModel} from './content/TitleBarViewModel';
import {PreferencesAboutViewModel} from './content/PreferencesAboutViewModel';
import {PreferencesDevicesViewModel} from './content/PreferencesDevicesViewModel';
import {PreferencesDeviceDetailsViewModel} from './content/PreferencesDeviceDetailsViewModel';
import {InputBarViewModel} from './content/InputBarViewModel';
import {MediaType} from '../media/MediaType';
import {PanelViewModel} from './PanelViewModel';
import type {MainViewModel, ViewModelRepositories} from './MainViewModel';
import type {ConversationRepository} from '../conversation/ConversationRepository';
import type {UserRepository} from '../user/UserRepository';
import type {Conversation} from '../entity/Conversation';
import type {Message} from '../entity/message/Message';
import {container} from 'tsyringe';
import {UserState} from '../user/UserState';
import {TeamState} from '../team/TeamState';
import {ConversationState} from '../conversation/ConversationState';

interface ShowConversationOptions {
  exposeMessage?: Message;
  openFirstSelfMention?: boolean;
  openNotificationSettings?: boolean;
}

export class ContentViewModel {
  private readonly userState: UserState;
  private readonly teamState: TeamState;
  private readonly conversationState: ConversationState;

  collection: CollectionViewModel;
  collectionDetails: CollectionDetailsViewModel;
  connectRequests: ConnectRequestsViewModel;
  conversationRepository: ConversationRepository;
  elementId: string;
  emojiInput: EmojiInputViewModel;
  giphy: GiphyViewModel;
  groupCreation: GroupCreationViewModel;
  historyExport: HistoryExportViewModel;
  historyImport: HistoryImportViewModel;
  inputBar: InputBarViewModel;
  inviteModal: InviteModalViewModel;
  legalHoldModal: LegalHoldModalViewModel;
  logger: Logger;
  mainViewModel: MainViewModel;
  messageList: MessageListViewModel;
  preferencesAbout: PreferencesAboutViewModel;
  preferencesAccount: PreferencesAccountViewModel;
  preferencesAV: PreferencesAVViewModel;
  preferencesDeviceDetails: PreferencesDeviceDetailsViewModel;
  preferencesDevices: PreferencesDevicesViewModel;
  preferencesOptions: PreferencesOptionsViewModel;
  previousConversation: Conversation;
  previousState: string;
  serviceModal: ServiceModalViewModel;
  state: ko.Observable<string>;
  State: typeof ContentViewModel.STATE;
  titleBar: TitleBarViewModel;
  userModal: UserModalViewModel;
  userRepository: UserRepository;

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
      PREFERENCES_DEVICES: 'ContentViewModel.STATE.PREFERENCES_DEVICES',
      PREFERENCES_DEVICE_DETAILS: 'ContentViewModel.STATE.PREFERENCES_DEVICE_DETAILS',
      PREFERENCES_OPTIONS: 'ContentViewModel.STATE.PREFERENCES_OPTIONS',
      WATERMARK: 'ContentViewModel.STATE.WATERMARK',
    };
  }

  constructor(mainViewModel: MainViewModel, repositories: ViewModelRepositories) {
    this.userState = container.resolve(UserState);
    this.teamState = container.resolve(TeamState);
    this.conversationState = container.resolve(ConversationState);

    this.elementId = 'center-column';
    this.mainViewModel = mainViewModel;
    this.conversationRepository = repositories.conversation;
    this.userRepository = repositories.user;
    this.logger = getLogger('ContentViewModel');
    this.State = ContentViewModel.STATE;

    // State
    this.state = ko.observable(ContentViewModel.STATE.WATERMARK);

    // Nested view models
    this.collectionDetails = new CollectionDetailsViewModel();
    this.collection = new CollectionViewModel(this, repositories.conversation);
    this.connectRequests = new ConnectRequestsViewModel(mainViewModel);
    this.emojiInput = new EmojiInputViewModel(repositories.properties);
    this.giphy = new GiphyViewModel(repositories.giphy);
    this.inputBar = new InputBarViewModel(
      this.emojiInput,
      repositories.asset,
      repositories.event,
      repositories.conversation,
      repositories.search,
      repositories.storage,
      repositories.message,
    );
    this.groupCreation = new GroupCreationViewModel(repositories.conversation, repositories.search, repositories.team);
    this.userModal = new UserModalViewModel(repositories.user, mainViewModel.actions);
    this.serviceModal = new ServiceModalViewModel(repositories.integration, mainViewModel.actions);
    this.inviteModal = new InviteModalViewModel();
    this.legalHoldModal = new LegalHoldModalViewModel(
      repositories.conversation,
      repositories.team,
      repositories.client,
      repositories.cryptography,
      repositories.message,
    );
    this.messageList = new MessageListViewModel(
      mainViewModel,
      repositories.conversation,
      repositories.integration,
      repositories.serverTime,
      repositories.user,
      repositories.message,
    );
    this.titleBar = new TitleBarViewModel(mainViewModel.calling, mainViewModel.panel, this, repositories.calling);

    this.preferencesAbout = new PreferencesAboutViewModel();
    this.preferencesAccount = new PreferencesAccountViewModel(
      repositories.client,
      repositories.conversation,
      repositories.preferenceNotification,
      repositories.properties,
      repositories.user,
    );
    this.preferencesAV = new PreferencesAVViewModel(repositories.media, repositories.properties, repositories.calling, {
      replaceActiveMediaSource: repositories.calling.changeMediaSource.bind(repositories.calling),
      stopActiveMediaSource: repositories.calling.stopMediaSource.bind(repositories.calling),
    });
    this.preferencesDeviceDetails = new PreferencesDeviceDetailsViewModel(
      mainViewModel,
      repositories.client,
      repositories.cryptography,
      repositories.message,
    );
    this.preferencesDevices = new PreferencesDevicesViewModel(mainViewModel, this, repositories.cryptography);
    this.preferencesOptions = new PreferencesOptionsViewModel(repositories.properties);

    this.historyExport = new HistoryExportViewModel(repositories.backup);
    this.historyImport = new HistoryImportViewModel(repositories.backup);

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
          this.preferencesAV.updateMediaStreamTrack(MediaType.AUDIO_VIDEO);
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

    this.userState.connectRequests.subscribe(requests => {
      const isStateRequests = this.state() === ContentViewModel.STATE.CONNECTION_REQUESTS;
      if (isStateRequests && !requests.length) {
        this.showConversation(this.conversationRepository.getMostRecentConversation());
      }
    });

    this._initSubscriptions();
    if (this.teamState.supportsLegalHold()) {
      this.legalHoldModal.showRequestModal();
    }
    ko.applyBindings(this, document.getElementById(this.elementId));
  }

  private _initSubscriptions() {
    amplify.subscribe(WebAppEvents.CONTENT.SWITCH, this.switchContent);
    amplify.subscribe(WebAppEvents.CONVERSATION.SHOW, this.showConversation);
  }

  private _shiftContent(contentSelector: string): void {
    const incomingCssClass = 'content-animation-incoming-horizontal-left';

    $(contentSelector)
      .removeClass(incomingCssClass)
      .off(alias.animationend)
      .addClass(incomingCssClass)
      .one(alias.animationend, function () {
        $(this).removeClass(incomingCssClass).off(alias.animationend);
      });
  }

  /**
   * Opens the specified conversation.
   *
   * @note If the conversation_et is not defined, it will open the incoming connection requests instead
   *
   * @param conversation Conversation entity or conversation ID
   * @param options State to open conversation in
   */
  showConversation = (conversation: Conversation | string, options: ShowConversationOptions = {}) => {
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
      ? Promise.resolve(conversation as Conversation)
      : this.conversationRepository.get_conversation_by_id(conversation as string);

    conversationPromise
      .then(conversationEntity => {
        if (!conversationEntity) {
          throw new ConversationError(
            ConversationError.TYPE.CONVERSATION_NOT_FOUND,
            ConversationError.MESSAGE.CONVERSATION_NOT_FOUND,
          );
        }
        const isActiveConversation = this.conversationState.isActiveConversation(conversationEntity);
        const isConversationState = this.state() === ContentViewModel.STATE.CONVERSATION;
        const isOpenedConversation = conversationEntity && isActiveConversation && isConversationState;

        if (isOpenedConversation) {
          if (openNotificationSettings) {
            this.mainViewModel.panel.togglePanel(PanelViewModel.STATE.NOTIFICATIONS, undefined);
          }
          return;
        }

        this.releaseContent(this.state());

        this.state(ContentViewModel.STATE.CONVERSATION);
        this.mainViewModel.list.openConversations();

        if (!isActiveConversation) {
          this.conversationState.activeConversation(conversationEntity);
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
            this.showContent(ContentViewModel.STATE.CONVERSATION);
            this.previousConversation = this.conversationState.activeConversation();
            if (openNotificationSettings) {
              this.mainViewModel.panel.togglePanel(PanelViewModel.STATE.NOTIFICATIONS, undefined);
            }
          });
        });
      })
      .catch(error => {
        const isConversationNotFound = error.type === ConversationError.TYPE.CONVERSATION_NOT_FOUND;
        if (isConversationNotFound) {
          this.mainViewModel.modals.showModal(
            ModalsViewModel.TYPE.ACKNOWLEDGE,
            {
              text: {
                message: t('conversationNotFoundMessage'),
                title: t('conversationNotFoundTitle', Config.getConfig().BRAND_NAME),
              },
            },
            undefined,
          );
        } else {
          throw error;
        }
      });
  };

  switchContent = (newContentState: string): void => {
    const isStateChange = newContentState !== this.state();
    if (isStateChange) {
      this.releaseContent(newContentState);
      this.showContent(this.checkContentAvailability(newContentState));
    }
  };

  switchPreviousContent = (): void => {
    const isStateChange = this.previousState !== this.state();
    if (isStateChange) {
      const isStateRequests = this.previousState === ContentViewModel.STATE.CONNECTION_REQUESTS;
      if (isStateRequests) {
        this.switchContent(ContentViewModel.STATE.CONNECTION_REQUESTS);
      }
      const previousId = this.previousConversation && this.previousConversation.id;
      const repoHasConversation = this.conversationState.conversations().some(({id}) => id === previousId);

      if (this.previousConversation && repoHasConversation && !this.previousConversation.is_archived()) {
        return this.showConversation(this.previousConversation);
      }

      return this.switchContent(ContentViewModel.STATE.WATERMARK);
    }
  };

  private readonly checkContentAvailability = (state: string) => {
    const isStateRequests = state === ContentViewModel.STATE.CONNECTION_REQUESTS;
    if (isStateRequests) {
      const hasConnectRequests = !!this.userState.connectRequests().length;
      if (!hasConnectRequests) {
        return ContentViewModel.STATE.WATERMARK;
      }
    }
    return state;
  };

  private readonly getElementOfContent = (state: string) => {
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
  };

  private readonly releaseContent = (newContentState: string) => {
    this.previousState = this.state();

    const isStateConversation = this.previousState === ContentViewModel.STATE.CONVERSATION;
    if (isStateConversation) {
      const collectionStates = [ContentViewModel.STATE.COLLECTION, ContentViewModel.STATE.COLLECTION_DETAILS];
      const isCollectionState = collectionStates.includes(newContentState);
      if (!isCollectionState) {
        this.conversationState.activeConversation(null);
      }

      return this.messageList.release_conversation(undefined);
    }

    const isStatePreferencesAv = this.previousState === ContentViewModel.STATE.PREFERENCES_AV;
    if (isStatePreferencesAv) {
      this.preferencesAV.releaseDevices(MediaType.AUDIO_VIDEO);
    }
  };

  private readonly showContent = (newContentState: string) => {
    this.state(newContentState);
    return this._shiftContent(this.getElementOfContent(newContentState));
  };
}
