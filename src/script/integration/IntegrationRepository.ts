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

import {amplify} from 'amplify';
import {Observable, ObservableArray, PureComputed} from 'knockout';

import {t} from 'Util/LocalizerUtil';
import {Logger, getLogger} from 'Util/Logger';
import {compareTransliteration, sortByPriority} from 'Util/StringUtil';

import {ACCESS_STATE} from '../conversation/AccessState';
import {ConversationRepository} from '../conversation/ConversationRepository';
import {Conversation} from '../entity/Conversation';
import {User} from '../entity/User';
import {WebAppEvents} from '../event/WebApp';
import {TeamRepository} from '../team/TeamRepository';
import {EventName} from '../tracking/EventName';
import {ModalsViewModel} from '../view_model/ModalsViewModel';
import {IntegrationMapper} from './IntegrationMapper';
import {IntegrationService} from './IntegrationService';
import {ServiceEntity} from './ServiceEntity';
import {ServiceTag} from './ServiceTag';

export class IntegrationRepository {
  private readonly conversationRepository: ConversationRepository;
  private readonly integrationService: IntegrationService;
  private readonly logger: Logger;
  private readonly teamRepository: TeamRepository;
  public readonly isTeam: PureComputed<boolean>;
  public readonly services: ObservableArray<ServiceEntity>;

  /**
   * Trim query string for search.
   * @param query Service search string
   * @returns Normalized service search query
   */
  static normalizeQuery(query: string): string {
    if (typeof query === 'string') {
      return query.trim().toLowerCase();
    }
    return '';
  }

  constructor(
    integrationService: IntegrationService,
    conversationRepository: ConversationRepository,
    teamRepository: TeamRepository,
  ) {
    this.logger = getLogger('IntegrationRepository');

    this.integrationService = integrationService;

    this.conversationRepository = conversationRepository;
    this.teamRepository = teamRepository;

    this.isTeam = this.teamRepository.isTeam;
    this.services = ko.observableArray([]);
  }

  /**
   * Get provider name for entity.
   * @param entity Service or user to add provider name to
   */
  addProviderNameToParticipant(entity: ServiceEntity): Promise<ServiceEntity>;
  addProviderNameToParticipant(entity: User): Promise<User>;
  addProviderNameToParticipant(entity: ServiceEntity | User): Promise<ServiceEntity | User> {
    const shouldUpdateProviderName = !!entity.providerName()?.trim();

    return shouldUpdateProviderName
      ? this.getProviderById(entity.providerId).then(providerEntity => {
          entity.providerName(providerEntity.name);
          return entity;
        })
      : Promise.resolve(entity);
  }

  /**
   * Get ServiceEntity for entity.
   * @param entity Service or user to resolve to ServiceEntity
   */
  getServiceFromUser(entity: ServiceEntity | User): Promise<ServiceEntity> {
    if (entity instanceof ServiceEntity) {
      return Promise.resolve(entity);
    }
    const {providerId, serviceId} = entity;
    return this.getServiceById(providerId, serviceId);
  }

  /**
   * Add a service to an existing conversation.
   *
   * @param conversationEntity Conversation to add service to
   * @param serviceEntity Service to be added to conversation
   * @param method Method used to add service
   */
  addService(conversationEntity: Conversation, serviceEntity: ServiceEntity, method: string): Promise<any> {
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

        amplify.publish(WebAppEvents.ANALYTICS.EVENT, EventName.INTEGRATION.ADDED_SERVICE, attributes);
      }

      return event;
    });
  }

  /**
   * Add service to conversation.
   *
   * @param serviceEntity Information about service to be added
   * @returns Resolves when conversation with the integration was created
   */
  create1to1ConversationWithService(serviceEntity: ServiceEntity): Promise<Conversation> {
    return this.conversationRepository
      .createGroupConversation([], undefined, ACCESS_STATE.TEAM.GUEST_ROOM)
      .then(conversationEntity => {
        if (conversationEntity) {
          return this.addService(conversationEntity, serviceEntity, 'start_ui').then(() => conversationEntity);
        }

        throw new z.error.ConversationError(z.error.ConversationError.TYPE.CONVERSATION_NOT_FOUND);
      })
      .catch(error => {
        amplify.publish(WebAppEvents.WARNING.MODAL, ModalsViewModel.TYPE.ACKNOWLEDGE, {
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
   * @param serviceEntity Service entity for whom to get the conversation
   * @returns Resolves with the conversation with requested service
   */
  get1To1ConversationWithService(serviceEntity: ServiceEntity): Promise<Conversation> {
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

  getProviderById(providerId: string): Promise<any> {
    return this.integrationService.getProvider(providerId).then(providerData => {
      if (providerData) {
        return IntegrationMapper.mapProviderFromObject(providerData);
      }
      return undefined;
    });
  }

  getServiceById(providerId: string, serviceId: string): Promise<any> {
    return this.integrationService.getService(providerId, serviceId).then(serviceData => {
      if (serviceData) {
        return IntegrationMapper.mapServiceFromObject(serviceData);
      }
      return undefined;
    });
  }

  getServices(tags: ServiceTag | ServiceTag[], start: string): Promise<ServiceEntity[]> {
    const tagsArray = Array.isArray(tags) ? tags.slice(0, 3) : [ServiceTag.INTEGRATION];

    return this.integrationService.getServices(tagsArray.join(','), start).then(({services: servicesData}) => {
      return IntegrationMapper.mapServicesFromArray(servicesData);
    });
  }

  getServicesByProvider(providerId: string): Promise<ServiceEntity[]> {
    return this.integrationService.getProviderServices(providerId).then(servicesData => {
      return IntegrationMapper.mapServicesFromArray(servicesData);
    });
  }

  /**
   * Remove service from conversation.
   *
   * @param conversationEntity Conversation to remove service from
   * @param userEntity Service user to be removed from the conversation
   */
  removeService(conversationEntity: Conversation, userEntity: User): Promise<any> {
    const {id: userId, serviceId} = userEntity;

    return this.conversationRepository.removeService(conversationEntity, userId).then(event => {
      if (event) {
        const attributes = {service_id: serviceId};
        amplify.publish(WebAppEvents.ANALYTICS.EVENT, EventName.INTEGRATION.REMOVED_SERVICE, attributes);
        return event;
      }
    });
  }

  searchForServices(query: string, queryObservable: Observable<string>): Promise<void> {
    const normalizedQuery = IntegrationRepository.normalizeQuery(query);

    return this.teamRepository
      .getWhitelistedServices(this.teamRepository.team().id, 20)
      .then((serviceEntities: ServiceEntity[]) => {
        const isCurrentQuery = normalizedQuery === IntegrationRepository.normalizeQuery(queryObservable());
        if (isCurrentQuery) {
          serviceEntities = serviceEntities
            .filter(serviceEntity => compareTransliteration(serviceEntity.name, normalizedQuery))
            .sort((serviceA, serviceB) => {
              return sortByPriority(serviceA.name, serviceB.name, normalizedQuery);
            });
          this.services(serviceEntities);
        }
      })
      .catch((error: Error) => this.logger.error(`Error searching for services: ${error.message}`, error));
  }
}
