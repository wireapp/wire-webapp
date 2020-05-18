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

import ko from 'knockout';

import type {ConversationRepository} from '../../conversation/ConversationRepository';
import type {Conversation} from '../../entity/Conversation';
import type {User} from '../../entity/User';
import type {ServiceEntity} from '../../integration/ServiceEntity';
import type {SearchRepository} from '../../search/SearchRepository';
import type {TeamRepository} from '../../team/TeamRepository';
import type {ClientRepository} from '../../client/ClientRepository';
import type {CryptographyRepository} from '../../cryptography/CryptographyRepository';
import type {UserRepository} from '../../user/UserRepository';
import type {MainViewModel} from '../MainViewModel';
import type {IntegrationRepository} from '../../integration/IntegrationRepository';

export interface PanelViewModelProps {
  isVisible: ko.Observable<boolean>;
  navigateTo: (target: string, params?: {entity?: User | ServiceEntity; addMode?: boolean}) => void;
  onClose: () => void;
  onGoBack: () => void;
  onGoToRoot: () => void;
  repositories: {
    search: SearchRepository;
    team: TeamRepository;
    conversation: ConversationRepository;
    client: ClientRepository;
    cryptography: CryptographyRepository;
    user: UserRepository;
    integration: IntegrationRepository;
  };
  mainViewModel: MainViewModel;
}

export class BasePanelViewModel {
  onClose: () => void;
  onGoBack: () => void;
  onGoToRoot: () => void;
  navigateTo: PanelViewModelProps['navigateTo'];
  isVisible: ko.Observable<boolean>;
  activeConversation: ko.Observable<Conversation>;
  constructor({isVisible, navigateTo, onClose, onGoBack, onGoToRoot, repositories}: PanelViewModelProps) {
    this.onClose = onClose;
    this.onGoBack = onGoBack;
    this.onGoToRoot = onGoToRoot;
    this.navigateTo = navigateTo;

    this.isVisible = isVisible;

    this.activeConversation = repositories.conversation.active_conversation;
  }

  initView(_: unknown): void {}

  getElementId(): string {
    return 'conversation-details';
  }

  getEntityId(): string | false {
    return this.activeConversation()?.id ?? false;
  }

  shouldSkipTransition(): boolean {
    return false;
  }
}
