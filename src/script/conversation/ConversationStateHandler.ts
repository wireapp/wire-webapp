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

import {CONVERSATION_ACCESS, ACCESS_ROLE_V2, ConversationCode} from '@wireapp/api-client/src/conversation/';
import {ConversationAccessUpdateData, ConversationAccessV2UpdateData} from '@wireapp/api-client/src/conversation/data/';
import {CONVERSATION_EVENT} from '@wireapp/api-client/src/event/';
import {amplify} from 'amplify';
import {WebAppEvents} from '@wireapp/webapp-events';
import {StatusCodes as HTTP_STATUS} from 'http-status-codes';

import {t} from 'Util/LocalizerUtil';

import {ModalsViewModel} from '../view_model/ModalsViewModel';

import type {Conversation} from '../entity/Conversation';
import {AbstractConversationEventHandler, EventHandlingConfig} from './AbstractConversationEventHandler';
import {ACCESS_STATE} from './AccessState';
import {ConversationMapper} from './ConversationMapper';
import type {ConversationService} from './ConversationService';
import {ConversationEvent} from './EventBuilder';

export class ConversationStateHandler extends AbstractConversationEventHandler {
  private readonly conversationService: ConversationService;

  constructor(conversationService: ConversationService) {
    super();
    const eventHandlingConfig: EventHandlingConfig = {
      [CONVERSATION_EVENT.ACCESS_UPDATE]: this._mapConversationAccessState.bind(this),
      [CONVERSATION_EVENT.CODE_DELETE]: this._resetConversationAccessCode.bind(this),
      [CONVERSATION_EVENT.CODE_UPDATE]: this._updateConversationAccessCode.bind(this),
    };
    this.setEventHandlingConfig(eventHandlingConfig);
    this.conversationService = conversationService;
  }

  async changeAccessState(
    conversationEntity: Conversation,
    accessState: ACCESS_STATE,
    isTogglingGuest: boolean,
  ): Promise<void> {
    const isConversationInTeam = conversationEntity && conversationEntity.inTeam();
    if (isConversationInTeam) {
      const isStateChange = conversationEntity.accessState() !== accessState;
      const prevAccessState = conversationEntity.accessState();

      if (isStateChange) {
        let accessModes;
        let accessRole;

        switch (accessState) {
          case ACCESS_STATE.TEAM.GUEST_ROOM:
            accessModes = [CONVERSATION_ACCESS.INVITE, CONVERSATION_ACCESS.CODE];
            accessRole = [ACCESS_ROLE_V2.GUEST, ACCESS_ROLE_V2.NON_TEAM_MEMBER, ACCESS_ROLE_V2.TEAM_MEMBER];
            break;
          case ACCESS_STATE.TEAM.TEAM_ONLY:
            accessModes = [CONVERSATION_ACCESS.INVITE];
            accessRole = [ACCESS_ROLE_V2.TEAM_MEMBER];
            break;
          case ACCESS_STATE.TEAM.GUESTS_SERVICES:
            accessModes = [CONVERSATION_ACCESS.INVITE, CONVERSATION_ACCESS.CODE];
            accessRole = [
              ACCESS_ROLE_V2.GUEST,
              ACCESS_ROLE_V2.NON_TEAM_MEMBER,
              ACCESS_ROLE_V2.TEAM_MEMBER,
              ACCESS_ROLE_V2.SERVICE,
            ];
            break;
          case ACCESS_STATE.TEAM.SERVICES:
            accessModes = [CONVERSATION_ACCESS.INVITE];
            accessRole = [ACCESS_ROLE_V2.TEAM_MEMBER, ACCESS_ROLE_V2.SERVICE];
            break;
        }

        if (accessModes && accessRole) {
          try {
            if (accessState === ACCESS_STATE.TEAM.TEAM_ONLY || accessState === ACCESS_STATE.TEAM.SERVICES) {
              conversationEntity.accessCode(undefined);
              await this.revokeAccessCode(conversationEntity);
            }
            await this.conversationService.putConversationAccess(conversationEntity.id, accessModes, accessRole);

            conversationEntity.accessState(accessState);
          } catch (e) {
            let messageString: string;

            if (
              (prevAccessState === ACCESS_STATE.TEAM.TEAM_ONLY && accessState === ACCESS_STATE.TEAM.SERVICES) ||
              (prevAccessState === ACCESS_STATE.TEAM.SERVICES && accessState === ACCESS_STATE.TEAM.GUESTS_SERVICES)
            ) {
              messageString = t('modalConversationGuestOptionsAllowGuestMessage');
            }
            if (
              (prevAccessState === ACCESS_STATE.TEAM.GUEST_ROOM && accessState === ACCESS_STATE.TEAM.TEAM_ONLY) ||
              (prevAccessState === ACCESS_STATE.TEAM.GUESTS_SERVICES && accessState === ACCESS_STATE.TEAM.SERVICES)
            ) {
              messageString = t('modalConversationGuestOptionsDisableGuestMessage');
            }
            if (
              (prevAccessState === ACCESS_STATE.TEAM.GUEST_ROOM && accessState === ACCESS_STATE.TEAM.GUESTS_SERVICES) ||
              (prevAccessState === ACCESS_STATE.TEAM.TEAM_ONLY && accessState === ACCESS_STATE.TEAM.SERVICES)
            ) {
              messageString = t('modalConversationServicesOptionsAllowServicesMessage');
            }
            if (
              (prevAccessState === ACCESS_STATE.TEAM.GUESTS_SERVICES && accessState === ACCESS_STATE.TEAM.GUEST_ROOM) ||
              (prevAccessState === ACCESS_STATE.TEAM.SERVICES && accessState === ACCESS_STATE.TEAM.TEAM_ONLY)
            ) {
              messageString = t('modalConversationServicesOptionsDisableServicesMessage');
            }
            this._showModal(messageString);
          }
          return;
        }
      }
    }

    this._showModal(
      isTogglingGuest
        ? t('modalConversationGuestOptionsToggleGuestsMessage')
        : t('modalConversationServicesOptionsToggleServicesMessage'),
    );
  }

