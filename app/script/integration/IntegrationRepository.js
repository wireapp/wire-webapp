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

'use strict';

window.z = window.z || {};
window.z.integration = z.integration || {};

z.integration.IntegrationRepository = class IntegrationRepository {
  constructor(integrationService, conversationRepository) {
    this.logger = new z.util.Logger('z.integration.IntegrationRepository', z.config.LOGGER.OPTIONS);
    this.conversationRepository = conversationRepository;
    this.integrationService = integrationService;
  }

  /**
   * Add bot to conversation.
   * @param {Object} serviceInfo - Integration token
   * @option {string} name - Service name registered on backend (will be used as conversation name)
   * @option {string} providerId - Provider UUID
   * @option {string} serviceId - Service UUID
   * @param {boolean} [createConversation=true] - A new conversation is created if true otherwise bot is added to active conversation
   * @returns {Promise} Resolves when integration was added to conversation
   */
  addService({name, providerId, serviceId}, createConversation = true) {
    this.logger.info(`Info for integration service '${name}' retrieved.`, {name, providerId, serviceId});
    return Promise.resolve()
      .then(() => {
        if (createConversation) {
          return this.conversationRepository.create_new_conversation([], name);
        }
        return this.conversationRepository.active_conversation();
      })
      .then(conversationEntity => this.conversationRepository.addBot(conversationEntity, providerId, serviceId))
      .then(conversationEntity => amplify.publish(z.event.WebApp.CONVERSATION.SHOW, conversationEntity))
      .catch(error => {
        amplify.publish(z.event.WebApp.WARNING.MODAL, z.ViewModel.ModalType.BOTS_UNAVAILABLE);
        throw error;
      });
  }
};
