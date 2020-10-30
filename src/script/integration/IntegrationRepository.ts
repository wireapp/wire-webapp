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

import ko from 'knockout';
import {amplify} from 'amplify';
import {WebAppEvents} from '@wireapp/webapp-events';
import type {ConversationMemberJoinEvent} from '@wireapp/api-client/src/event';

import {t} from 'Util/LocalizerUtil';
import {Logger, getLogger} from 'Util/Logger';
import {compareTransliteration, sortByPriority} from 'Util/StringUtil';

import {ACCESS_STATE} from '../conversation/AccessState';
import type {ConversationRepository} from '../conversation/ConversationRepository';
import type {Conversation} from '../entity/Conversation';
import type {User} from '../entity/User';
import type {TeamRepository} from '../team/TeamRepository';
import {ModalsViewModel} from '../view_model/ModalsViewModel';
import {IntegrationMapper} from './IntegrationMapper';
import type {IntegrationService} from './IntegrationService';
import {ServiceEntity} from './ServiceEntity';
import {ServiceTag} from './ServiceTag';
import {ConversationError} from '../error/ConversationError';
import {ProviderEntity} from './ProviderEntity';
import {MemberLeaveEvent} from '../conversation/EventBuilder';
import {container} from 'tsyringe';
import {TeamState} from '../team/TeamState';
import {ConversationState} from '../conversation/ConversationState';

export class IntegrationRepository {
  private readonly logger: Logger;
  public readonly isTeam: ko.PureComputed<boolean>;
  public readonly services: ko.ObservableArray<ServiceEntity>;

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
    private readonly integrationService: IntegrationService,
    private readonly conversationRepository: ConversationRepository,
    private readonly teamRepository: TeamRepository,
    private readonly teamState = container.resolve(TeamState),
    private readonly conversationState = container.resolve(ConversationState),
  ) {
    this.logger = getLogger('IntegrationRepository');

    this.isTeam = this.teamState.isTeam;
    this.services = ko.observableArray([]);
  }

  /**
   * Get provider name for entity.
   * @param entity Service or user to add provider name to
   */
  async addProviderNameToParticipant(entity: ServiceEntity): Promise<ServiceEntity | ProviderEntity>;
  async addProviderNameToParticipant(entity: User): Promise<User | ProviderEntity>;
  async addProviderNameToParticipant(entity: ServiceEntity | User): Promise<ServiceEntity | User | ProviderEntity> {
    const shouldUpdateProviderName = !!entity.providerName() && !entity.providerName().trim();

    if (shouldUpdateProviderName) {
      const providerEntity = await this.getProviderById(entity.providerId);
      entity.providerName(providerEntity.name);
    }

    return entity;
  }

  /**
   * Get ServiceEntity for entity.
   * @param entity Service or user to resolve to ServiceEntity
   */
  async getServiceFromUser(entity: ServiceEntity | User): Promise<ServiceEntity> {
    if (entity instanceof ServiceEntity) {
      return entity;
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
  addService(
    conversationEntity: Conversation,
    serviceEntity: ServiceEntity,
  ): Promise<ConversationMemberJoinEvent | void> {
    const {id: serviceId, name, providerId} = serviceEntity;
    this.logger.info(`Adding service '${name}' to conversation '${conversationEntity.id}'`, serviceEntity);

    return this.conversationRepository.addService(conversationEntity, providerId, serviceId);
  }

  /**
   * Add service to conversation.
   *
   * @param serviceEntity Information about service to be added
   * @returns Resolves when conversation with the integration was created
   */
  async create1to1ConversationWithService(serviceEntity: ServiceEntity): Promise<Conversation> {
    try {
      const conversationEntity = await this.conversationRepository.createGroupConversation(
        [],
        undefined,
        ACCESS_STATE.TEAM.GUEST_ROOM,
      );

      if (conversationEntity) {
        return this.addService(conversationEntity, serviceEntity).then(() => conversationEntity);
      }

      throw new ConversationError(
        ConversationError.TYPE.CONVERSATION_NOT_FOUND,
        ConversationError.MESSAGE.CONVERSATION_NOT_FOUND,
      );
    } catch (error) {
      amplify.publish(WebAppEvents.WARNING.MODAL, ModalsViewModel.TYPE.ACKNOWLEDGE, {
        text: {
          message: t('modalIntegrationUnavailableMessage'),
          title: t('modalIntegrationUnavailableHeadline'),
        },
      });
      throw error;
    }
  }

  /**
   * Get conversation with a service.
   * @param serviceEntity Service entity for whom to get the conversation
   * @returns Resolves with the conversation with requested service
   */
  async get1To1ConversationWithService(serviceEntity: ServiceEntity): Promise<Conversation> {
    const matchingConversationEntity = this.conversationState.conversations().find(conversationEntity => {
      if (!conversationEntity.is1to1()) {
        // Disregard conversations that are not 1:1
        return false;
      }

      const isActiveConversation = !conversationEntity.removed_from_conversation();
      if (!isActiveConversation) {
        // Disregard conversations that self is no longer part of
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

    return matchingConversationEntity || this.create1to1ConversationWithService(serviceEntity);
  }

  async getProviderById(providerId: string): Promise<ProviderEntity | undefined> {
    const providerData = await this.integrationService.getProvider(providerId);
    return providerData ? IntegrationMapper.mapProviderFromObject(providerData) : undefined;
  }

  async getServiceById(providerId: string, serviceId: string): Promise<ServiceEntity | undefined> {
    const serviceData = await this.integrationService.getService(providerId, serviceId);
    if (serviceData) {
      return IntegrationMapper.mapServiceFromObject(serviceData);
    }
    return undefined;
  }

  async getServices(tags: ServiceTag | ServiceTag[], start: string): Promise<ServiceEntity[]> {
    const tagsArray = Array.isArray(tags) ? tags.slice(0, 3) : [ServiceTag.INTEGRATION];

    const {services: servicesData} = await this.integrationService.getServices(tagsArray.join(','), start);
    return IntegrationMapper.mapServicesFromArray(servicesData);
  }

  async getServicesByProvider(providerId: string): Promise<ServiceEntity[]> {
    const servicesData = await this.integrationService.getProviderServices(providerId);
    return IntegrationMapper.mapServicesFromArray(servicesData);
  }

  /**
   * Remove service from conversation.
   *
   * @param conversationEntity Conversation to remove service from
   * @param userEntity Service user to be removed from the conversation
   */
  removeService(conversationEntity: Conversation, userEntity: User): Promise<MemberLeaveEvent> {
    const {id: userId} = userEntity;
    return this.conversationRepository.removeService(conversationEntity, userId);
  }

  async searchForServices(query: string, queryObservable: ko.Observable<string>): Promise<void> {
    const normalizedQuery = IntegrationRepository.normalizeQuery(query);

    try {
      let serviceEntities = await this.teamRepository.getWhitelistedServices(this.teamState.team().id);
      const isCurrentQuery = normalizedQuery === IntegrationRepository.normalizeQuery(queryObservable());
      if (isCurrentQuery) {
        serviceEntities = serviceEntities
          .filter(serviceEntity => compareTransliteration(serviceEntity.name, normalizedQuery))
          .sort((serviceA, serviceB) => {
            return sortByPriority(serviceA.name, serviceB.name, normalizedQuery);
          });
        this.services(serviceEntities);
      }
    } catch (error) {
      return this.logger.error(`Error searching for services: ${error.message}`, error);
    }
  }
}
