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
  /**
   * Trim query string for search.
   * @param {string} query - Service search string
   * @returns {string} Normalized service search query
   */
  static normalizeQuery(query) {
    if (!_.isString(query)) {
      return '';
    }
    return query.trim().toLowerCase();
  }

  constructor(integrationService, conversationRepository, teamRepository) {
    this.logger = new z.util.Logger('z.integration.IntegrationRepository', z.config.LOGGER.OPTIONS);

    this.integrationService = integrationService;

    this.conversationRepository = conversationRepository;
    this.teamRepository = teamRepository;

    this.isTeam = this.teamRepository.isTeam;
    this.services = ko.observableArray([]);

    this.supportIntegrations = ko.observable();
    this.enableIntegrations = ko.pureComputed(() => {
      const isBoolean = _.isBoolean(this.supportIntegrations());
      const isEnabled = isBoolean ? this.supportIntegrations() : !z.util.Environment.frontend.isProduction();
      return this.isTeam() && isEnabled;
    });
  }

  /**
   * Add a bot to an existing conversation.
   *
   * @param {Conversation} conversationEntity - Conversation to add bot to
   * @param {z.integration.ServiceEntity} serviceEntity - Service to be added to conversation
   * @param {string} method - Method used to add service
   * @returns {Promise} Resolves when bot was added
   */
  addService(conversationEntity, serviceEntity, method) {
    const {id: serviceId, name, providerId} = serviceEntity;
    this.logger.info(`Adding service '${name}' to conversation '${conversationEntity.id}'`, serviceEntity);

    return this.conversationRepository.addBot(conversationEntity, providerId, serviceId).then(event => {
      if (event) {
        const attributes = {
          conversation_size: conversationEntity.getNumberOfParticipants(true, false),
          method: method,
          service_id: serviceId,
          services_size: conversationEntity.getNumberOfBots(),
        };

        amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.INTEGRATION.ADDED_SERVICE, attributes);
      }

      return event;
    });
  }

  addServiceFromParam(providerId, serviceId) {
    if (this.isTeam()) {
      this.getServiceById(providerId, serviceId).then(serviceEntity => {
        amplify.publish(z.event.WebApp.WARNING.MODAL, z.viewModel.ModalsViewModel.TYPE.CONFIRM, {
          action: () => this.createConversationWithService(serviceEntity, 'url_param'),
          preventClose: true,
          text: {
            action: z.l10n.text(z.string.modalConversationAddBotAction),
            message: z.l10n.text(z.string.modalConversationAddBotMessage, serviceEntity.name),
            title: z.l10n.text(z.string.modalConversationAddBotHeadline),
          },
          warning: false,
        });
      });
    }
  }

  /**
   * Add bot to conversation.
   *
   * @param {z.integration.ServiceEntity} serviceEntity - Information about service to be added
   * @param {string} [method] - Method used to trigger integration setup
   * @returns {Promise} Resolves when integration was added to conversation
   */
  createConversationWithService(serviceEntity, method) {
    return this.conversationRepository
      .createGroupConversation([], serviceEntity.name, z.conversation.ACCESS_STATE.TEAM.GUEST_ROOM)
      .then(conversationEntity => {
        if (conversationEntity) {
          return this.addService(conversationEntity, serviceEntity, method).then(() => conversationEntity);
        }

        throw new z.conversation.ConversationError(z.conversation.ConversationError.TYPE.CONVERSATION_NOT_FOUND);
      })
      .then(conversationEntity => {
        if (conversationEntity) {
          amplify.publish(z.event.WebApp.CONVERSATION.SHOW, conversationEntity);
        }
      })
      .catch(error => {
        amplify.publish(z.event.WebApp.WARNING.MODAL, z.viewModel.ModalsViewModel.TYPE.ACKNOWLEDGE, {
          text: {
            message: z.l10n.text(z.string.modalIntegrationUnavailableMessage),
            title: z.l10n.text(z.string.modalIntegrationUnavailableHeadline),
          },
        });
        throw error;
      });
  }

  getProviderById(providerId) {
    return this.integrationService.getProvider(providerId).then(response => {
      if (response) {
        return z.integration.IntegrationMapper.mapProviderFromObject(response);
      }
    });
  }

  getProviderNameForService(serviceEntity) {
    return this.getProviderById(serviceEntity.providerId).then(providerEntity => {
      serviceEntity.providerName(providerEntity.name);
    });
  }

  getServiceById(providerId, serviceId) {
    return this.integrationService.getService(providerId, serviceId).then(service => {
      if (service) {
        return z.integration.IntegrationMapper.mapServiceFromObject(service);
      }
    });
  }

  getServices(tags, start) {
    const tagsArray = _.isArray(tags) ? tags.slice(0, 3) : [z.integration.ServiceTag.INTEGRATION];

    return this.integrationService.getServices(tagsArray.join(','), start).then(({services}) => {
      if (services.length) {
        return z.integration.IntegrationMapper.mapServicesFromArray(services);
      }
      return [];
    });
  }

  getServicesByProvider(providerId) {
    return this.integrationService.getProviderServices(providerId).then(services => {
      if (services.length) {
        return z.integration.IntegrationMapper.mapServicesFromArray(services);
      }
      return [];
    });
  }

  /**
   * Remove service from conversation.
   *
   * @param {Conversation} conversationEntity - Conversation to remove service from
   * @param {z.entity.User} userEntity - Bot user to be removed from the conversation
   * @returns {Promise} Resolves when bot was removed from the conversation
   */
  removeService(conversationEntity, userEntity) {
    const {id: userId, serviceId} = userEntity;

    return this.conversationRepository.removeBot(conversationEntity, userId).then(event => {
      if (event) {
        const attributes = {service_id: serviceId};
        amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.INTEGRATION.REMOVED_SERVICE, attributes);
        return event;
      }
    });
  }

  searchForServices(query, queryObservable) {
    const normalizedQuery = IntegrationRepository.normalizeQuery(query);

    this.getServices(null, normalizedQuery)
      .then(servicesEntities => {
        const isCurrentQuery = normalizedQuery === IntegrationRepository.normalizeQuery(queryObservable());
        if (isCurrentQuery) {
          this.services(servicesEntities);
        }
      })
      .catch(error => this.logger.error(`Error searching for services: ${error.message}`, error));
  }
};
