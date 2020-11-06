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

import {debounce} from 'underscore';
import ko from 'knockout';
import {amplify} from 'amplify';

import {getLogger, Logger} from 'Util/Logger';
import {safeWindowOpen} from 'Util/SanitizationUtil';
import {partition} from 'Util/ArrayUtil';

import {UserlistMode} from 'Components/userList';

import {getManageTeamUrl, getManageServicesUrl} from '../../externalRoute';
import {Config} from '../../Config';
import {User} from '../../entity/User';
import {generatePermissionHelpers} from '../../user/UserPermission';
import {validateHandle} from '../../user/UserHandleGenerator';
import {WebAppEvents} from '@wireapp/webapp-events';
import {SearchRepository} from '../../search/SearchRepository';
import {sortByPriority} from 'Util/StringUtil';
import {ListViewModel} from '../ListViewModel';
import type {MainViewModel} from '../MainViewModel';
import type {ConversationRepository} from '../../conversation/ConversationRepository';
import type {IntegrationRepository} from '../../integration/IntegrationRepository';
import type {TeamRepository} from '../../team/TeamRepository';
import type {UserRepository} from '../../user/UserRepository';
import type {ActionsViewModel} from '../ActionsViewModel';
import type {ServiceEntity} from '../../integration/ServiceEntity';
import type {Conversation} from '../../entity/Conversation';
import {container} from 'tsyringe';
import {UserState} from '../../user/UserState';
import {TeamState} from '../../team/TeamState';
import {ConversationState} from '../../conversation/ConversationState';

export class StartUIViewModel {
  readonly brandName: string;
  readonly UserlistMode: typeof UserlistMode;
  readonly teamName: ko.PureComputed<string>;
  readonly isVisible: ko.PureComputed<boolean>;
  readonly showCreateGuestRoom: ko.PureComputed<boolean>;
  readonly showInvitePeople: ko.PureComputed<boolean>;
  readonly showNoContacts: ko.PureComputed<boolean>;
  readonly showNoMatches: ko.PureComputed<boolean>;
  readonly showNoSearchResults: ko.PureComputed<boolean>;
  readonly showTopPeople: ko.PureComputed<boolean>;
  readonly shouldUpdateScrollbar: ko.Computed<number>;
  readonly showSearchResults: ko.PureComputed<boolean>;
  readonly showContacts: ko.PureComputed<boolean>;
  readonly searchInput: ko.Observable<string>;
  readonly isTeam: ko.PureComputed<boolean>;
  readonly peopleTabActive: ko.PureComputed<boolean>;
  readonly isSearching: ko.PureComputed<boolean>;
  readonly showOnlyConnectedUsers: ko.PureComputed<boolean>;
  readonly contacts: ko.PureComputed<User[]>;
  readonly services: ko.ObservableArray<ServiceEntity>;
  readonly topUsers: ko.ObservableArray<User>;
  readonly searchResults: {
    contacts: ko.ObservableArray<User>;
    groups: ko.ObservableArray<Conversation>;
    others: ko.ObservableArray<User>;
  };
  readonly showInviteMember: ko.PureComputed<boolean>;
  readonly showSpinner: ko.Observable<boolean>;
  readonly isInitialServiceSearch: ko.Observable<boolean>;
  readonly manageTeamUrl: string;
  readonly manageServicesUrl: string;
  private submittedSearch: boolean;
  private readonly matchedUsers: ko.ObservableArray<User>;
  private readonly alreadyClickedOnContact: Record<string, boolean>;
  private readonly logger: Logger;
  private readonly actionsViewModel: ActionsViewModel;
  private readonly selfUser: ko.Observable<User>;
  private readonly teamSize: ko.PureComputed<number>;
  private readonly state: ko.Observable<string>;
  private readonly search: ko.SubscriptionCallback<string, void>;
  private readonly showMatches: ko.Observable<boolean>;
  private readonly hasSearchResults: ko.PureComputed<boolean>;
  private readonly showContent: ko.PureComputed<boolean>;

  static get STATE() {
    return {
      ADD_PEOPLE: 'StartUIViewModel.STATE.ADD_PEOPLE',
      ADD_SERVICE: 'StartUIViewModel.STATE.ADD_SERVICE',
    };
  }

