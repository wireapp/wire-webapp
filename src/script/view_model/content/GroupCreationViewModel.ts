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

import {ACCESS_STATE, TEAM} from '../../conversation/AccessState';
import {ConversationRepository} from '../../conversation/ConversationRepository';
import {User} from '../../entity/User';
import {SearchRepository} from '../../search/SearchRepository';
import {container} from 'tsyringe';
import {UserState} from '../../user/UserState';
import {TeamState} from '../../team/TeamState';
import {TeamRepository} from 'src/script/team/TeamRepository';

type GroupCreationSource = 'start_ui' | 'conversation_details' | 'create';

export class GroupCreationViewModel {
  isTeam: ko.PureComputed<boolean>;
  isShown: ko.Observable<boolean>;
  state: ko.Observable<string>;
  private isCreatingConversation: boolean;
  groupCreationSource: GroupCreationSource;
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
  maxNameLength: number;
  maxSize: number;

  static get STATE() {
    return {
      DEFAULT: 'GroupCreationViewModel.STATE.DEFAULT',
      PARTICIPANTS: 'GroupCreationViewModel.STATE.PARTICIPANTS',
      PREFERENCES: 'GroupCreationViewModel.STATE.PREFERENCES',
    };
  }

  constructor(
    public readonly conversationRepository: ConversationRepository,
    public readonly searchRepository: SearchRepository,
    public readonly teamRepository: TeamRepository,
    private readonly userState = container.resolve(UserState),
    private readonly teamState = container.resolve(TeamState),
  ) {
    this.isTeam = this.teamState.isTeam;
    this.maxNameLength = ConversationRepository.CONFIG.GROUP.MAX_NAME_LENGTH;
    this.maxSize = ConversationRepository.CONFIG.GROUP.MAX_SIZE;

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
          return this.userState.connectedUsers();
        }

        if (this.isGuestRoom()) {
          return this.teamState.teamUsers();
        }

        return this.teamState.teamMembers().sort(sortUsersByPriority);
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
    const nameTooLong = trimmedNameInput.length > this.maxNameLength;
    const nameTooShort = !trimmedNameInput.length;

    this.nameInput(trimmedNameInput.slice(0, this.maxNameLength));
    if (nameTooLong) {
      return this.nameError(t('groupCreationPreferencesErrorNameLong'));
    }

    if (nameTooShort) {
      return this.nameError(t('groupCreationPreferencesErrorNameShort'));
    }

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
}
