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
import {container} from 'tsyringe';

import {Logger, getLogger} from 'Util/Logger';
import {copyText} from 'Util/ClipboardUtil';
import {t} from 'Util/LocalizerUtil';

import {Config} from '../../Config';
import {BasePanelViewModel, PanelViewModelProps} from './BasePanelViewModel';
import {ModalsViewModel} from '../ModalsViewModel';
import {ACCESS_STATE} from '../../conversation/AccessState';
import type {ConversationStateHandler} from '../../conversation/ConversationStateHandler';
import type {Conversation} from '../../entity/Conversation';
import {TeamState} from '../../team/TeamState';

export class GuestsAndServicesViewModel extends BasePanelViewModel {
  private readonly teamState: TeamState;

  stateHandler: ConversationStateHandler;
  logger: Logger;
  isLinkCopied: ko.Observable<boolean>;
  requestOngoing: ko.Observable<boolean>;
  isGuestRoom: ko.PureComputed<boolean>;
  isGuestAndServicesRoom: ko.PureComputed<boolean>;
  isTeamOnly: ko.PureComputed<boolean>;
  hasAccessCode: ko.PureComputed<boolean>;
  isGuestEnabled: ko.PureComputed<boolean>;
  isServicesEnabled: ko.PureComputed<boolean>;
  isServicesRoom: ko.PureComputed<boolean>;
  isGuestLinkEnabled: ko.PureComputed<boolean>;
  guestLinkDisabledInfo: ko.PureComputed<string>;
  showLinkOptions: ko.PureComputed<boolean>;
  brandName: string;

  static get CONFIG() {
    return {
      CONFIRM_DURATION: 1500,
    };
  }

  constructor(params: PanelViewModelProps) {
    super(params);
    this.teamState = container.resolve(TeamState);

    this.stateHandler = params.repositories.conversation.stateHandler;

    this.logger = getLogger('GuestsAndServicesViewModel');

    this.isLinkCopied = ko.observable(false);
    this.requestOngoing = ko.observable(false);

    this.isGuestRoom = ko.pureComputed(() => this.activeConversation()?.isGuestRoom());
    this.isGuestAndServicesRoom = ko.pureComputed(() => this.activeConversation()?.isGuestAndServicesRoom());
    this.isTeamOnly = ko.pureComputed(() => this.activeConversation()?.isTeamOnly());
    this.isServicesRoom = ko.pureComputed(() => this.activeConversation()?.isServicesRoom());
    this.isGuestEnabled = ko.pureComputed(() => this.isGuestRoom() || this.isGuestAndServicesRoom());
    this.isServicesEnabled = ko.pureComputed(
      () => this.activeConversation()?.isServicesRoom() || this.activeConversation()?.isGuestAndServicesRoom(),
    );

    this.hasAccessCode = ko.pureComputed(() =>
      this.isGuestEnabled() ? !!this.activeConversation().accessCode() : false,
    );
    const conversationHasGuestLinkEnabled = ko.observable<boolean | undefined>(undefined);
    this.isGuestLinkEnabled = ko.pureComputed(() => {
      if (this.activeConversation().inTeam()) {
        return this.teamState.isGuestLinkEnabled();
      }
      return this.teamState.isGuestLinkEnabled() && conversationHasGuestLinkEnabled();
    });
    this.guestLinkDisabledInfo = ko.pureComputed(() => {
      if (conversationHasGuestLinkEnabled() === false) {
        return t('guestLinkDisabledByOtherTeam');
      }
      return t('guestLinkDisabled');
    });

    this.showLinkOptions = ko.pureComputed(() => this.isGuestEnabled());

    this.activeConversation.subscribe(conversationEntity => this._updateCode(this.isVisible(), conversationEntity));
    this.isVisible.subscribe(async isVisible => {
      if (!this.activeConversation().inTeam() && !this.isGuestLinkEnabled()) {
        // If the conversation is not in my team and the guest link is disabled
        // We check that the conversation itself has guest link enabled
        const hasGuestLink = await params.repositories.team.conversationHasGuestLinkEnabled(
          this.activeConversation().id,
        );
        conversationHasGuestLinkEnabled(hasGuestLink);
      }
      this._updateCode(isVisible, this.activeConversation());
    });
    this.brandName = Config.getConfig().BRAND_NAME;
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
    if (!this.isGuestEnabled() && !this.isServicesEnabled()) {
      await this.stateHandler.changeAccessState(this.activeConversation(), ACCESS_STATE.TEAM.GUEST_ROOM, true);
    }

    if (!this.requestOngoing()) {
      this.requestOngoing(true);
      await this.stateHandler.requestAccessCode(this.activeConversation());
      this.requestOngoing(false);
    }
  };