  constructor(
    private readonly mainViewModel: MainViewModel,
    private readonly listViewModel: ListViewModel,
    readonly conversationRepository: ConversationRepository,
    private readonly integrationRepository: IntegrationRepository,
    readonly searchRepository: SearchRepository,
    readonly teamRepository: TeamRepository,
    private readonly userRepository: UserRepository,
    private readonly userState = container.resolve(UserState),
    private readonly teamState = container.resolve(TeamState),
    private readonly conversationState = container.resolve(ConversationState),
  ) {
    this.logger = getLogger('StartUIViewModel');
    this.alreadyClickedOnContact = {};
    this.brandName = Config.getConfig().BRAND_NAME;
    this.UserlistMode = UserlistMode;

    this.actionsViewModel = this.mainViewModel.actions;

    this.selfUser = this.userState.self;

    this.isTeam = this.teamState.isTeam;
    this.teamName = this.teamState.teamName;
    this.teamSize = this.teamState.teamSize;

    this.state = ko.observable(StartUIViewModel.STATE.ADD_PEOPLE);
    this.isVisible = ko.pureComputed(() => listViewModel.state() === ListViewModel.STATE.START_UI);

    this.peopleTabActive = ko.pureComputed(() => this.state() === StartUIViewModel.STATE.ADD_PEOPLE);

    this.submittedSearch = false;

    this.search = debounce((query: string): Promise<void> | void => {
      this.clearSearchResults();
      if (this.peopleTabActive()) {
        return this.searchPeople(query);
      }

      this.integrationRepository.searchForServices(query, this.searchInput);
    }, 300);

    this.searchInput = ko.observable('');
    this.searchInput.subscribe(this.search);
    this.isSearching = ko.pureComputed(() => this.searchInput().length !== 0);
    this.showMatches = ko.observable(false);
    const {canInviteTeamMembers, canSearchUnconnectedUsers} = generatePermissionHelpers();
    this.showOnlyConnectedUsers = ko.pureComputed(() => !canSearchUnconnectedUsers(this.selfUser().teamRole()));

    // User lists
    this.contacts = ko.pureComputed(() => {
      if (this.showMatches()) {
        return this.matchedUsers();
      }

      if (this.showOnlyConnectedUsers()) {
        return this.conversationState.connectedUsers();
      }

      if (this.isTeam()) {
        const connectedUsers = this.conversationState.connectedUsers();
        const teamUsersWithoutPartners = this.teamState
          .teamUsers()
          .filter(user => connectedUsers.includes(user) || this.teamRepository.isSelfConnectedTo(user.id));

        return teamUsersWithoutPartners;
      }

      return this.userState.connectedUsers();
    });

    this.matchedUsers = ko.observableArray([]);
    this.services = this.integrationRepository.services;
    this.topUsers = ko.observableArray([]);

    this.searchResults = {
      contacts: ko.observableArray([]),
      groups: ko.observableArray([]),
      others: ko.observableArray([]),
    };

    // View states
    this.hasSearchResults = ko.pureComputed(() => {
      const {contacts, groups, others} = this.searchResults;
      return !!(contacts().length || groups().length || others().length);
    });

    this.showContent = ko.pureComputed(() => this.showContacts() || this.showMatches() || this.showSearchResults());
    this.showCreateGuestRoom = ko.pureComputed(() => this.isTeam());
    this.showInvitePeople = ko.pureComputed(() => !this.isTeam());

    this.showNoContacts = ko.pureComputed(() => !this.isTeam() && !this.showContent());
    this.showInviteMember = ko.pureComputed(
      () => canInviteTeamMembers(this.selfUser().teamRole()) && this.teamSize() === 1,
    );

    this.showContacts = ko.pureComputed(() => !!this.contacts().length);

    this.showNoMatches = ko.pureComputed(() => {
      const isTeamOrMatch = this.isTeam() || this.showMatches();
      return isTeamOrMatch && !this.showInviteMember() && !this.showContacts() && !this.showSearchResults();
    });
    this.showNoSearchResults = ko.pureComputed(() => {
      return !this.showMatches() && this.showSearchResults() && !this.hasSearchResults() && this.isSearching();
    });

    this.showSearchResults = ko.pureComputed(() => {
      const shouldShowResults = this.hasSearchResults() || this.isSearching();
      if (!shouldShowResults) {
        this.clearSearchResults();
      }
      return shouldShowResults;
    });
    this.showSpinner = ko.observable(false);
    this.showTopPeople = ko.pureComputed(() => !this.isTeam() && this.topUsers().length && !this.showMatches());

    this.isInitialServiceSearch = ko.observable(true);

    this.manageTeamUrl = getManageTeamUrl('client_landing');
    this.manageServicesUrl = getManageServicesUrl('client_landing');

    this.shouldUpdateScrollbar = ko
      .computed(() => this.listViewModel.lastUpdate())
      .extend({notify: 'always', rateLimit: 500});
  }

