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
import {amplify} from 'amplify';
import {WebAppEvents} from '@wireapp/webapp-events';

import {Logger, getLogger} from 'Util/Logger';
import {copyText} from 'Util/ClipboardUtil';
import {t} from 'Util/LocalizerUtil';

import {Config} from '../../Config';
import {BasePanelViewModel, PanelViewModelProps} from './BasePanelViewModel';
import {ModalsViewModel} from '../ModalsViewModel';
import {ACCESS_STATE} from '../../conversation/AccessState';
import type {ConversationStateHandler} from '../../conversation/ConversationStateHandler';
import type {Conversation} from '../../entity/Conversation';

export class GuestsAndServicesViewModel extends BasePanelViewModel {
  stateHandler: ConversationStateHandler;
  logger: Logger;
  isLinkCopied: ko.Observable<boolean>;
  requestOngoing: ko.Observable<boolean>;
  isGuestRoom: ko.PureComputed<boolean>;
  isTeamOnly: ko.PureComputed<boolean>;
  hasAccessCode: ko.PureComputed<boolean>;
  isGuestEnabled: ko.PureComputed<boolean>;
  showLinkOptions: ko.PureComputed<boolean>;
  brandName: string;

  static get CONFIG() {
    return {
      CONFIRM_DURATION: 1500,
    };
  }

  constructor(params: PanelViewModelProps) {
    super(params);

    this.stateHandler = params.repositories.conversation.stateHandler;

    this.logger = getLogger('GuestsAndServicesViewModel');

    this.isLinkCopied = ko.observable(false);
    this.requestOngoing = ko.observable(false);

    this.isGuestRoom = ko.pureComputed(() => this.activeConversation()?.isGuestRoom());
    this.isTeamOnly = ko.pureComputed(() => this.activeConversation()?.isTeamOnly());
    this.hasAccessCode = ko.pureComputed(() => (this.isGuestRoom() ? !!this.activeConversation().accessCode() : false));
    this.isGuestEnabled = ko.pureComputed(() => !this.isTeamOnly());
    this.showLinkOptions = ko.pureComputed(() => this.isGuestEnabled());

    this.activeConversation.subscribe(conversationEntity => this._updateCode(this.isVisible(), conversationEntity));
    this.isVisible.subscribe(isVisible => this._updateCode(isVisible, this.activeConversation()));
    this.brandName = Config.getConfig().BRAND_NAME;
  }

  getElementId(): string {
    return 'guest-options';
  }

  copyLink = async (): Promise<void> => {
    if (!this.isLinkCopied() && this.activeConversation()) {
      await copyText(this.activeConversation().accessCode());
      this.isLinkCopied(true);
      window.setTimeout(() => this.isLinkCopied(false), GuestsAndServicesViewModel.CONFIG.CONFIRM_DURATION);
    }
  };

  requestAccessCode = async (): Promise<void> => {
    // Handle conversations in legacy state
    if (!this.isGuestRoom()) {
      await this.stateHandler.changeAccessState(this.activeConversation(), ACCESS_STATE.TEAM.GUEST_ROOM);
    }

    if (!this.requestOngoing()) {
      this.requestOngoing(true);
      await this.stateHandler.requestAccessCode(this.activeConversation());
      this.requestOngoing(false);
    }
  };

  revokeAccessCode = (): void => {
    amplify.publish(WebAppEvents.WARNING.MODAL, ModalsViewModel.TYPE.CONFIRM, {
      preventClose: true,
      primaryAction: {
        action: async (): Promise<void> => {
          if (!this.requestOngoing()) {
            this.requestOngoing(true);
            await this.stateHandler.revokeAccessCode(this.activeConversation());
            this.requestOngoing(false);
          }
        },
        text: t('modalConversationRevokeLinkAction'),
      },
      text: {
        message: t('modalConversationRevokeLinkMessage'),
        title: t('modalConversationRevokeLinkHeadline'),
      },
    });
  };

  toggleAccessState = async (): Promise<void> => {
    const conversationEntity = this.activeConversation();
    if (conversationEntity.inTeam()) {
      const newAccessState = this.isTeamOnly() ? ACCESS_STATE.TEAM.GUEST_ROOM : ACCESS_STATE.TEAM.TEAM_ONLY;

      const changeAccessState = async (): Promise<void> => {
        if (!this.requestOngoing()) {
          this.requestOngoing(true);
          await this.stateHandler.changeAccessState(conversationEntity, newAccessState);
          this.requestOngoing(false);
        }
      };

      const hasGuestOrService = conversationEntity.hasGuest() || conversationEntity.hasService();

      if (this.isTeamOnly() || !hasGuestOrService) {
        return changeAccessState();
      }

      amplify.publish(WebAppEvents.WARNING.MODAL, ModalsViewModel.TYPE.CONFIRM, {
        preventClose: true,
        primaryAction: {
          action: changeAccessState,
          text: t('modalConversationRemoveGuestsAction'),
        },
        text: {
          message: t('modalConversationRemoveGuestsMessage'),
          title: t('modalConversationRemoveGuestsHeadline'),
        },
      });
    }
  };

  async _updateCode(isVisible: boolean, conversationEntity: Conversation): Promise<void> {
    const updateCode = conversationEntity && conversationEntity.isGuestRoom() && !conversationEntity.accessCode();
    if (isVisible && updateCode) {
      this.requestOngoing(true);
      await this.stateHandler.getAccessCode(conversationEntity);
      this.requestOngoing(false);
    }
  }
}
