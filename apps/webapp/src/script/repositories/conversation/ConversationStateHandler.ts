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

import {ConversationCode} from '@wireapp/api-client/lib/conversation/';
import {ConversationAccessUpdateData} from '@wireapp/api-client/lib/conversation/data/';
import {CONVERSATION_EVENT} from '@wireapp/api-client/lib/event/';
import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import {StatusCodes as HTTP_STATUS} from 'http-status-codes';
import type {Conversation} from 'Repositories/entity/Conversation';
import {t} from 'Util/LocalizerUtil';

import {AbstractConversationEventHandler, EventHandlingConfig} from './AbstractConversationEventHandler';
import {ACCESS_STATE} from './AccessState';
import {
  ACCESS_MODES,
  featureFromStateChange,
  isGettingAccessToFeature,
  updateAccessRights,
} from './ConversationAccessPermission';
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

  async changeAccessState(conversationEntity: Conversation, accessState: ACCESS_STATE): Promise<void> {
    const isConversationInTeam = conversationEntity && conversationEntity.inTeam();
    const isStateChange = conversationEntity.accessState() !== accessState;
    const prevAccessState = conversationEntity.accessState();

    if (isConversationInTeam) {
      if (isStateChange) {
        const {accessModes, accessRole} = updateAccessRights(accessState);
        if (accessModes && accessRole) {
          try {
            if (!isGettingAccessToFeature(ACCESS_MODES.CODE, prevAccessState, accessState)) {
              conversationEntity.accessCode(undefined);
              await this.revokeAccessCode(conversationEntity);
            }

            const {domain, id} = conversationEntity;
            const conversationId = {id, domain};

            await this.conversationService.putConversationAccess(conversationId, accessModes, accessRole);

            conversationEntity.accessState(accessState);
          } catch (e) {
            let messageString: string;
            const {featureName, ...featureInfo} = featureFromStateChange(prevAccessState, accessState);

            if (featureInfo.isAvailable) {
              messageString = t(`modalConversationOptionsAllow${featureName as 'Guest' | 'Service'}Message`);
            } else {
              messageString = t(`modalConversationOptionsDisable${featureName as 'Guest' | 'Service'}Message`);
            }
            this._showModal(messageString);
          }
          return;
        }
      }
    }
    const {featureName} = featureFromStateChange(prevAccessState, accessState);
    this._showModal(t(`modalConversationOptionsToggle${featureName as 'Service' | 'Guest'}Message`));
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

  async requestAccessCode(conversationEntity: Conversation, password?: string): Promise<void> {
    try {
      const response = await this.conversationService.postConversationCode(conversationEntity.id, password);
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
    eventJson: ConversationEvent<CONVERSATION_EVENT.ACCESS_UPDATE, ConversationAccessUpdateData>,
  ): void {
    const {access: accessModes, ...roles} = eventJson.data;
    ConversationMapper.mapAccessState(conversationEntity, accessModes, roles?.access_role, roles?.access_role_v2);
  }

  private _resetConversationAccessCode(conversationEntity: Conversation): void {
    conversationEntity.accessCode(undefined);
  }

  private _updateConversationAccessCode(
    conversationEntity: Conversation,
    eventJson: ConversationEvent<CONVERSATION_EVENT.CODE_UPDATE, ConversationCode>,
  ): void {
    ConversationMapper.mapAccessCode(conversationEntity, eventJson.data);
  }

  private _showModal(message: string): void {
    const modalOptions = {text: {message}};
    PrimaryModal.show(PrimaryModal.type.ACKNOWLEDGE, modalOptions);
  }
}
