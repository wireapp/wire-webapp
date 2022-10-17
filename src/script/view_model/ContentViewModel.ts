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

import {ConnectionStatus} from '@wireapp/api-client/src/connection/';
import {WebAppEvents} from '@wireapp/webapp-events';
import {amplify} from 'amplify';
import ko from 'knockout';
import {container} from 'tsyringe';

import {t} from 'Util/LocalizerUtil';
import {getLogger, Logger} from 'Util/Logger';
import {matchQualifiedIds} from 'Util/QualifiedId';
import {isConversationEntity} from 'Util/TypePredicateUtil';
import {alias} from 'Util/util';

import type {MainViewModel, ViewModelRepositories} from './MainViewModel';

import {PrimaryModal} from '../components/Modals/PrimaryModal';
import {Config} from '../Config';
import type {ConversationRepository} from '../conversation/ConversationRepository';
import {ConversationState} from '../conversation/ConversationState';
import {MessageRepository} from '../conversation/MessageRepository';
import {Conversation} from '../entity/Conversation';
import type {Message} from '../entity/message/Message';
import {ConversationError} from '../error/ConversationError';
import {
  ClientNotificationData,
  Notification,
  PreferenceNotificationRepository,
} from '../notification/PreferenceNotificationRepository';
import '../page/LeftSidebar';
import '../page/MainContent';
import {PanelState} from '../page/RightSidebar/RightSidebar';
import {useAppMainState} from '../page/state';
import {TeamState} from '../team/TeamState';
import type {UserRepository} from '../user/UserRepository';
import {UserState} from '../user/UserState';

interface ShowConversationOptions {
  exposeMessage?: Message;
  openFirstSelfMention?: boolean;
  openNotificationSettings?: boolean;
}

interface ShowConversationOverload {
  (conversation: Conversation, options: ShowConversationOptions): Promise<void>;
  (conversationId: string, options: ShowConversationOptions, domain: string | null): Promise<void>;
}

export enum ContentState {
  COLLECTION = 'ContentState.COLLECTION',
  COLLECTION_DETAILS = 'ContentState.COLLECTION_DETAILS',
  CONNECTION_REQUESTS = 'ContentState.CONNECTION_REQUESTS',
  CONVERSATION = 'ContentState.CONVERSATION',
  HISTORY_EXPORT = 'ContentState.HISTORY_EXPORT',
  HISTORY_IMPORT = 'ContentState.HISTORY_IMPORT',
  PREFERENCES_ABOUT = 'ContentState.PREFERENCES_ABOUT',
  PREFERENCES_ACCOUNT = 'ContentState.PREFERENCES_ACCOUNT',
  PREFERENCES_AV = 'ContentState.PREFERENCES_AV',
  PREFERENCES_DEVICE_DETAILS = 'ContentState.PREFERENCES_DEVICE_DETAILS',
  PREFERENCES_DEVICES = 'ContentState.PREFERENCES_DEVICES',
  PREFERENCES_OPTIONS = 'ContentState.PREFERENCES_OPTIONS',
  WATERMARK = 'ContentState.WATERMARK',
}

export class ContentViewModel {
  private readonly userState: UserState;
  private readonly teamState: TeamState;
  private readonly conversationState: ConversationState;

  conversationRepository: ConversationRepository;
  messageRepository: MessageRepository;
  sidebarId: string;
  logger: Logger;
  readonly isFederated?: boolean;
  mainViewModel: MainViewModel;
  previousConversation: Conversation | null = null;
  previousState: string | null = null;
  state: ko.Observable<ContentState>;
  State: typeof ContentState;
  userRepository: UserRepository;
  initialMessage?: Message;

  constructor(mainViewModel: MainViewModel, public repositories: ViewModelRepositories) {
    this.userState = container.resolve(UserState);
    this.teamState = container.resolve(TeamState);
    this.conversationState = container.resolve(ConversationState);

    this.sidebarId = 'left-column';
    this.mainViewModel = mainViewModel;
    this.conversationRepository = repositories.conversation;
    this.userRepository = repositories.user;
    this.messageRepository = repositories.message;
    this.isFederated = mainViewModel.isFederated;
    this.logger = getLogger('ContentViewModel');
    this.State = ContentState;

    // State
    this.state = ko.observable(ContentState.WATERMARK);

    this.state.subscribe(state => {
      switch (state) {
        case ContentState.PREFERENCES_ACCOUNT:
          this.popNotification();
          break;
        default:
      }
    });

    this.userState.connectRequests.subscribe(requests => {
      const isStateRequests = this.state() === ContentState.CONNECTION_REQUESTS;
      if (isStateRequests && !requests.length) {
        this.showConversation(this.conversationRepository.getMostRecentConversation(), {});
      }
    });

    ko.computed(() => {
      if (
        this.conversationState.activeConversation()?.connection().status() ===
        ConnectionStatus.MISSING_LEGAL_HOLD_CONSENT
      ) {
        this.showConversation(this.conversationRepository.getMostRecentConversation(), {});
      }
    });

    this._initSubscriptions();

    if (this.teamState.supportsLegalHold()) {
      const {legalHoldModal} = useAppMainState.getState();
      legalHoldModal.showRequestModal(true);
    }
  }

