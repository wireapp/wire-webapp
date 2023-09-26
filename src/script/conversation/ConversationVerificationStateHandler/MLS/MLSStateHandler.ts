/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {X509Certificate} from '@peculiar/x509';
import {QualifiedId} from '@wireapp/api-client/lib/user';
import {container} from 'tsyringe';

import {Conversation} from 'src/script/entity/Conversation';
import {EventRepository} from 'src/script/event/EventRepository';
import {VerificationMessageType} from 'src/script/message/VerificationMessageType';
import {Core} from 'src/script/service/CoreSingleton';
import {Logger, getLogger} from 'Util/Logger';

import {isMLSConversation} from '../../ConversationSelectors';
import {ConversationState} from '../../ConversationState';
import {EventBuilder} from '../../EventBuilder';
import {getConversationByGroupId, willChangeToDegraded, willChangeToVerified} from '../shared';

export class MLSConversationVerificationStateHandler {
  private readonly logger: Logger;

  public constructor(
    private readonly eventRepository: EventRepository,
    private readonly conversationState = container.resolve(ConversationState),
    private readonly core = container.resolve(Core),
  ) {
    this.logger = getLogger('MLSConversationVerificationStateHandler');
    // We need to check if the core service is available
    if (!this.core.service?.mls) {
      this.logger.error('MLS service not available');
      return;
    }
    // We need to check if the e2eIdentity service is available
    if (!this.core.service?.e2eIdentity) {
      this.logger.error('E2E identity service not available');
      return;
    }
    // We hook into the newEpoch event of the MLS service to check if the conversation needs to be verified or degraded
    this.core.service.mls.on('newEpoch', this.checkEpoch);
  }

  /**
   * This function checks if the conversation is verified and if it is, it will degrade it
   * @param conversationEntity
   * @param userIds
   */
  private degradeConversation = async (conversationEntity: Conversation, userIds: QualifiedId[]) => {
    this.logger.log(`Conversation ${conversationEntity.name} will be degraded`);
    const statusChanged = willChangeToDegraded({
      conversationEntity,
      logger: this.logger,
    });
    if (statusChanged) {
      const type = VerificationMessageType.UNVERIFIED;
      const event = EventBuilder.buildDegraded(conversationEntity, userIds, type);
      await this.eventRepository.injectEvent(event);
    }
  };

  /**
   * This function checks if the conversation is degraded and if it is, it will verify it
   * @param conversationEntity
   * @param userIds
   */
  private verifyConversation = async (conversationEntity: Conversation) => {
    this.logger.log(`Conversation ${conversationEntity.name} will be verified`);
    const statusChanged = willChangeToVerified({conversationEntity, logger: this.logger});
    if (statusChanged) {
      const allVerifiedEvent = EventBuilder.buildAllVerified(conversationEntity);
      await this.eventRepository.injectEvent(allVerifiedEvent);
    }
  };

  /**
   * This function returns the WireIdentity of all userDeviceEntities in a conversation, as long as they have a certificate.
   * If the conversation has userDeviceEntities without a certificate, it will not be included in the returned array
   *
   */
  private getAllUserEntitiesInConversation = async (conversation: Conversation) => {
    if (!conversation.groupId) {
      this.logger.error('Conversation has no groupId', conversation.name);
      throw new Error('Conversation has no groupId');
    }

    const userEntities = conversation.getAllUserEntities();

    const deviceUserPairs = userEntities
      .flatMap(userEntity => {
        return userEntity.devices().map(device => ({[device.id]: userEntity.qualifiedId}));
      })
      .reduce((acc, current) => {
        return {...acc, ...current};
      }, {});

    const identities = await this.core.service!.e2eIdentity!.getUserDeviceEntities(
      conversation.groupId,
      deviceUserPairs,
    );

    return {
      identities,
      isResultComplete: Object.keys(deviceUserPairs).length === identities.length,
      qualifiedIds: userEntities.map(userEntity => userEntity.qualifiedId),
    };
  };

  private async isCertificateActiveAndValid(certificateString: string): Promise<boolean> {
    const cert = new X509Certificate(certificateString);
    const isValid = await cert.verify();
    const isActive = cert.notAfter.getTime() > Date.now();

    return isValid && isActive;
  }

  private async checkEpoch({groupId, epoch}: {groupId: string; epoch: number}): Promise<void> {
    this.logger.log(`Epoch changed to ${epoch} for groupId ${groupId}`);
    const conversationEntity = getConversationByGroupId({conversationState: this.conversationState, groupId});
    if (!conversationEntity) {
      this.logger.error(`Epoch changed but conversationEntity can't be found`);
      return;
    }
    // We only want to process MLS conversations
    if (!isMLSConversation(conversationEntity)) {
      this.logger.error(`Epoch changed but conversationEntity is not using MLS protocol`);
      return;
    }

    const {isResultComplete, identities, qualifiedIds} =
      await this.getAllUserEntitiesInConversation(conversationEntity);

    // If the number of userDevicePairs is not equal to the number of identities, our Conversation is not secure
    if (!isResultComplete) {
      return this.degradeConversation(conversationEntity, qualifiedIds);
    }

    // We need to check if identities are valid and not expired
    const certificates = identities.map(identity => identity.certificate);
    if (certificates.some(certificate => !this.isCertificateActiveAndValid(certificate))) {
      return this.degradeConversation(conversationEntity, qualifiedIds);
    }

    // We need to check if none of the certificates have been revoked
    // ToDO: Implement this check, after CoreCrypto added the functionality
    this.logger.warn('ToDo: Revocation check not implemented yet, this needs to be done after CoreCrypto is updated');

    // If we reach this point, all checks have passed and we can set the conversation to verified
    return this.verifyConversation(conversationEntity);
  }
}
