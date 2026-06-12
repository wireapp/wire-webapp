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
import {StatusCodes as HTTP_STATUS} from 'http-status-codes';

import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import type {Conversation} from 'Repositories/entity/Conversation';
import {t} from 'Util/localizerUtil';
import {isErrorWithCode} from 'Util/typePredicateUtil';

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
  private readonly translate: typeof t;

  constructor(conversationService: ConversationService, translate: typeof t) {
    super();
    const eventHandlingConfig: EventHandlingConfig = {
      [CONVERSATION_EVENT.ACCESS_UPDATE]: this._mapConversationAccessState.bind(this),
      [CONVERSATION_EVENT.CODE_DELETE]: this._resetConversationAccessCode.bind(this),
      [CONVERSATION_EVENT.CODE_UPDATE]: this._updateConversationAccessCode.bind(this),
    };
    this.setEventHandlingConfig(eventHandlingConfig);
    this.conversationService = conversationService;
    this.translate = translate;
  }

  async changeAccessState(conversationEntity: Conversation, accessState: ACCESS_STATE): Promise<void> {
    const isConversationInTeam = conversationEntity.inTeam();
    const isStateChange = conversationEntity.accessState() !== accessState;
    const prevAccessState = conversationEntity.accessState();

    if (isConversationInTeam) {
      if (isStateChange) {
        const {accessModes, accessRole} = updateAccessRights(accessState);
        if (accessModes !== undefined && accessRole !== undefined) {
          try {
            const isGettingAccessCode = isGettingAccessToFeature(ACCESS_MODES.CODE, prevAccessState, accessState);
            if (isGettingAccessCode === false) {
              conversationEntity.accessCode('');
              await this.revokeAccessCode(conversationEntity);
            }

            const {domain, id} = conversationEntity;
            const conversationId = {id, domain};

            await this.conversationService.putConversationAccess(conversationId, accessModes, accessRole);

            conversationEntity.accessState(accessState);
          } catch {
            let messageString: string;
            const {featureName, ...featureInfo} = featureFromStateChange(prevAccessState, accessState);

            if (featureInfo.isAvailable) {
              messageString = this.translate(
                `modalConversationOptionsAllow${featureName as 'Guest' | 'Service'}Message`,
              );
            } else {
              messageString = this.translate(
                `modalConversationOptionsDisable${featureName as 'Guest' | 'Service'}Message`,
              );
            }
            this._showModal(messageString);
          }
          return;
        }
      }
    }
    const {featureName} = featureFromStateChange(prevAccessState, accessState);
    this._showModal(this.translate(`modalConversationOptionsToggle${featureName as 'Service' | 'Guest'}Message`));
  }

  async getAccessCode(conversationEntity: Conversation): Promise<void> {
    try {
      const response = await this.conversationService.getConversationCode(conversationEntity.id);
      return ConversationMapper.mapAccessCode(conversationEntity, response);
    } catch (error: unknown) {
      const isNotFound = isErrorWithCode(error) && error.code === HTTP_STATUS.NOT_FOUND;
      if (!isNotFound) {
        this._showModal(this.translate('modalConversationGuestOptionsGetCodeMessage'));
      }
    }
  }

  async requestAccessCode(conversationEntity: Conversation, password?: string): Promise<void> {
    try {
      const response = await this.conversationService.postConversationCode(conversationEntity.id, password ?? '');
      const accessCode = response?.data;
      if (accessCode !== undefined) {
        ConversationMapper.mapAccessCode(conversationEntity, accessCode);
      }
    } catch {
      return this._showModal(this.translate('modalConversationGuestOptionsRequestCodeMessage'));
    }
  }

  async revokeAccessCode(conversationEntity: Conversation): Promise<void> {
    try {
      await this.conversationService.deleteConversationCode(conversationEntity.id);
      conversationEntity.accessCode('');
    } catch {
      return this._showModal(this.translate('modalConversationGuestOptionsRevokeCodeMessage'));
    }
  }

  private _mapConversationAccessState(
    conversationEntity: Conversation,
    eventJson: ConversationEvent<CONVERSATION_EVENT.ACCESS_UPDATE, ConversationAccessUpdateData>,
  ): void {
    const {access: accessModes, ...roles} = eventJson.data;
    const accessRole = roles.access_role;
    if (accessRole === undefined) {
      return;
    }
    ConversationMapper.mapAccessState(conversationEntity, accessModes, accessRole, roles.access_role_v2);
  }

  private _resetConversationAccessCode(conversationEntity: Conversation): void {
    conversationEntity.accessCode('');
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