  async getAccessCode(conversationEntity: Conversation): Promise<void> {
    try {
      const response = await this.conversationService.getConversationCode(conversationEntity.id);
      return ConversationMapper.mapAccessCode(conversationEntity, response);
    } catch (error) {
      const isNotFound = error.code === HTTP_STATUS.NOT_FOUND;
      if (!isNotFound) {
        this._showModal(t('modalConversationGuestOptionsGetCodeMessage'));
      }
    }
  }

  async requestAccessCode(conversationEntity: Conversation): Promise<void> {
    try {
      const response = await this.conversationService.postConversationCode(conversationEntity.id);
      const accessCode = response && response.data;
      if (accessCode) {
        ConversationMapper.mapAccessCode(conversationEntity, accessCode);
      }
    } catch (e) {
      return this._showModal(t('modalConversationGuestOptionsRequestCodeMessage'));
    }
  }

  async revokeAccessCode(conversationEntity: Conversation): Promise<void> {
    try {
      await this.conversationService.deleteConversationCode(conversationEntity.id);
      conversationEntity.accessCode(undefined);
    } catch (e) {
      return this._showModal(t('modalConversationGuestOptionsRevokeCodeMessage'));
    }
  }

  private _mapConversationAccessState(
    conversationEntity: Conversation,
    eventJson: ConversationEvent<Partial<ConversationAccessV2UpdateData & ConversationAccessUpdateData>>,
  ): void {
    const {access: accessModes, ...roles} = eventJson.data;
    ConversationMapper.mapAccessState(conversationEntity, accessModes, roles?.access_role, roles?.access_role_v2);
  }

  private _resetConversationAccessCode(conversationEntity: Conversation): void {
    conversationEntity.accessCode(undefined);
  }

  private _updateConversationAccessCode(
    conversationEntity: Conversation,
    eventJson: ConversationEvent<ConversationCode>,
  ): void {
    ConversationMapper.mapAccessCode(conversationEntity, eventJson.data);
  }

  private _showModal(message: string): void {
    const modalOptions = {text: {message}};
    amplify.publish(WebAppEvents.WARNING.MODAL, ModalsViewModel.TYPE.ACKNOWLEDGE, modalOptions);
  }
}
