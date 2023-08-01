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

import {ConnectionStatus} from '@wireapp/api-client/lib/connection/';
import {amplify} from 'amplify';
import ko from 'knockout';
import {container} from 'tsyringe';

import {WebAppEvents} from '@wireapp/webapp-events';

import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import {t} from 'Util/LocalizerUtil';
import {getLogger, Logger} from 'Util/Logger';
import {isConversationEntity} from 'Util/TypePredicateUtil';

import type {MainViewModel, ViewModelRepositories} from './MainViewModel';

import {Config} from '../Config';
import type {ConversationRepository} from '../conversation/ConversationRepository';
import {ConversationState} from '../conversation/ConversationState';
import {MessageRepository} from '../conversation/MessageRepository';
import {Conversation} from '../entity/Conversation';
import type {Message} from '../entity/message/Message';
import {ConversationError} from '../error/ConversationError';
import '../page/LeftSidebar';
import '../page/MainContent';
import {PanelState} from '../page/RightSidebar';
import {useAppMainState} from '../page/state';
import {ContentState, useAppState} from '../page/useAppState';
import {generateConversationUrl} from '../router/routeGenerator';
import {navigate, setHistoryParam} from '../router/Router';
import type {UserRepository} from '../user/UserRepository';
import {UserState} from '../user/UserState';

interface ShowConversationOptions {
  exposeMessage?: Message;
  openFirstSelfMention?: boolean;
  openNotificationSettings?: boolean;
}

interface ShowConversationOverload {
  (conversation: Conversation | undefined, options: ShowConversationOptions): Promise<void>;
  (conversationId: string, options: ShowConversationOptions, domain: string | null): Promise<void>;
}

export class ContentViewModel {
  private readonly userState: UserState;
  private readonly conversationState: ConversationState;

  conversationRepository: ConversationRepository;
  messageRepository: MessageRepository;
  sidebarId: string;
  logger: Logger;
  mainViewModel: MainViewModel;
  previousConversation?: Conversation;
  userRepository: UserRepository;
  initialMessage?: Message;

  get isFederated() {
    return this.mainViewModel.isFederated;
  }

  constructor(mainViewModel: MainViewModel, public repositories: ViewModelRepositories) {
    this.userState = container.resolve(UserState);
    this.conversationState = container.resolve(ConversationState);

    this.sidebarId = 'left-column';
    this.mainViewModel = mainViewModel;
    this.conversationRepository = repositories.conversation;
    this.userRepository = repositories.user;
    this.messageRepository = repositories.message;
    this.logger = getLogger('ContentViewModel');

    const showMostRecentConversation = () => {
      const mostRecentConversation = this.conversationState.getMostRecentConversation();
      this.showConversation(mostRecentConversation, {});
    };

    this.userState.connectRequests.subscribe(requests => {
      const {contentState} = useAppState.getState();

      const isStateRequests = contentState === ContentState.CONNECTION_REQUESTS;
      if (isStateRequests && !requests.length) {
        showMostRecentConversation();
      }
    });

    ko.computed(() => {
      if (
        this.conversationState.activeConversation()?.connection().status() ===
        ConnectionStatus.MISSING_LEGAL_HOLD_CONSENT
      ) {
        showMostRecentConversation();
      }
    });

    this._initSubscriptions();
  }

  private _initSubscriptions() {
    amplify.subscribe(WebAppEvents.CONTENT.SWITCH, this.switchContent);
    amplify.subscribe(WebAppEvents.CONVERSATION.SHOW, this.showConversation);
  }

  private _shiftContent(hideSidebar: boolean = false): void {
    const sidebar = document.querySelector(`#${this.sidebarId}`) as HTMLElement | null;

    if (hideSidebar) {
      if (sidebar) {
        sidebar.style.visibility = 'hidden';
      }
    } else if (sidebar) {
      sidebar.style.visibility = '';
    }
  }

  changeConversation = (conversationEntity: Conversation, messageEntity?: Message) => {
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
    conversation: Conversation | string | undefined,
    options: ShowConversationOptions,
    domain: string | null = null,
  ) => {
    const {
      exposeMessage: exposeMessageEntity,
      openFirstSelfMention = false,
      openNotificationSettings = false,
    } = options;

    const {rightSidebar} = useAppMainState.getState();
    const {contentState, setContentState} = useAppState.getState();

    if (!conversation) {
      rightSidebar.close();
      return this.switchContent(ContentState.CONNECTION_REQUESTS);
    }

    try {
      const conversationEntity = isConversationEntity(conversation)
        ? conversation
        : await this.conversationRepository.getConversationById({domain: domain || '', id: conversation});

      if (!conversationEntity) {
        rightSidebar.close();

        throw new ConversationError(
          ConversationError.TYPE.CONVERSATION_NOT_FOUND,
          ConversationError.MESSAGE.CONVERSATION_NOT_FOUND,
        );
      }

      const isActiveConversation = this.conversationState.isActiveConversation(conversationEntity);

      if (!isActiveConversation) {
        rightSidebar.close();
      }

      const isConversationState = contentState === ContentState.CONVERSATION;
      const isOpenedConversation = conversationEntity && isActiveConversation && isConversationState;

      if (isOpenedConversation) {
        if (openNotificationSettings) {
          rightSidebar.goTo(PanelState.NOTIFICATIONS, {entity: conversationEntity});
        }
        return;
      }

      setContentState(ContentState.CONVERSATION);
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
      setHistoryParam(
        generateConversationUrl({id: conversationEntity?.id ?? '', domain: conversationEntity?.domain ?? ''}),
      );

      if (openNotificationSettings) {
        rightSidebar.goTo(PanelState.NOTIFICATIONS, {entity: this.conversationState.activeConversation() ?? null});
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
    const {contentState} = useAppState.getState();
    const isStateChange = newContentState !== contentState;

    if (isStateChange) {
      this.showContent(this.checkContentAvailability(newContentState));
    }
  };

  readonly loadPreviousContent = (): void => {
    const {contentState, previousContentState} = useAppState.getState();
    const isStateChange = previousContentState !== contentState;

    if (isStateChange) {
      const isStateRequests = previousContentState === ContentState.CONNECTION_REQUESTS;
      if (isStateRequests) {
        this.switchContent(ContentState.CONNECTION_REQUESTS);
      }

      if (this.conversationState.isVisible(this.previousConversation)) {
        navigate(generateConversationUrl(this.previousConversation));
        return;
      }

      return this.switchContent(ContentState.WATERMARK);
    }
  };

  private readonly checkContentAvailability = (newState: ContentState): ContentState => {
    const isStateRequests = newState === ContentState.CONNECTION_REQUESTS;
    if (isStateRequests) {
      const hasConnectRequests = !!this.userState.connectRequests().length;
      if (!hasConnectRequests) {
        return ContentState.WATERMARK;
      }
    }
    return newState;
  };

  private readonly showContent = (newContentState: ContentState) => {
    const {setContentState} = useAppState.getState();
    setContentState(newContentState);

    return this._shiftContent(
      newContentState === ContentState.HISTORY_EXPORT || newContentState === ContentState.HISTORY_IMPORT,
    );
  };
}
