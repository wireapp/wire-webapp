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
import {QualifiedId} from '@wireapp/api-client/lib/user/';
import {amplify} from 'amplify';
import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import ko from 'knockout';
import type {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import {ConversationState} from 'Repositories/conversation/ConversationState';
import {MessageRepository} from 'Repositories/conversation/MessageRepository';
import {Conversation} from 'Repositories/entity/Conversation';
import type {Message} from 'Repositories/entity/message/Message';
import type {UserRepository} from 'Repositories/user/UserRepository';
import {UserState} from 'Repositories/user/UserState';
import {container} from 'tsyringe';
import {isError} from 'underscore';
import {t} from 'Util/LocalizerUtil';
import {getLogger, Logger} from 'Util/Logger';
import {isConversationEntity} from 'Util/TypePredicateUtil';

import {WebAppEvents} from '@wireapp/webapp-events';

import type {MainViewModel, ViewModelRepositories} from './MainViewModel';

import {Config} from '../Config';
import {ConversationError} from '../error/ConversationError';
import '../page/LeftSidebar';
import {SidebarTabs, useSidebarStore} from '../page/LeftSidebar/panels/Conversations/useSidebarStore';
import '../page/MainContent';
import {PanelState} from '../page/RightSidebar';
import {useAppMainState} from '../page/state';
import {ContentState, useAppState} from '../page/useAppState';
import {generateConversationUrl} from '../router/routeGenerator';
import {navigate, setHistoryParam} from '../router/Router';

interface ShowConversationOptions {
  exposeMessage?: Message;
  openFirstSelfMention?: boolean;
  openNotificationSettings?: boolean;
  filePath?: string;
}

interface ShowConversationOverload {
  (conversation: Conversation | undefined, options?: ShowConversationOptions): Promise<void>;
  (conversationId: QualifiedId, options?: ShowConversationOptions): Promise<void>;
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

  get isFederated() {
    return this.mainViewModel.isFederated;
  }

  constructor(
    mainViewModel: MainViewModel,
    public repositories: ViewModelRepositories,
  ) {
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
      this.showConversation(mostRecentConversation);
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
        this.conversationState.activeConversation()?.connection()?.status() ===
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
    useAppMainState.getState().leftSidebar.hide(hideSidebar);
  }

  private changeConversation(conversationEntity: Conversation, messageEntity?: Message): void {
    conversationEntity.initialMessage(messageEntity);
    this.conversationState.activeConversation(conversationEntity);
  }

  private readonly getConversationEntity = async (
    conversation: Conversation | QualifiedId,
  ): Promise<Conversation | null> => {
    const conversationEntity = isConversationEntity(conversation)
      ? conversation
      : await this.conversationRepository.getConversationById(conversation);

    if (!conversationEntity.is1to1()) {
      return conversationEntity;
    }

    return this.conversationRepository.init1to1Conversation(conversationEntity, true);
  };

  private closeRightSidebar(): void {
    const {rightSidebar} = useAppMainState.getState();
    rightSidebar.close();
  }

  private handleMissingConversation(): void {
    this.closeRightSidebar();
    setHistoryParam('/');
    return this.switchContent(ContentState.CONNECTION_REQUESTS);
  }

  private isConversationOpen(conversationEntity: Conversation, isActiveConversation: boolean): boolean {
    const {contentState} = useAppState.getState();
    const isConversationState = contentState === ContentState.CONVERSATION;
    return conversationEntity && isActiveConversation && isConversationState;
  }

  private switchToNotificationSettingsIfApplicable(
    openNotificationSettings: boolean,
    conversationEntity: Conversation,
  ): void {
    if (openNotificationSettings) {
      const {rightSidebar} = useAppMainState.getState();
      rightSidebar.goTo(PanelState.NOTIFICATIONS, {entity: conversationEntity});
    }
  }

  private handleConversationState(
    isOpenedConversation: boolean,
    openNotificationSettings: boolean,
    conversationEntity: Conversation,
  ): void {
    const {setContentState} = useAppState.getState();
    if (isOpenedConversation) {
      this.switchToNotificationSettingsIfApplicable(openNotificationSettings, conversationEntity);
      return;
    }
    setContentState(ContentState.CONVERSATION);

    this.mainViewModel.list.openConversations(conversationEntity.archivedState());
  }

  private showAndNavigate(
    conversationEntity: Conversation,
    openNotificationSettings: boolean,
    filePath?: string,
  ): void {
    const {rightSidebar} = useAppMainState.getState();
    this.showContent(ContentState.CONVERSATION);
    this.previousConversation = this.conversationState.activeConversation();
    setHistoryParam(
      generateConversationUrl({id: conversationEntity?.id ?? '', domain: conversationEntity?.domain ?? '', filePath}),
    );

    if (openNotificationSettings) {
      rightSidebar.goTo(PanelState.NOTIFICATIONS, {entity: this.conversationState.activeConversation() ?? null});
    }
  }

  private showConversationNotFoundErrorModal(): void {
    PrimaryModal.show(
      PrimaryModal.type.ACKNOWLEDGE,
      {
        text: {
          message: t('conversationNotFoundMessage'),
          title: t('conversationNotFoundTitle', {brandName: Config.getConfig().BRAND_NAME}),
        },
      },
      undefined,
    );
  }

  private isConversationNotFoundError(error: unknown): boolean {
    return isError(error) && 'type' in error && error.type === ConversationError.TYPE.CONVERSATION_NOT_FOUND;
  }

  private async retryFetchConversationWithBackoff(
    conversationId: QualifiedId,
    maxRetries: number = 3,
    initialDelayMs: number = 100,
  ): Promise<boolean> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        await new Promise(resolve => setTimeout(resolve, initialDelayMs * (attempt + 1)));
        await this.conversationRepository.fetchBackendConversationEntityById(conversationId);
        return true;
      } catch (error) {
        this.logger.warn(`Retry attempt ${attempt + 1}/${maxRetries} failed for conversation fetch`, error);
      }
    }
    return false;
  }

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
    conversation: Conversation | QualifiedId | undefined,
    options?: ShowConversationOptions,
  ) => {
    const {
      exposeMessage: exposeMessageEntity,
      openFirstSelfMention = false,
      openNotificationSettings = false,
      filePath,
    } = options || {};

    if (!conversation) {
      return this.handleMissingConversation();
    }

    try {
      const conversationEntity = await this.getConversationEntity(conversation);

      if (!conversationEntity) {
        this.closeRightSidebar();
        throw new ConversationError(
          ConversationError.TYPE.CONVERSATION_NOT_FOUND,
          ConversationError.MESSAGE.CONVERSATION_NOT_FOUND,
        );
      }

      const isActiveConversation = this.conversationState.isActiveConversation(conversationEntity);

      if (!isActiveConversation) {
        this.closeRightSidebar();
      }

      const isOpenedConversation = this.isConversationOpen(conversationEntity, isActiveConversation);
      this.handleConversationState(isOpenedConversation, openNotificationSettings, conversationEntity);
      if (!isActiveConversation) {
        this.conversationState.activeConversation(conversationEntity);
      }

      void this.conversationRepository.refreshMLSConversationVerificationState(conversationEntity);
      const messageEntity = openFirstSelfMention ? conversationEntity.getFirstUnreadSelfMention() : exposeMessageEntity;
      this.changeConversation(conversationEntity, messageEntity);
      this.showAndNavigate(conversationEntity, openNotificationSettings, filePath);
    } catch (error: unknown) {
      if (this.isConversationNotFoundError(error)) {
        // Retry fetching the conversation to handle race conditions
        const fetchSucceeded = await this.retryFetchConversationWithBackoff({
          id: conversation.domain,
          domain: conversation.domain,
        });

        if (fetchSucceeded) {
          // Conversation was found after retry, attempt to show it again
          return this.showConversation(conversation, options);
        }

        // All retries failed, show the error modal
        return this.showConversationNotFoundErrorModal();
      }

      throw error;
    } finally {
      const {currentTab, setCurrentTab} = useSidebarStore.getState();

      if ([SidebarTabs.PREFERENCES, SidebarTabs.CONNECT].includes(currentTab)) {
        setCurrentTab(SidebarTabs.RECENT);
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
