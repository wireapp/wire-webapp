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

import {getLogger, Logger} from 'Util/Logger';
import {t} from 'Util/LocalizerUtil';
import {safeWindowOpen} from 'Util/SanitizationUtil';
import {sortUsersByPriority} from 'Util/StringUtil';

import {BasePanelViewModel, PanelViewModelProps} from './BasePanelViewModel';
import {getManageServicesUrl} from '../../externalRoute';
import * as trackingHelpers from '../../tracking/Helpers';
import {EventName} from '../../tracking/EventName';
import {WebAppEvents} from '../../event/WebApp';
import {MotionDuration} from '../../motion/MotionDuration';
import {ConversationRepository} from 'src/script/conversation/ConversationRepository';
import {IntegrationRepository} from 'src/script/integration/IntegrationRepository';
import {SearchRepository} from 'src/script/search/SearchRepository';
import {TeamRepository} from 'src/script/team/TeamRepository';
import {UserRepository} from 'src/script/user/UserRepository';
import {ServiceEntity} from 'src/script/integration/ServiceEntity';
import {User} from 'src/script/entity/User';

export class AddParticipantsViewModel extends BasePanelViewModel {
  conversationRepository: ConversationRepository;
  integrationRepository: IntegrationRepository;
  searchRepository: SearchRepository;
  teamRepository: TeamRepository;
  userRepository: UserRepository;
  MotionDuration: typeof MotionDuration;
  logger: Logger;
  isTeam: ko.PureComputed<boolean>;
  selfUser: ko.Observable<User>;
  services: ko.ObservableArray<ServiceEntity>;
  teamUsers: ko.PureComputed<User[]>;
  teamMembers: ko.PureComputed<User[]>;
  isInitialServiceSearch: ko.Observable<boolean>;
  searchInput: ko.Observable<string>;
  selectedContacts: ko.ObservableArray<any>;
  selectedService: ko.Observable<any>;
  state: ko.Observable<string>;
  isTeamOnly: ko.PureComputed<boolean>;
  showIntegrations: ko.PureComputed<boolean>;
  enableAddAction: ko.PureComputed<boolean>;
  isStateAddPeople: ko.PureComputed<boolean>;
  isStateAddService: ko.PureComputed<boolean>;
  contacts: ko.PureComputed<any>;
  isSearching: ko.PureComputed<any>;
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

    const {conversation, integration, search, team, user} = params.repositories;
    this.conversationRepository = conversation;
    this.integrationRepository = integration;
    this.searchRepository = search;
    this.teamRepository = team;
    this.userRepository = user;
    this.MotionDuration = MotionDuration;

    this.logger = getLogger('z.viewModel.panel.AddParticipantsViewModel');

    this.isTeam = this.teamRepository.isTeam;
    this.selfUser = this.userRepository.self;
    this.services = this.integrationRepository.services;
    this.teamUsers = this.teamRepository.teamUsers;
    this.teamMembers = this.teamRepository.teamMembers;

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
        userEntities = this.userRepository.connected_users();
      }

      return userEntities.filter(userEntity => {
        return !activeConversation.participating_user_ids().find(id => userEntity.id === id);
      });
    });

    this.isSearching = ko.pureComputed(() => this.searchInput().length);
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
    this.navigateTo(z.viewModel.PanelViewModel.STATE.GROUP_PARTICIPANT_SERVICE, {
      addMode: true,
      entity: serviceEntity,
    });
  }

  clickToAddParticipants(): void {
    this._addMembers();
    this.onGoBack();
  }

  clickOpenManageServices(): void {
    if (this.manageServicesUrl) {
      safeWindowOpen(this.manageServicesUrl);
      amplify.publish(WebAppEvents.ANALYTICS.EVENT, EventName.SETTINGS.OPENED_MANAGE_TEAM);
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

  async _addMembers(): Promise<void> {
    const activeConversation = this.activeConversation();
    const userEntities = this.selectedContacts().slice();

    await this.conversationRepository.addMembers(activeConversation, userEntities);
    let attributes = {
      guest_num: undefined as number,
      is_allow_guests: undefined as boolean,
      method: 'add',
      temporary_guest_num: undefined as number,
      user_num: userEntities.length,
    };

    const isTeamConversation = !!this.activeConversation().team_id;
    if (isTeamConversation) {
      const participants = trackingHelpers.getParticipantTypes(userEntities, false);

      attributes = {
        ...attributes,
        guest_num: participants.guests,
        is_allow_guests: activeConversation.isGuestRoom(),
        temporary_guest_num: participants.temporaryGuests,
        user_num: participants.users,
      };
    }

    amplify.publish(WebAppEvents.ANALYTICS.EVENT, EventName.CONVERSATION.ADD_PARTICIPANTS, attributes);
  }
}
