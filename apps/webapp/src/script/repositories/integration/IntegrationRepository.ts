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

import type {ConversationMemberJoinEvent} from '@wireapp/api-client/lib/event/';
import ko from 'knockout';
import type {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import {ConversationState} from 'Repositories/conversation/ConversationState';
import {MemberLeaveEvent} from 'Repositories/conversation/EventBuilder';
import type {Conversation} from 'Repositories/entity/Conversation';
import type {User} from 'Repositories/entity/User';
import type {TeamRepository} from 'Repositories/team/TeamRepository';
import {TeamState} from 'Repositories/team/TeamState';
import {container} from 'tsyringe';
import {getLogger, Logger} from 'Util/Logger';
import {compareTransliteration, sortByPriority} from 'Util/StringUtil';

import {IntegrationMapper} from './IntegrationMapper';
import type {IntegrationService} from './IntegrationService';
import {ProviderEntity} from './ProviderEntity';
import {ServiceEntity} from './ServiceEntity';

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
    this.services = ko.observableArray<ServiceEntity>([]);
  }

  /**
   * Get provider name for entity.
   * @param entity Service or user to add provider name to
   */
  async addProviderNameToParticipant(entity: ServiceEntity | User): Promise<ServiceEntity | User | ProviderEntity> {
    if (entity.providerId) {
      const providerEntity = await this.getProviderById(entity.providerId);

      if (providerEntity) {
        entity.providerName(providerEntity.name);
      }
    }

    return entity;
  }

  /**
   * Get ServiceEntity for entity.
   * @param entity Service or user to resolve to ServiceEntity
   */
  async getServiceFromUser(entity: ServiceEntity | User): Promise<ServiceEntity | undefined> {
    if (entity instanceof ServiceEntity) {
      return entity;
    }

    const {providerId, serviceId} = entity;

    if (!providerId || !serviceId) {
      return undefined;
    }

    return this.getServiceById(providerId, serviceId, entity.qualifiedId.domain);
  }

  /**
   * Add a service to an existing conversation.
   *
   * @param conversationEntity Conversation to add service to
   * @param serviceEntity Service to be added to conversation
   * @param method Method used to add service
   */
  addServiceToExistingConversation(
    conversationEntity: Conversation,
    serviceEntity: ServiceEntity,
  ): Promise<ConversationMemberJoinEvent | void> {
    const {id: serviceId, name, providerId} = serviceEntity;
    this.logger.info(`Adding service '${name}' to conversation '${conversationEntity.id}'`);

    return this.conversationRepository.addServiceToExistingConversation(conversationEntity, {providerId, serviceId});
  }

  /**
   * Add service to conversation.
   *
   * @param serviceEntity Information about service to be added
   * @returns Resolves when conversation with the integration was created
   */
  async create1to1ConversationWithService(serviceEntity: ServiceEntity): Promise<Conversation> {
    const {id: serviceId, name, providerId} = serviceEntity;
    this.logger.info(`Creating a conversation with a service '${name}'.'`);
    return this.conversationRepository.create1to1ConversationWithService({providerId, serviceId});
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

      const isActiveConversation = !conversationEntity.isSelfUserRemoved();
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

  async getServiceById(providerId: string, serviceId: string, domain: string): Promise<ServiceEntity | undefined> {
    const serviceData = await this.integrationService.getService(providerId, serviceId);
    if (serviceData) {
      return IntegrationMapper.mapServiceFromObject(serviceData, domain);
    }
    return undefined;
  }

  /**
   * Remove service from conversation.
   *
   * @param conversationEntity Conversation to remove service from
   * @param userEntity Service user to be removed from the conversation
   */
  removeService(conversationEntity: Conversation, userEntity: User): Promise<MemberLeaveEvent> {
    const {id: userId, domain} = userEntity;
    return this.conversationRepository.removeService(conversationEntity, {
      domain,
      id: userId,
    });
  }

  async searchForServices(
    query: string,
    queryObservable?: ko.Observable<string>,
  ): Promise<ServiceEntity[] | undefined> {
    const normalizedQuery = IntegrationRepository.normalizeQuery(query);

    const teamId = this.teamState.team().id;
    if (!teamId) {
      return undefined;
    }
    try {
      let serviceEntities = await this.teamRepository.getWhitelistedServices(teamId, this.teamState.teamDomain() ?? '');
      const isCurrentQuery =
        !queryObservable || normalizedQuery === IntegrationRepository.normalizeQuery(queryObservable());
      if (isCurrentQuery) {
        serviceEntities = serviceEntities
          .filter(serviceEntity => compareTransliteration(serviceEntity.name(), normalizedQuery))
          .sort((serviceA, serviceB) => sortByPriority(serviceA.name(), serviceB.name(), normalizedQuery));
        this.services(serviceEntities);
        return serviceEntities;
      }
    } catch (error) {
      this.logger.error(`Error searching for services: ${error.message}`, error);
    }
    return undefined;
  }
}
