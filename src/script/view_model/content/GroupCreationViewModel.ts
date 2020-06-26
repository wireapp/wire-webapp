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

import {Confirmation} from '@wireapp/protocol-messaging';
import {WebAppEvents} from '@wireapp/webapp-events';
import ko from 'knockout';
import {amplify} from 'amplify';

import {t} from 'Util/LocalizerUtil';
import {onEscKey, offEscKey} from 'Util/KeyboardUtil';
import {sortUsersByPriority} from 'Util/StringUtil';

import * as trackingHelpers from '../../tracking/Helpers';
import {EventName} from '../../tracking/EventName';
import {ACCESS_STATE, TEAM} from '../../conversation/AccessState';
import {ConversationRepository} from '../../conversation/ConversationRepository';
import {TeamRepository} from '../../team/TeamRepository';
import {UserRepository} from '../../user/UserRepository';
import {Conversation} from '../../entity/Conversation';
import {User} from '../../entity/User';
import {SearchRepository} from '../../search/SearchRepository';

type GroupCreationSource = 'start_ui' | 'conversation_details' | 'create';

export class GroupCreationViewModel {
  isTeam: ko.PureComputed<boolean>;
  isShown: ko.Observable<boolean>;
  state: ko.Observable<string>;
  private isCreatingConversation: boolean;
  private groupCreationSource: GroupCreationSource;
  nameError: ko.Observable<string>;
  nameInput: ko.Observable<string>;
  selectedContacts: ko.ObservableArray<User>;
  showContacts: ko.Observable<boolean>;
  participantsInput: ko.Observable<string>;
  accessState: ko.Observable<TEAM>;
  isGuestRoom: ko.PureComputed<boolean>;
  enableReadReceipts: ko.Observable<boolean>;
  contacts: ko.PureComputed<User[]>;
  participantsActionText: ko.PureComputed<string>;
  participantsHeaderText: ko.PureComputed<string>;
  stateIsPreferences: ko.PureComputed<boolean>;
  stateIsParticipants: ko.PureComputed<boolean>;
  shouldUpdateScrollbar: ko.Computed<User[]>;
  ConversationRepository: typeof ConversationRepository;
  maxNameLength: number;
  maxSize: number;
  searchRepository: SearchRepository;

  static get STATE() {
    return {
      DEFAULT: 'GroupCreationViewModel.STATE.DEFAULT',
      PARTICIPANTS: 'GroupCreationViewModel.STATE.PARTICIPANTS',
      PREFERENCES: 'GroupCreationViewModel.STATE.PREFERENCES',
    };
  }

  constructor(
    private readonly conversationRepository: ConversationRepository,
    searchRepository: SearchRepository,
    private readonly teamRepository: TeamRepository,
    private readonly userRepository: UserRepository,
  ) {
    this.isTeam = this.teamRepository.isTeam;
    this.ConversationRepository = ConversationRepository;
    this.maxNameLength = ConversationRepository.CONFIG.GROUP.MAX_NAME_LENGTH;
    this.maxSize = ConversationRepository.CONFIG.GROUP.MAX_SIZE;
    this.searchRepository = searchRepository;

    this.isShown = ko.observable(false);
    this.state = ko.observable(GroupCreationViewModel.STATE.DEFAULT);

    this.isCreatingConversation = false;
    this.groupCreationSource = undefined;
    this.nameError = ko.observable('');
    this.nameInput = ko.observable('');
    this.selectedContacts = ko.observableArray([]);
    this.showContacts = ko.observable(false);
    this.participantsInput = ko.observable('');

    this.accessState = ko.observable(ACCESS_STATE.TEAM.GUEST_ROOM);
    this.isGuestRoom = ko.pureComputed(() => this.accessState() === ACCESS_STATE.TEAM.GUEST_ROOM);
    this.isGuestRoom.subscribe((isGuestRoom: boolean) => {
      if (!isGuestRoom) {
        this.selectedContacts.remove((userEntity: User) => !userEntity.isTeamMember());
      }
    });

    this.enableReadReceipts = ko.observable(false);

    this.contacts = ko.pureComputed(() => {
      if (this.showContacts()) {
        if (!this.isTeam()) {
          return this.userRepository.connected_users();
        }

        if (this.isGuestRoom()) {
          return this.teamRepository.teamUsers();
        }

        return this.teamRepository.teamMembers().sort(sortUsersByPriority);
      }
      return [];
    });
    this.participantsActionText = ko.pureComputed(() =>
      this.selectedContacts().length
        ? t('groupCreationParticipantsActionCreate')
        : t('groupCreationParticipantsActionSkip'),
    );
    this.participantsHeaderText = ko.pureComputed(() =>
      this.selectedContacts().length
        ? t('groupCreationParticipantsHeaderWithCounter', this.selectedContacts().length)
        : t('groupCreationParticipantsHeader'),
    );
    this.stateIsPreferences = ko.pureComputed(() => this.state() === GroupCreationViewModel.STATE.PREFERENCES);
    this.stateIsParticipants = ko.pureComputed(() => this.state() === GroupCreationViewModel.STATE.PARTICIPANTS);

    this.nameInput.subscribe(() => this.nameError(''));
    const onEscape = () => this.isShown(false);
    this.stateIsPreferences.subscribe((stateIsPreference: boolean): void => {
      if (stateIsPreference) {
        onEscKey(onEscape);
        return;
      }
      offEscKey(onEscape);
    });

    this.stateIsParticipants.subscribe((stateIsParticipants: boolean): void => {
      if (stateIsParticipants) {
        window.setTimeout(() => this.showContacts(true));
        return;
      }
      this.showContacts(false);
    });

    this.shouldUpdateScrollbar = ko
      .computed(() => this.selectedContacts() && this.stateIsPreferences() && this.contacts())
      .extend({notify: 'always', rateLimit: 500});

    amplify.subscribe(WebAppEvents.CONVERSATION.CREATE_GROUP, this.showCreateGroup);
  }