  clickOnClose = (): void => {
    this.closeList();
  };

  clickOnContact = async (userEntity: User): Promise<void> => {
    if (this.alreadyClickedOnContact[userEntity.id] === true) {
      return;
    }
    this.alreadyClickedOnContact[userEntity.id] = true;
    await this.actionsViewModel.open1to1Conversation(userEntity);
    this.closeList();
    delete this.alreadyClickedOnContact[userEntity.id];
  };

  clickOnConversation = (conversationEntity: Conversation): Promise<void> => {
    return this.actionsViewModel.openGroupConversation(conversationEntity).then(() => this.closeList());
  };

  clickOnCreateGroup = (): void => {
    amplify.publish(WebAppEvents.CONVERSATION.CREATE_GROUP, 'start_ui');
  };

  clickOnCreateGuestRoom = (): void => {
    this.conversationRepository.createGuestRoom().then(conversationEntity => {
      amplify.publish(WebAppEvents.CONVERSATION.SHOW, conversationEntity);
    });
  };

  clickOpenManageTeam = (): void => {
    if (!this.manageTeamUrl) {
      return;
    }
    safeWindowOpen(this.manageTeamUrl);
  };

  clickOpenManageServices = () => {
    if (this.manageServicesUrl) {
      safeWindowOpen(this.manageServicesUrl);
    }
  };

  clickOnOther = (participantEntity: User | ServiceEntity): Promise<void> | void => {
    const isUser = participantEntity instanceof User;
    if (isUser && (participantEntity as User).isOutgoingRequest()) {
      return this.clickOnContact(participantEntity as User);
    }
    if (isUser) {
      return this.mainViewModel.content.userModal.showUser(participantEntity.id);
    }
    return this.mainViewModel.content.serviceModal.showService(participantEntity as ServiceEntity);
  };

  clickOnShowPeople = (): void => {
    this.updateList(StartUIViewModel.STATE.ADD_PEOPLE);
  };

  clickOnShowServices = (): void => {
    this.updateList(StartUIViewModel.STATE.ADD_SERVICE);
  };

  handleSearchInput = (): void => {
    if (!this.submittedSearch && this.isSearching()) {
      const [matchingContact] = this.searchResults.contacts();
      if (matchingContact) {
        this.submittedSearch = true;
        this.clickOnContact(matchingContact).then(() => (this.submittedSearch = false));
        return;
      }

      const [matchingGroup] = this.searchResults.groups();
      if (matchingGroup) {
        this.clickOnConversation(matchingGroup);
      }
    }
  };

  public readonly resetView = (): void => {
    this.showMatches(false);
    this.showSpinner(false);

    this.state(StartUIViewModel.STATE.ADD_PEOPLE);
    this.searchInput('');
  };

  public readonly updateList = (state = StartUIViewModel.STATE.ADD_PEOPLE): void => {
    this.showSpinner(false);

    // Clean up
    this.clearSearchResults();
    $('user-input input').focus();

    this.state(state);
    const isAddingPeople = state === StartUIViewModel.STATE.ADD_PEOPLE;
    if (isAddingPeople) {
      return this.updatePeopleList();
    }
    this.updateServicesList();
  };

  private readonly closeList = (): void => {
    $('user-input input').blur();

    amplify.publish(WebAppEvents.SEARCH.HIDE);
    this.listViewModel.switchList(ListViewModel.STATE.CONVERSATIONS);

    this.resetView();
  };

