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

import {ConversationCode} from '@wireapp/api-client/src/conversation/';
import {ConversationAccessUpdateData, ConversationAccessV2UpdateData} from '@wireapp/api-client/src/conversation/data/';
import {CONVERSATION_EVENT} from '@wireapp/api-client/src/event/';
import {StatusCodes as HTTP_STATUS} from 'http-status-codes';

import {t} from 'Util/LocalizerUtil';

import type {Conversation} from '../entity/Conversation';
import {AbstractConversationEventHandler, EventHandlingConfig} from './AbstractConversationEventHandler';
import {ACCESS_STATE} from './AccessState';
import {ConversationMapper} from './ConversationMapper';
import type {ConversationService} from './ConversationService';
import {ConversationEvent} from './EventBuilder';
import {
  ACCESS_MODES,
  featureFromStateChange,
  isGettingAccessToFeature,
  updateAccessRights,
} from './ConversationAccessPermission';
import PrimaryModal from '../components/Modals/PrimaryModal';

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
            await this.conversationService.putConversationAccess(conversationEntity.id, accessModes, accessRole);

            conversationEntity.accessState(accessState);
          } catch (e) {
            let messageString: string;
            const {featureName, ...featureInfo} = featureFromStateChange(prevAccessState, accessState);

            if (featureInfo.isAvailable) {
              messageString = t(`modalConversationOptionsAllow${featureName}Message`);
            } else {
              messageString = t(`modalConversationOptionsDisable${featureName}Message`);
            }
            this._showModal(messageString);
          }
          return;
        }
      }
    }
    const {featureName} = featureFromStateChange(prevAccessState, accessState);
    this._showModal(t(`modalConversationOptionsToggle${featureName}Message`));
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
    PrimaryModal.show(PrimaryModal.type.ACKNOWLEDGE, modalOptions);
  }
}