  showCreateGroup = (groupCreationSource: GroupCreationSource, userEntity: User) => {
    this.groupCreationSource = groupCreationSource;
    this.enableReadReceipts(this.isTeam());
    this.isShown(true);
    this.state(GroupCreationViewModel.STATE.PREFERENCES);
    if (userEntity) {
      this.selectedContacts.push(userEntity);
    }
    amplify.publish(WebAppEvents.ANALYTICS.EVENT, EventName.CONVERSATION.OPENED_GROUP_CREATION, {
      method: this.groupCreationSource,
    });
  };

  clickOnBack = (): void => {
    this.state(GroupCreationViewModel.STATE.PREFERENCES);
  };

  clickOnClose = (): void => {
    this.isShown(false);
  };

  clickOnToggleGuestMode = (): void => {
    const accessState = this.isGuestRoom() ? ACCESS_STATE.TEAM.TEAM_ONLY : ACCESS_STATE.TEAM.GUEST_ROOM;

    this.accessState(accessState);
  };

  clickOnCreate = async (): Promise<void> => {
    if (!this.isCreatingConversation) {
      this.isCreatingConversation = true;

      const accessState = this.isTeam() ? this.accessState() : undefined;
      const options = {
        receipt_mode: this.enableReadReceipts() ? Confirmation.Type.READ : Confirmation.Type.DELIVERED,
      };

      try {
        const conversationEntity = await this.conversationRepository.createGroupConversation(
          this.selectedContacts(),
          this.nameInput(),
          accessState,
          options,
        );
        this.isShown(false);

        amplify.publish(WebAppEvents.CONVERSATION.SHOW, conversationEntity);

        this._trackGroupCreation(conversationEntity);
      } catch (error) {
        this.isCreatingConversation = false;
        throw error;
      }
    }
  };

  clickOnNext = (): void => {
    if (!this.nameInput().length) {
      return;
    }

    const trimmedNameInput = this.nameInput().trim();
    const nameTooLong = trimmedNameInput.length > ConversationRepository.CONFIG.GROUP.MAX_NAME_LENGTH;
    const nameTooShort = !trimmedNameInput.length;

    this.nameInput(trimmedNameInput.slice(0, ConversationRepository.CONFIG.GROUP.MAX_NAME_LENGTH));
    if (nameTooLong) {
      return this.nameError(t('groupCreationPreferencesErrorNameLong'));
    }

    if (nameTooShort) {
      return this.nameError(t('groupCreationPreferencesErrorNameShort'));
    }

    amplify.publish(WebAppEvents.ANALYTICS.EVENT, EventName.CONVERSATION.OPENED_SELECT_PARTICIPANTS, {
      method: this.groupCreationSource,
    });

    this.state(GroupCreationViewModel.STATE.PARTICIPANTS);
  };

  afterHideModal = (): void => {
    this.isCreatingConversation = false;
    this.groupCreationSource = undefined;
    this.nameError('');
    this.nameInput('');
    this.participantsInput('');
    this.selectedContacts([]);
    this.state(GroupCreationViewModel.STATE.DEFAULT);
    this.accessState(ACCESS_STATE.TEAM.GUEST_ROOM);
  };

  _trackGroupCreation = (conversationEntity: Conversation): void => {
    if (!conversationEntity) {
      return;
    }
    this._trackGroupCreationSucceeded(conversationEntity);
    this._trackAddParticipants(conversationEntity);
  };

  _trackGroupCreationSucceeded = (conversationEntity: Conversation): void => {
    const attributes: {
      is_allow_guests?: boolean;
      method: GroupCreationSource;
      with_participants: boolean;
    } = {
      method: this.groupCreationSource,
      with_participants: !!this.selectedContacts().length,
    };

    const isTeamConversation = !!conversationEntity.team_id;
    if (isTeamConversation) {
      attributes.is_allow_guests = !conversationEntity.isTeamOnly();
    }

    const eventName = EventName.CONVERSATION.GROUP_CREATION_SUCCEEDED;
    amplify.publish(WebAppEvents.ANALYTICS.EVENT, eventName, attributes);
  };

  _trackAddParticipants = (conversationEntity: Conversation): void => {
    let attributes: {
      guest_num?: number;
      is_allow_guests?: boolean;
      method: GroupCreationSource;
      temporary_guest_num?: number;
      user_num: number;
    } = {
      method: 'create',
      user_num: conversationEntity.getNumberOfParticipants(),
    };

    const isTeamConversation = !!conversationEntity.team_id;
    if (isTeamConversation) {
      const participants = trackingHelpers.getParticipantTypes(conversationEntity.participating_user_ets(), true);

      attributes = {
        ...attributes,
        guest_num: participants.guests,
        is_allow_guests: conversationEntity.isGuestRoom(),
        temporary_guest_num: participants.temporaryGuests,
        user_num: participants.users,
      };
    }

    amplify.publish(WebAppEvents.ANALYTICS.EVENT, EventName.CONVERSATION.ADD_PARTICIPANTS, attributes);
  };
}