  private readonly updatePeopleList = (): void => {
    if (!this.isTeam()) {
      this.getTopPeople().then(userEntities => this.topUsers(userEntities));
    }
    this.searchPeople(this.searchInput());
  };

  private readonly updateServicesList = (): void => {
    this.isInitialServiceSearch(true);
    this.integrationRepository
      .searchForServices(this.searchInput(), this.searchInput)
      .then(() => this.isInitialServiceSearch(false));
  };

  //##############################################################################
  // Data sources
  //##############################################################################

  private readonly getTopPeople = () => {
    return this.conversationRepository
      .get_most_active_conversations()
      .then(conversationEntities => {
        return conversationEntities
          .filter((conversationEntity: Conversation) => conversationEntity.is1to1())
          .slice(0, 6)
          .map((conversationEntity: Conversation) => conversationEntity.participating_user_ids()[0]);
      })
      .then(userIds => this.userRepository.getUsersById(userIds))
      .then(userEntities => userEntities.filter(userEntity => !userEntity.isBlocked()));
  };

  clickToShowInviteModal = () => this.mainViewModel.content.inviteModal.show();

  //##############################################################################
  // Search
  //##############################################################################

  clearSearchResults = (): void => {
    this.searchResults.groups.removeAll();
    this.searchResults.contacts.removeAll();
    this.searchResults.others.removeAll();
    this.services.removeAll();
  };

  private readonly searchPeople = async (query: string): Promise<void> => {
    const normalizedQuery = SearchRepository.normalizeQuery(query);
    if (!normalizedQuery) {
      return;
    }
    this.showMatches(false);

    // Contacts, groups and others
    const trimmedQuery = query.trim();
    const isHandle = trimmedQuery.startsWith('@') && validateHandle(normalizedQuery);

    const allLocalUsers = this.isTeam() ? this.teamState.teamUsers() : this.userState.connectedUsers();

    const localSearchSources = this.showOnlyConnectedUsers() ? this.conversationState.connectedUsers() : allLocalUsers;

    const SEARCHABLE_FIELDS = SearchRepository.CONFIG.SEARCHABLE_FIELDS;
    const searchFields = isHandle ? [SEARCHABLE_FIELDS.USERNAME] : undefined;

    const contactResults = this.searchRepository.searchUserInSet(normalizedQuery, localSearchSources, searchFields);
    const connectedUsers = this.conversationState.connectedUsers();
    const filteredResults = contactResults.filter(
      user =>
        connectedUsers.includes(user) ||
        this.teamRepository.isSelfConnectedTo(user.id) ||
        user.username() === normalizedQuery,
    );

    this.searchResults.contacts(filteredResults);

    this.searchResults.groups(this.conversationRepository.getGroupsByName(normalizedQuery, isHandle));

    if (!this.showOnlyConnectedUsers()) {
      await this.searchRemote(normalizedQuery, isHandle);
    }
  };

  private readonly searchRemote = async (normalizedQuery: string, isHandle: boolean): Promise<void> => {
    try {
      const userEntities = await this.searchRepository.search_by_name(normalizedQuery, isHandle);

      const isCurrentQuery = normalizedQuery === SearchRepository.normalizeQuery(this.searchInput());
      if (isCurrentQuery) {
        if (this.selfUser().inTeam()) {
          const selfTeamId = this.selfUser().teamId;
          const [contacts, others] = partition(userEntities, user => user.teamId === selfTeamId);
          const knownContactIds = this.searchResults.contacts().map(({id}) => id);
          const newContacts = contacts.filter(({id}) => !knownContactIds.includes(id));
          const nonExternalContacts = await this.teamRepository.filterExternals(newContacts);
          if (nonExternalContacts.length) {
            const sortedContacts = [...this.searchResults.contacts(), ...nonExternalContacts].sort((userA, userB) =>
              sortByPriority(userA.name(), userB.name(), normalizedQuery),
            );
            this.searchResults.contacts(sortedContacts);
          }
          this.searchResults.others(others);
        } else {
          this.searchResults.others(userEntities);
        }
      }
    } catch (error) {
      this.logger.error(`Error searching for contacts: ${error.message}`, error);
    }
  };
}