  private _initSubscriptions() {
    amplify.subscribe(WebAppEvents.CONTENT.SWITCH, this.switchContent);
    amplify.subscribe(WebAppEvents.CONVERSATION.SHOW, this.showConversation);
  }

  private _shiftContent(contentSelector: string, hideSidebar: boolean = false): void {
    const incomingCssClass = 'content-animation-incoming-horizontal-left';

    $(contentSelector)
      .removeClass(incomingCssClass)
      .off(alias.animationend)
      .addClass(incomingCssClass)
      .one(alias.animationend, function () {
        $(this).removeClass(incomingCssClass).off(alias.animationend);
      });

    const sidebar = $(`#${this.sidebarId}`);
    if (hideSidebar) {
      sidebar.css('visibility', 'hidden');
    } else {
      sidebar.removeAttr('style');
    }
  }

  changeConversation = (conversationEntity: Conversation, messageEntity?: Message) => {
    // Clean up old conversation
    const conversation = this.conversationState.activeConversation();

    if (conversation) {
      conversation.release();
    }

    // Update new conversation
    this.initialMessage = messageEntity;
    this.conversationState.activeConversation(conversationEntity);
  };

  /**
   * Opens the specified conversation.
   *
   * @note If the conversation_et is not defined, it will open the incoming connection requests instead
   *
   * @param conversation Conversation entity or conversation ID
   * @param options State to open conversation in
   * @param domain Domain name
   */
  readonly showConversation: ShowConversationOverload = async (
    conversation: Conversation | string,
    options: ShowConversationOptions,
    domain: string | null = null,
  ) => {
    const {
      exposeMessage: exposeMessageEntity,
      openFirstSelfMention = false,
      openNotificationSettings = false,
    } = options;

    if (!conversation) {
      return this.switchContent(ContentState.CONNECTION_REQUESTS);
    }

    try {
      const conversationEntity = isConversationEntity(conversation)
        ? conversation
        : await this.conversationRepository.getConversationById({domain: domain || '', id: conversation});
      if (!conversationEntity) {
        throw new ConversationError(
          ConversationError.TYPE.CONVERSATION_NOT_FOUND,
          ConversationError.MESSAGE.CONVERSATION_NOT_FOUND,
        );
      }
      const isActiveConversation = this.conversationState.isActiveConversation(conversationEntity);
      const isConversationState = this.state() === ContentState.CONVERSATION;
      const isOpenedConversation = conversationEntity && isActiveConversation && isConversationState;

      if (isOpenedConversation) {
        if (openNotificationSettings) {
          const {rightSidebar} = useAppMainState.getState();
          rightSidebar.goTo(PanelState.NOTIFICATIONS, {entity: conversationEntity});
        }
        return;
      }

      this.releaseContent(this.state());

      this.state(ContentState.CONVERSATION);
      this.mainViewModel.list.openConversations();

      if (!isActiveConversation) {
        this.conversationState.activeConversation(conversationEntity);
      }

      const messageEntity = openFirstSelfMention ? conversationEntity.getFirstUnreadSelfMention() : exposeMessageEntity;

      if (conversationEntity.is_cleared()) {
        conversationEntity.cleared_timestamp(0);
      }

      if (conversationEntity.is_archived()) {
        await this.conversationRepository.unarchiveConversation(conversationEntity);
      }

      this.changeConversation(conversationEntity, messageEntity);

      this.showContent(ContentState.CONVERSATION);
      this.previousConversation = this.conversationState.activeConversation();
      if (openNotificationSettings) {
        const {rightSidebar} = useAppMainState.getState();
        rightSidebar.goTo(PanelState.NOTIFICATIONS, {entity: this.conversationState.activeConversation()});
      }
    } catch (error) {
      const isConversationNotFound = error.type === ConversationError.TYPE.CONVERSATION_NOT_FOUND;
      if (isConversationNotFound) {
        PrimaryModal.show(
          PrimaryModal.type.ACKNOWLEDGE,
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
    }
  };

  readonly switchContent = (newContentState: ContentState): void => {
    const isStateChange = newContentState !== this.state();
    if (isStateChange) {
      this.releaseContent(newContentState);
      this.showContent(this.checkContentAvailability(newContentState));
    }
  };

  readonly switchPreviousContent = (): void => {
    const isStateChange = this.previousState !== this.state();
    if (isStateChange) {
      const isStateRequests = this.previousState === ContentState.CONNECTION_REQUESTS;
      if (isStateRequests) {
        this.switchContent(ContentState.CONNECTION_REQUESTS);
      }
      const repoHasConversation = this.conversationState
        .conversations()
        .some(conversation => this.previousConversation && matchQualifiedIds(conversation, this.previousConversation));

      if (this.previousConversation && repoHasConversation && !this.previousConversation.is_archived()) {
        void this.showConversation(this.previousConversation, {});
        return;
      }

      return this.switchContent(ContentState.WATERMARK);
    }
  };

  private readonly checkContentAvailability = (state: ContentState): ContentState => {
    const isStateRequests = state === ContentState.CONNECTION_REQUESTS;
    if (isStateRequests) {
      const hasConnectRequests = !!this.userState.connectRequests().length;
      if (!hasConnectRequests) {
        return ContentState.WATERMARK;
      }
    }
    return state;
  };

  private readonly getElementOfContent = (state: string) => {
    switch (state) {
      case ContentState.COLLECTION:
        return '.collection';
      case ContentState.CONVERSATION:
        return '.conversation';
      case ContentState.CONNECTION_REQUESTS:
        return '.connect-requests';
      case ContentState.PREFERENCES_ABOUT:
        return '.preferences-about';
      case ContentState.PREFERENCES_ACCOUNT:
        return '.preferences-account';
      case ContentState.PREFERENCES_AV:
        return '.preferences-av';
      case ContentState.PREFERENCES_DEVICE_DETAILS:
        return '.preferences-device-details';
      case ContentState.PREFERENCES_DEVICES:
        return '.preferences-devices';
      case ContentState.PREFERENCES_OPTIONS:
        return '.preferences-options';
      default:
        return '.watermark';
    }
  };

  private readonly releaseContent = (newContentState: ContentState) => {
    this.previousState = this.state();

    const isStateConversation = this.previousState === ContentState.CONVERSATION;
    if (isStateConversation) {
      const collectionStates = [ContentState.COLLECTION];
      const isCollectionState = collectionStates.includes(newContentState);
      if (!isCollectionState) {
        this.conversationState.activeConversation(null);
      }

      return this.conversationState.activeConversation()?.release();
    }
  };

  private readonly showContent = (newContentState: ContentState) => {
    this.state(newContentState);

    return this._shiftContent(
      this.getElementOfContent(newContentState),
      newContentState === ContentState.HISTORY_EXPORT || newContentState === ContentState.HISTORY_IMPORT,
    );
  };

  private readonly popNotification = (): void => {
    const showNotification = (type: string, aggregatedNotifications: Notification[]) => {
      switch (type) {
        case PreferenceNotificationRepository.CONFIG.NOTIFICATION_TYPES.NEW_CLIENT: {
          PrimaryModal.show(
            PrimaryModal.type.ACCOUNT_NEW_DEVICES,
            {
              data: aggregatedNotifications.map(notification => notification.data) as ClientNotificationData[],
              preventClose: true,
              secondaryAction: {
                action: () => {
                  amplify.publish(WebAppEvents.CONTENT.SWITCH, ContentState.PREFERENCES_DEVICES);
                },
              },
            },
            undefined,
          );
          break;
        }

        case PreferenceNotificationRepository.CONFIG.NOTIFICATION_TYPES.READ_RECEIPTS_CHANGED: {
          PrimaryModal.show(
            PrimaryModal.type.ACCOUNT_READ_RECEIPTS_CHANGED,
            {
              data: aggregatedNotifications.pop().data as boolean,
              preventClose: true,
            },
            undefined,
          );
          break;
        }
      }
    };
    this.repositories.preferenceNotification
      .getNotifications()
      .forEach(({type, notification}) => showNotification(type, notification));
  };
}
