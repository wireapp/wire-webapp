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
import {ConversationState} from '../../conversation/ConversationState';
import {container} from 'tsyringe';

import type {Conversation} from '../../entity/Conversation';
import type {User} from '../../entity/User';
import type {ServiceEntity} from '../../integration/ServiceEntity';
import type {MainViewModel, ViewModelRepositories} from '../MainViewModel';
import type {PanelParams} from '../PanelViewModel';

export interface PanelViewModelProps {
  isVisible: ko.PureComputed<boolean>;
  mainViewModel: MainViewModel;
  navigateTo: (target: string, params?: {addMode?: boolean; entity?: User | ServiceEntity}) => void;
  onClose: () => void;
  onGoBack: () => void;
  onGoToRoot: () => void;
  repositories: ViewModelRepositories;
}

export class BasePanelViewModel {
  onClose: () => void;
  onGoBack: () => void;
  onGoToRoot: () => void;
  navigateTo: PanelViewModelProps['navigateTo'];
  isVisible: ko.PureComputed<boolean>;
  activeConversation: ko.Observable<Conversation>;

  constructor({isVisible, navigateTo, onClose, onGoBack, onGoToRoot}: PanelViewModelProps) {
    const conversationState = container.resolve(ConversationState);

    this.onClose = onClose;
    this.onGoBack = onGoBack;
    this.onGoToRoot = onGoToRoot;
    this.navigateTo = navigateTo;

    this.isVisible = isVisible;

    this.activeConversation = conversationState.activeConversation;
  }

  initView(params?: PanelParams): void {}

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
