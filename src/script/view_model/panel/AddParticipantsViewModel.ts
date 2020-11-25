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

import {Logger, getLogger} from 'Util/Logger';
import {t} from 'Util/LocalizerUtil';
import {safeWindowOpen} from 'Util/SanitizationUtil';
import {sortUsersByPriority} from 'Util/StringUtil';

import {BasePanelViewModel, PanelViewModelProps} from './BasePanelViewModel';
import {getManageServicesUrl} from '../../externalRoute';
import {MotionDuration} from '../../motion/MotionDuration';

import type {ConversationRepository} from 'src/script/conversation/ConversationRepository';
import type {IntegrationRepository} from 'src/script/integration/IntegrationRepository';
import type {SearchRepository} from 'src/script/search/SearchRepository';
import type {ServiceEntity} from 'src/script/integration/ServiceEntity';
import type {User} from 'src/script/entity/User';
import {PanelViewModel} from '../PanelViewModel';
import {UserState} from '../../user/UserState';
import {container} from 'tsyringe';
import {TeamState} from '../../team/TeamState';
import {TeamRepository} from 'src/script/team/TeamRepository';

export class AddParticipantsViewModel extends BasePanelViewModel {
  private readonly userState: UserState;
  private readonly teamState: TeamState;

  teamRepository: TeamRepository;
  conversationRepository: ConversationRepository;
  integrationRepository: IntegrationRepository;
  searchRepository: SearchRepository;

  MotionDuration: typeof MotionDuration;
  logger: Logger;
  isTeam: ko.PureComputed<boolean>;
  selfUser: ko.Observable<User>;
  services: ko.ObservableArray<ServiceEntity>;
  teamUsers: ko.PureComputed<User[]>;
  teamMembers: ko.PureComputed<User[]>;
  isInitialServiceSearch: ko.Observable<boolean>;
  searchInput: ko.Observable<string>;
  selectedContacts: ko.ObservableArray<User>;
  selectedService: ko.Observable<ServiceEntity>;
  state: ko.Observable<string>;
  isTeamOnly: ko.PureComputed<boolean>;
  showIntegrations: ko.PureComputed<boolean>;
  enableAddAction: ko.PureComputed<boolean>;
  isStateAddPeople: ko.PureComputed<boolean>;
  isStateAddService: ko.PureComputed<boolean>;
  contacts: ko.PureComputed<User[]>;
  isSearching: ko.PureComputed<boolean>;
  headerText: ko.PureComputed<string>;
  manageServicesUrl: string;
  static get STATE() {
    return {
      ADD_PEOPLE: 'AddParticipantsViewModel.STATE.ADD_PEOPLE',
      ADD_SERVICE: 'AddParticipantsViewModel.STATE.ADD_SERVICE',
    };
  }

  constructor(params: PanelViewModelProps) {
    super(params);

    this.userState = container.resolve(UserState);
    this.teamState = container.resolve(TeamState);

    const {conversation, integration, search, team} = params.repositories;
    this.teamRepository = team;
    this.conversationRepository = conversation;
    this.integrationRepository = integration;
    this.searchRepository = search;
    this.MotionDuration = MotionDuration;

    this.logger = getLogger('AddParticipantsViewModel');

    this.isTeam = this.teamState.isTeam;
    this.selfUser = this.userState.self;
    this.services = this.integrationRepository.services;
    this.teamUsers = this.teamState.teamUsers;
    this.teamMembers = this.teamState.teamMembers;

    this.isInitialServiceSearch = ko.observable(true);
    this.searchInput = ko.observable('');
    this.selectedContacts = ko.observableArray([]);
    this.selectedService = ko.observable();
    this.state = ko.observable(AddParticipantsViewModel.STATE.ADD_PEOPLE);

    this.isTeamOnly = ko.pureComputed(() => this.activeConversation() && this.activeConversation().isTeamOnly());

    this.showIntegrations = ko.pureComputed(() => {
      if (this.activeConversation()) {
        const firstUserEntity = this.activeConversation().firstUserEntity();
        const hasBotUser = firstUserEntity && firstUserEntity.isService;
        const allowIntegrations = this.activeConversation().isGroup() || hasBotUser;
        return this.isTeam() && allowIntegrations && this.activeConversation().inTeam() && !this.isTeamOnly();
      }
      return undefined;
    });
    this.enableAddAction = ko.pureComputed(() => this.selectedContacts().length > 0);

    this.isStateAddPeople = ko.pureComputed(() => this.state() === AddParticipantsViewModel.STATE.ADD_PEOPLE);
    this.isStateAddService = ko.pureComputed(() => this.state() === AddParticipantsViewModel.STATE.ADD_SERVICE);

    this.contacts = ko.pureComputed(() => {
      const activeConversation = this.activeConversation();
      let userEntities: User[] = [];

      if (!activeConversation) {
        return userEntities;
      }

      if (this.isTeam()) {
        userEntities = this.isTeamOnly() ? this.teamMembers().sort(sortUsersByPriority) : this.teamUsers();
      } else {
        userEntities = this.userState.connectedUsers();
      }

      return userEntities.filter(userEntity => {
        return !activeConversation.participating_user_ids().find(id => userEntity.id === id);
      });
    });

    this.isSearching = ko.pureComputed(() => this.searchInput().length > 0);
    this.headerText = ko.pureComputed(() =>
      this.selectedContacts().length
        ? t('addParticipantsHeaderWithCounter', this.selectedContacts().length)
        : t('addParticipantsHeader'),
    );

    this.searchInput.subscribe(this.searchServices);
    this.clickOnSelectService = this.clickOnSelectService.bind(this);

    this.manageServicesUrl = getManageServicesUrl('client_landing');
  }

  getElementId(): string {
    return 'add-participants';
  }

  clickOnAddPeople(): void {
    this.state(AddParticipantsViewModel.STATE.ADD_PEOPLE);
  }

  clickOnAddService(): void {
    this.state(AddParticipantsViewModel.STATE.ADD_SERVICE);
    this.searchServices();
  }

  clickOnSelectService(serviceEntity: ServiceEntity): void {
    this.selectedService(serviceEntity);
    this.navigateTo(PanelViewModel.STATE.GROUP_PARTICIPANT_SERVICE, {
      addMode: true,
      entity: serviceEntity,
    });
  }

  clickToAddParticipants(): void {
    this.addMembers();
    this.onGoBack();
  }

  clickOpenManageServices(): void {
    if (this.manageServicesUrl) {
      safeWindowOpen(this.manageServicesUrl);
    }
  }

  initView(): void {
    this.state(AddParticipantsViewModel.STATE.ADD_PEOPLE);
    this.selectedContacts.removeAll();
    this.selectedService(undefined);
    this.searchInput('');
    this.isInitialServiceSearch(true);
  }

  searchServices = async (): Promise<void> => {
    if (this.isStateAddService()) {
      await this.integrationRepository.searchForServices(this.searchInput(), this.searchInput);
      this.isInitialServiceSearch(false);
    }
  };

  private async addMembers(): Promise<void> {
    const activeConversation = this.activeConversation();
    const userEntities = this.selectedContacts().slice();

    await this.conversationRepository.addMembers(activeConversation, userEntities);
  }
}
