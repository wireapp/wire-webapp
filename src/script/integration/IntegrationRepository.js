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

import {t} from 'utils/LocalizerUtil';

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
  }

  /**
   * Get provider name for entity.
   * @param {ServiceEntity|User} entity - Service or user to add provider name to
   * @returns {Promise} - Resolves with the entity
   */
  addProviderNameToParticipant(entity) {
    const shouldUpdateProviderName = entity.providerName && !entity.providerName().trim();
    return shouldUpdateProviderName
      ? this.getProviderById(entity.providerId).then(providerEntity => {
          entity.providerName(providerEntity.name);
          return entity;
        })
      : entity;
  }

  /**
   * Get ServiceEntity for entity.
   * @param {z.integration.ServiceEntity|User} entity - Service or user to resolve to ServiceEntity
   * @returns {Promise} - Resolves with the ServiceEntity
   */
  getServiceFromUser(entity) {
    if (entity instanceof z.integration.ServiceEntity) {
      return Promise.resolve(entity);
    }
    const {providerId, serviceId} = entity;
    return this.getServiceById(providerId, serviceId);
  }

  /**
   * Add a service to an existing conversation.
   *
   * @param {Conversation} conversationEntity - Conversation to add service to
   * @param {z.integration.ServiceEntity} serviceEntity - Service to be added to conversation
   * @param {string} method - Method used to add service
   * @returns {Promise} Resolves when service was added
   */
  addService(conversationEntity, serviceEntity, method) {
    const {id: serviceId, name, providerId} = serviceEntity;
    this.logger.info(`Adding service '${name}' to conversation '${conversationEntity.id}'`, serviceEntity);

    return this.conversationRepository.addService(conversationEntity, providerId, serviceId).then(event => {
      if (event) {
        const attributes = {
          conversation_size: conversationEntity.getNumberOfParticipants(true, false),
          method: method,
          service_id: serviceId,
          services_size: conversationEntity.getNumberOfServices(),
        };

        amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.INTEGRATION.ADDED_SERVICE, attributes);
      }

      return event;
    });
  }

  /**
   * Add service to conversation.
   *
   * @param {z.integration.ServiceEntity} serviceEntity - Information about service to be added
   * @returns {Promise} Resolves when conversation with the integration was was created
   */
  create1to1ConversationWithService(serviceEntity) {
    return this.conversationRepository
      .createGroupConversation([], undefined, z.conversation.ACCESS_STATE.TEAM.GUEST_ROOM)
      .then(conversationEntity => {
        if (conversationEntity) {
          return this.addService(conversationEntity, serviceEntity, 'start_ui').then(() => conversationEntity);
        }

        throw new z.error.ConversationError(z.error.ConversationError.TYPE.CONVERSATION_NOT_FOUND);
      })
      .catch(error => {
        amplify.publish(z.event.WebApp.WARNING.MODAL, z.viewModel.ModalsViewModel.TYPE.ACKNOWLEDGE, {
          text: {
            message: t('modalIntegrationUnavailableMessage'),
            title: t('modalIntegrationUnavailableHeadline'),
          },
        });
        throw error;
      });
  }

  /**
   * Get conversation with a service.
   * @param {Service} serviceEntity - Service entity for whom to get the conversation
   * @returns {Promise} Resolves with the conversation with requested service
   */
  get1To1ConversationWithService(serviceEntity) {
    const matchingConversationEntity = this.conversationRepository.conversations().find(conversationEntity => {
      if (!conversationEntity.is1to1()) {
        // Disregard conversations that are not 1:1
        return false;
      }

      const isActiveConversation = !conversationEntity.removed_from_conversation();
      if (!isActiveConversation) {
        // Disregard coversations that self is no longer part of
        return false;
      }

      const [userEntity] = conversationEntity.participating_user_ets();
      if (!userEntity) {
        // Disregard conversations with no user entities
        return false;
      }

      if (!userEntity.isService) {
        // Disregard conversations with users instead of services
        return false;
      }

      const {serviceId, providerId} = userEntity;
      const isExpectedServiceId = serviceEntity.id === serviceId;
      const isExpectedProviderId = serviceEntity.providerId === providerId;
      return isExpectedServiceId && isExpectedProviderId;
    });

    return matchingConversationEntity
      ? Promise.resolve(matchingConversationEntity)
      : this.create1to1ConversationWithService(serviceEntity);
  }

  getProviderById(providerId) {
    return this.integrationService.getProvider(providerId).then(providerData => {
      if (providerData) {
        return z.integration.IntegrationMapper.mapProviderFromObject(providerData);
      }
    });
  }

  getServiceById(providerId, serviceId) {
    return this.integrationService.getService(providerId, serviceId).then(serviceData => {
      if (serviceData) {
        return z.integration.IntegrationMapper.mapServiceFromObject(serviceData);
      }
    });
  }

  getServices(tags, start) {
    const tagsArray = _.isArray(tags) ? tags.slice(0, 3) : [z.integration.ServiceTag.INTEGRATION];

    return this.integrationService.getServices(tagsArray.join(','), start).then(({services: servicesData}) => {
      return z.integration.IntegrationMapper.mapServicesFromArray(servicesData);
    });
  }

  getServicesByProvider(providerId) {
    return this.integrationService.getProviderServices(providerId).then(servicesData => {
      return z.integration.IntegrationMapper.mapServicesFromArray(servicesData);
    });
  }

  /**
   * Remove service from conversation.
   *
   * @param {Conversation} conversationEntity - Conversation to remove service from
   * @param {z.entity.User} userEntity - Service user to be removed from the conversation
   * @returns {Promise} Resolves when service was removed from the conversation
   */
  removeService(conversationEntity, userEntity) {
    const {id: userId, serviceId} = userEntity;

    return this.conversationRepository.removeService(conversationEntity, userId).then(event => {
      if (event) {
        const attributes = {service_id: serviceId};
        amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.INTEGRATION.REMOVED_SERVICE, attributes);
        return event;
      }
    });
  }

  searchForServices(query, queryObservable) {
    const normalizedQuery = IntegrationRepository.normalizeQuery(query);

    return this.teamRepository
      .getWhitelistedServices(this.teamRepository.team().id, 20)
      .then(serviceEntities => {
        const isCurrentQuery = normalizedQuery === IntegrationRepository.normalizeQuery(queryObservable());
        if (isCurrentQuery) {
          serviceEntities = serviceEntities
            .filter(serviceEntity => z.util.StringUtil.compareTransliteration(serviceEntity.name, normalizedQuery))
            .sort((serviceA, serviceB) => {
              return z.util.StringUtil.sortByPriority(serviceA.name, serviceB.name, normalizedQuery);
            });
          this.services(serviceEntities);
        }
      })
      .catch(error => this.logger.error(`Error searching for services: ${error.message}`, error));
  }
};