  readonly revokeAccessCode = (): void => {
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

  toggleGuestAccessState = async (): Promise<void> => {
    const conversationEntity = this.activeConversation();
    if (conversationEntity.inTeam()) {
      let newAccessState: ACCESS_STATE;

      if (this.isServicesRoom()) {
        newAccessState = ACCESS_STATE.TEAM.GUESTS_SERVICES;
      }
      if (this.isTeamOnly()) {
        newAccessState = ACCESS_STATE.TEAM.GUEST_ROOM;
      }
      if (this.isGuestRoom()) {
        newAccessState = ACCESS_STATE.TEAM.TEAM_ONLY;
      }
      if (this.isGuestAndServicesRoom()) {
        newAccessState = ACCESS_STATE.TEAM.SERVICES;
      }

      const changeAccessState = async (): Promise<void> => {
        if (!this.requestOngoing()) {
          this.requestOngoing(true);
          await this.stateHandler.changeAccessState(conversationEntity, newAccessState, true);
          this.requestOngoing(false);
        }
      };

      if (this.isTeamOnly() || !conversationEntity.hasGuest()) {
        return changeAccessState();
      }

      amplify.publish(WebAppEvents.WARNING.MODAL, ModalsViewModel.TYPE.CONFIRM, {
        preventClose: true,
        primaryAction: {
          action: changeAccessState,
          text: t('modalConversationRemoveAction'),
        },
        text: {
          message: t('modalConversationRemoveGuestsMessage'),
          title: t('modalConversationRemoveGuestsAndServicesHeadline'),
        },
      });
    }
  };

  toggleServiceAccessState = async (): Promise<void> => {
    const conversationEntity = this.activeConversation();
    if (conversationEntity.inTeam()) {
      let newAccessState: ACCESS_STATE;

      if (this.isGuestRoom()) {
        newAccessState = ACCESS_STATE.TEAM.GUESTS_SERVICES;
      }

      if (this.isGuestAndServicesRoom()) {
        newAccessState = ACCESS_STATE.TEAM.GUEST_ROOM;
      }
      if (this.isServicesRoom()) {
        newAccessState = ACCESS_STATE.TEAM.TEAM_ONLY;
      }
      if (this.isTeamOnly()) {
        newAccessState = ACCESS_STATE.TEAM.SERVICES;
      }

      const changeAccessState = async (): Promise<void> => {
        if (!this.requestOngoing()) {
          this.requestOngoing(true);
          await this.stateHandler.changeAccessState(conversationEntity, newAccessState, false);
          this.requestOngoing(false);
        }
      };

      if (this.isTeamOnly() || !conversationEntity.hasService()) {
        return changeAccessState();
      }

      amplify.publish(WebAppEvents.WARNING.MODAL, ModalsViewModel.TYPE.CONFIRM, {
        preventClose: true,
        primaryAction: {
          action: changeAccessState,
          text: t('modalConversationRemoveAction'),
        },
        text: {
          message: t('modalConversationRemoveServicesMessage'),
          title: t('modalConversationRemoveGuestsAndServicesHeadline'),
        },
      });
    }
  };

  async _updateCode(isVisible: boolean, conversationEntity: Conversation): Promise<void> {
    const updateCode =
      conversationEntity &&
      (conversationEntity.isGuestRoom() || conversationEntity.isGuestAndServicesRoom()) &&
      !conversationEntity.accessCode() &&
      this.isGuestLinkEnabled();
    if (isVisible && updateCode) {
      this.requestOngoing(true);
      await this.stateHandler.getAccessCode(conversationEntity);
      this.requestOngoing(false);
    }
  }
}
