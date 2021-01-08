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

import {CONVERSATION_ACCESS, CONVERSATION_ACCESS_ROLE, ConversationCode} from '@wireapp/api-client/src/conversation';
import {ConversationAccessUpdateData} from '@wireapp/api-client/src/conversation/data';
import {CONVERSATION_EVENT} from '@wireapp/api-client/src/event';
import {amplify} from 'amplify';
import {WebAppEvents} from '@wireapp/webapp-events';
import {StatusCodes as HTTP_STATUS} from 'http-status-codes';

import {t} from 'Util/LocalizerUtil';

import {ModalsViewModel} from '../view_model/ModalsViewModel';

import type {Conversation} from '../entity/Conversation';
import {AbstractConversationEventHandler, EventHandlingConfig} from './AbstractConversationEventHandler';
import {ACCESS_STATE} from './AccessState';
import type {ConversationMapper} from './ConversationMapper';
import type {ConversationService} from './ConversationService';
import {ConversationEvent} from './EventBuilder';

export class ConversationStateHandler extends AbstractConversationEventHandler {
  private readonly conversationMapper: ConversationMapper;
  private readonly conversationService: ConversationService;

  constructor(conversationService: ConversationService, conversationMapper: ConversationMapper) {
    super();
    const eventHandlingConfig: EventHandlingConfig = {
      [CONVERSATION_EVENT.ACCESS_UPDATE]: this._mapConversationAccessState.bind(this),
      [CONVERSATION_EVENT.CODE_DELETE]: this._resetConversationAccessCode.bind(this),
      [CONVERSATION_EVENT.CODE_UPDATE]: this._updateConversationAccessCode.bind(this),
    };
    this.setEventHandlingConfig(eventHandlingConfig);
    this.conversationMapper = conversationMapper;
    this.conversationService = conversationService;
  }

  async changeAccessState(conversationEntity: Conversation, accessState: string): Promise<void> {
    const isConversationInTeam = conversationEntity && conversationEntity.inTeam();
    if (isConversationInTeam) {
      const isStateChange = conversationEntity.accessState() !== accessState;

      if (isStateChange) {
        let accessModes;
        let accessRole;

        const changeToGuestRoom = accessState === ACCESS_STATE.TEAM.GUEST_ROOM;
        const changeToTeamOnly = accessState === ACCESS_STATE.TEAM.TEAM_ONLY;
        if (changeToGuestRoom) {
          accessModes = [CONVERSATION_ACCESS.INVITE, CONVERSATION_ACCESS.CODE];
          accessRole = CONVERSATION_ACCESS_ROLE.NON_ACTIVATED;
        } else if (changeToTeamOnly) {
          accessModes = [CONVERSATION_ACCESS.INVITE];
          accessRole = CONVERSATION_ACCESS_ROLE.TEAM;
        }

        if (accessModes && accessRole) {
          try {
            await this.conversationService.putConversationAccess(conversationEntity.id, accessModes, accessRole);
            conversationEntity.accessState(accessState);

            if (changeToTeamOnly) {
              conversationEntity.accessCode(undefined);
            }
          } catch (e) {
            const messageString = changeToGuestRoom
              ? t('modalConversationGuestOptionsAllowGuestMessage')
              : t('modalConversationGuestOptionsDisableGuestMessage');

            this._showModal(messageString);
          }
          return;
        }
      }
    }

    this._showModal(t('modalConversationGuestOptionsToggleGuestsMessage'));
  }

  async getAccessCode(conversationEntity: Conversation): Promise<void> {
    try {
      const response = await this.conversationService.getConversationCode(conversationEntity.id);
      return this.conversationMapper.mapAccessCode(conversationEntity, response);
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
        this.conversationMapper.mapAccessCode(conversationEntity, accessCode);
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
    eventJson: ConversationEvent<ConversationAccessUpdateData>,
  ): void {
    const {access: accessModes, access_role: accessRole} = eventJson.data;
    this.conversationMapper.mapAccessState(conversationEntity, accessModes, accessRole);
  }

  private _resetConversationAccessCode(conversationEntity: Conversation): void {
    conversationEntity.accessCode(undefined);
  }

  private _updateConversationAccessCode(
    conversationEntity: Conversation,
    eventJson: ConversationEvent<ConversationCode>,
  ): void {
    this.conversationMapper.mapAccessCode(conversationEntity, eventJson.data);
  }

  private _showModal(message: string): void {
    const modalOptions = {text: {message}};
    amplify.publish(WebAppEvents.WARNING.MODAL, ModalsViewModel.TYPE.ACKNOWLEDGE, modalOptions);
  }
}
