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

import {
  CONVERSATION_ACCESS_ROLE,
  CONVERSATION_ACCESS,
  CONVERSATION_LEGACY_ACCESS_ROLE,
  CONVERSATION_TYPE,
} from '@wireapp/api-client/lib/conversation/';
import {RECEIPT_MODE} from '@wireapp/api-client/lib/conversation/data';
import {ConversationProtocol} from '@wireapp/api-client/lib/conversation/NewConversation';
import {QualifiedId} from '@wireapp/api-client/lib/user';
import {amplify} from 'amplify';
import ko from 'knockout';
import {container} from 'tsyringe';
import {Cancelable, debounce} from 'underscore';

import {Availability, LegalHoldStatus} from '@wireapp/protocol-messaging';
import {WebAppEvents} from '@wireapp/webapp-events';

import {useLegalHoldModalState} from 'Components/Modals/LegalHoldModal/LegalHoldModal.state';
import {t} from 'Util/LocalizerUtil';
import {getLogger, Logger} from 'Util/Logger';
import {matchQualifiedIds} from 'Util/QualifiedId';
import {truncate} from 'Util/StringUtil';

import {CallMessage} from './message/CallMessage';
import type {ContentMessage} from './message/ContentMessage';
import type {MemberMessage} from './message/MemberMessage';
import type {Message} from './message/Message';
import {PingMessage} from './message/PingMessage';
import type {User} from './User';

import type {Call} from '../calling/Call';
import {ClientRepository} from '../client';
import {Config} from '../Config';
import {ConnectionEntity} from '../connection/ConnectionEntity';
import {ACCESS_STATE} from '../conversation/AccessState';
import {ConversationRepository} from '../conversation/ConversationRepository';
import {isSelfConversation} from '../conversation/ConversationSelectors';
import {ConversationStatus} from '../conversation/ConversationStatus';
import {ConversationVerificationState} from '../conversation/ConversationVerificationState';
import {NOTIFICATION_STATE} from '../conversation/NotificationSetting';
import {ConversationError} from '../error/ConversationError';
import {isContentMessage, isDeleteMessage} from '../guards/Message';
import {StatusType} from '../message/StatusType';
import {ConversationRecord} from '../storage/record/ConversationRecord';
import {TeamState} from '../team/TeamState';

interface UnreadState {
  allEvents: Message[];
  allMessages: ContentMessage[];
  calls: CallMessage[];
  otherMessages: ContentMessage[];
  pings: PingMessage[];
  selfMentions: ContentMessage[];
  selfReplies: ContentMessage[];
}

enum TIMESTAMP_TYPE {
  ARCHIVED = 'archivedTimestamp',
  CLEARED = 'cleared_timestamp',
  LAST_EVENT = 'last_event_timestamp',
  LAST_READ = 'last_read_timestamp',
  LAST_SERVER = 'last_server_timestamp',
  MUTED = 'mutedTimestamp',
}

export class Conversation {
  private readonly teamState: TeamState;
  public readonly archivedState: ko.Observable<boolean>;
  private readonly incomingMessages: ko.ObservableArray<Message>;
  private readonly isTeam1to1: ko.PureComputed<boolean>;
  public readonly last_server_timestamp: ko.Observable<number>;
  private readonly logger: Logger;
  public readonly mutedState: ko.Observable<number>;
  private readonly mutedTimestamp: ko.Observable<number>;
  private readonly publishPersistState: (() => void) & Cancelable;
  private shouldPersistStateChanges: boolean;
  public blockLegalHoldMessage: boolean;
  public hasCreationMessage: boolean;
  public needsLegalHoldApproval: boolean = false;
  public readonly accessCode: ko.Observable<string>;
  public readonly accessState: ko.Observable<ACCESS_STATE>;
  public readonly archivedTimestamp: ko.Observable<number>;
  public readonly availabilityOfUser: ko.PureComputed<Availability.Type>;
  public readonly call: ko.Observable<Call | null>;
  public readonly cleared_timestamp: ko.Observable<number>;
  public readonly connection: ko.Observable<ConnectionEntity>;
  // TODO(Federation): Currently the 'creator' just refers to a user id but it has to become a qualified id
  public creator: string;
  public groupId?: string;
  public epoch: number = -1;
  public cipherSuite: number = 1;
  public readonly isUsingMLSProtocol: boolean;
  public readonly display_name: ko.PureComputed<string>;
  public readonly firstUserEntity: ko.PureComputed<User>;
  public readonly enforcedTeamMessageTimer: ko.PureComputed<number>;
  public readonly globalMessageTimer: ko.Observable<number | null>;
  public readonly hasContentMessages: ko.Observable<boolean>;
  public readonly hasAdditionalMessages: ko.Observable<boolean>;
  public readonly hasGlobalMessageTimer: ko.PureComputed<boolean>;
  public readonly hasGuest: ko.PureComputed<boolean>;
  public readonly hasDirectGuest: ko.PureComputed<boolean>;
  public readonly hasLegalHold: ko.Computed<boolean>;
  public readonly hasService: ko.PureComputed<boolean>;
  public readonly hasUnread: ko.PureComputed<boolean>;
  public id: string;
  public readonly inTeam: ko.PureComputed<boolean>;
  public readonly lastDeliveredMessage: ko.PureComputed<Message | undefined>;
  public readonly is_archived: ko.Observable<boolean>;
  public readonly is_cleared: ko.PureComputed<boolean>;
  public readonly is_loaded: ko.Observable<boolean>;
  public readonly is_pending: ko.Observable<boolean>;
  public readonly is_verified: ko.PureComputed<boolean | undefined>;
  public readonly is1to1: ko.PureComputed<boolean>;
  public readonly isActiveParticipant: ko.PureComputed<boolean>;
  public readonly isClearable: ko.PureComputed<boolean>;
  public readonly isCreatedBySelf: ko.PureComputed<boolean>;
  public readonly isGroup: ko.PureComputed<boolean>;
  public readonly isGuest: ko.Observable<boolean>;
  public readonly isGuestRoom: ko.PureComputed<boolean>;
  public readonly isGuestAndServicesRoom: ko.PureComputed<boolean>;
  public readonly isServicesRoom: ko.PureComputed<boolean>;
  public readonly isLeavable: ko.PureComputed<boolean>;
  public readonly isMutable: ko.PureComputed<boolean>;
  public readonly isRequest: ko.PureComputed<boolean>;
  /** @deprecated use isSelfConversation from conversationSelectors */
  public readonly isSelf: ko.PureComputed<boolean>;
  public readonly isTeamOnly: ko.PureComputed<boolean>;
  public readonly last_event_timestamp: ko.Observable<number>;
  public readonly last_read_timestamp: ko.Observable<number>;
  public readonly legalHoldStatus: ko.Observable<LegalHoldStatus>;
  public readonly localMessageTimer: ko.Observable<number>;
  public readonly messages_unordered: ko.ObservableArray<Message>;
  public readonly messages_visible: ko.PureComputed<Message[]>;
  public readonly messages: ko.PureComputed<Message[]>;
  public readonly messageTimer: ko.PureComputed<number>;
  public readonly name: ko.Observable<string>;
  public readonly notificationState: ko.PureComputed<number>;
  public readonly participating_user_ets: ko.ObservableArray<User>;
  public readonly participating_user_ids: ko.ObservableArray<QualifiedId>;
  public readonly allUserEntities: ko.PureComputed<User[]>;
  public readonly receiptMode: ko.Observable<RECEIPT_MODE>;
  public readonly removed_from_conversation: ko.PureComputed<boolean>;
  public readonly roles: ko.Observable<Record<string, string>>;
  public readonly selfUser: ko.Observable<User | undefined>;
  public readonly servicesCount: ko.PureComputed<number>;
  public readonly showNotificationsEverything: ko.PureComputed<boolean>;
  public readonly showNotificationsMentionsAndReplies: ko.PureComputed<boolean>;
  public readonly showNotificationsNothing: ko.PureComputed<boolean>;
  public status: ko.Observable<ConversationStatus>;
  public team_id: string;
  public readonly type: ko.Observable<CONVERSATION_TYPE>;
  public readonly unreadState: ko.PureComputed<UnreadState>;
  public readonly verification_state: ko.Observable<ConversationVerificationState>;
  public readonly mlsVerificationState: ko.Observable<ConversationVerificationState>;
  public readonly withAllTeamMembers: ko.Observable<boolean>;
  public readonly hasExternal: ko.PureComputed<boolean>;
  public readonly hasFederatedUsers: ko.PureComputed<boolean>;
  public accessModes?: CONVERSATION_ACCESS[];
  public accessRole?: CONVERSATION_LEGACY_ACCESS_ROLE | CONVERSATION_ACCESS_ROLE[];
  public domain: string;

  static get TIMESTAMP_TYPE(): typeof TIMESTAMP_TYPE {
    return TIMESTAMP_TYPE;
  }

  constructor(
    conversation_id: string = '',
    domain: string = '',
    public readonly protocol = ConversationProtocol.PROTEUS,
    teamState = container.resolve(TeamState),
  ) {
    this.teamState = teamState;
    this.id = conversation_id;

    this.domain = domain;

    this.logger = getLogger(`Conversation (${this.id})`);

    this.accessState = ko.observable();
    this.accessCode = ko.observable();
    this.creator = undefined;
    this.name = ko.observable();
    this.team_id = undefined;
    this.type = ko.observable();

    /**
     * If a conversation has the groupId property it means that it
     * is MLS protocol based as this property is for MLS conversations only.
     * @returns boolean
     */
    this.isUsingMLSProtocol = protocol === ConversationProtocol.MLS;

    this.is_loaded = ko.observable(false);
    this.is_pending = ko.observable(false);

    this.participating_user_ets = ko.observableArray([]); // Does not include self user
    this.participating_user_ids = ko.observableArray([]); // Does not include self user
    this.allUserEntities = ko.pureComputed(() => {
      const selfUser = this.selfUser();
      const selfUserArray = selfUser ? [selfUser] : [];
      return selfUserArray.concat(this.participating_user_ets());
    });
    this.selfUser = ko.observable();
    this.roles = ko.observable({});

    this.hasCreationMessage = false;

    this.firstUserEntity = ko.pureComputed(() => this.participating_user_ets()[0]);
    this.availabilityOfUser = ko.pureComputed(() => this.firstUserEntity()?.availability());

    this.isGuest = ko.observable(false);

    this.inTeam = ko.pureComputed(() => {
      const isSameTeam = this.selfUser()?.teamId === this.team_id;
      const isSameDomain = this.domain === this.selfUser()?.domain;
      return !!this.team_id && isSameTeam && !this.isGuest() && isSameDomain;
    });
    this.isGuestRoom = ko.pureComputed(() => this.accessState() === ACCESS_STATE.TEAM.GUEST_ROOM);
    this.isGuestAndServicesRoom = ko.pureComputed(() => this.accessState() === ACCESS_STATE.TEAM.GUESTS_SERVICES);
    this.isServicesRoom = ko.pureComputed(() => this.accessState() === ACCESS_STATE.TEAM.SERVICES);
    this.isTeamOnly = ko.pureComputed(() => this.accessState() === ACCESS_STATE.TEAM.TEAM_ONLY);
    this.withAllTeamMembers = ko.observable(false);

    this.isTeam1to1 = ko.pureComputed(() => {
      const isGroupConversation = this.type() === CONVERSATION_TYPE.REGULAR;
      const hasOneParticipant = this.participating_user_ids().length === 1;
      return isGroupConversation && hasOneParticipant && this.team_id && !this.name();
    });
    this.isGroup = ko.pureComputed(() => {
      const isGroupConversation = this.type() === CONVERSATION_TYPE.REGULAR;
      return isGroupConversation && !this.isTeam1to1();
    });
    this.is1to1 = ko.pureComputed(() => {
      const is1to1Conversation = this.type() === CONVERSATION_TYPE.ONE_TO_ONE;
      return is1to1Conversation || this.isTeam1to1();
    });
    this.isRequest = ko.pureComputed(() => this.type() === CONVERSATION_TYPE.CONNECT);
    this.isSelf = ko.pureComputed(() => this.type() === CONVERSATION_TYPE.SELF);

    this.hasDirectGuest = ko.pureComputed(() => {
      const hasGuestUser = this.participating_user_ets().some(userEntity => userEntity.isDirectGuest());
      return hasGuestUser && this.isGroup() && this.selfUser()?.inTeam();
    });
    this.hasGuest = ko.pureComputed(() => {
      const hasGuestUser = this.participating_user_ets().some(userEntity => userEntity.isGuest());
      return hasGuestUser && this.isGroup() && this.selfUser()?.inTeam();
    });
    this.hasService = ko.pureComputed(() => this.participating_user_ets().some(userEntity => userEntity.isService));
    this.hasExternal = ko.pureComputed(() => this.participating_user_ets().some(userEntity => userEntity.isExternal()));
    this.hasFederatedUsers = ko.pureComputed(() =>
      this.participating_user_ets().some(userEntity => userEntity.isFederated),
    );
    this.servicesCount = ko.pureComputed(
      () => this.participating_user_ets().filter(userEntity => userEntity.isService).length,
    );

    // in case this is a one2one conversation this is the connection to that user
    this.connection = ko.observable(new ConnectionEntity());
    this.connection.subscribe(connectionEntity => {
      const connectedUserId = connectionEntity?.userId;
      if (connectedUserId && this.participating_user_ids().every(user => !matchQualifiedIds(user, connectedUserId))) {
        this.participating_user_ids.push(connectedUserId);
      }
    });

    // E2EE conversation states
    this.archivedState = ko.observable(false).extend({notify: 'always'});
    this.mutedState = ko.observable(NOTIFICATION_STATE.EVERYTHING);
    this.verification_state = ko.observable(ConversationVerificationState.UNVERIFIED);
    this.mlsVerificationState = ko.observable(ConversationVerificationState.UNVERIFIED);

    this.archivedTimestamp = ko.observable(0);
    this.cleared_timestamp = ko.observable(0);
    this.last_event_timestamp = ko.observable(0);
    this.last_read_timestamp = ko.observable(0);
    this.last_server_timestamp = ko.observable(0);
    this.mutedTimestamp = ko.observable(0);

    this.call = ko.observable(null);

    // Conversation states for view
    this.notificationState = ko.pureComputed(() => {
      if (!this.selfUser()) {
        return NOTIFICATION_STATE.NOTHING;
      }
      const mutedState = this.mutedState();

      const knownNotificationStates = Object.values(NOTIFICATION_STATE);
      if (knownNotificationStates.includes(mutedState)) {
        const isStateMentionsAndReplies = mutedState === NOTIFICATION_STATE.MENTIONS_AND_REPLIES;
        const isInvalidState = isStateMentionsAndReplies && !this.selfUser().inTeam();

        return isInvalidState ? NOTIFICATION_STATE.NOTHING : mutedState;
      }

      if (typeof mutedState === 'boolean') {
        const migratedMutedState = this.selfUser().inTeam()
          ? NOTIFICATION_STATE.MENTIONS_AND_REPLIES
          : NOTIFICATION_STATE.NOTHING;
        return this.mutedState() ? migratedMutedState : NOTIFICATION_STATE.EVERYTHING;
      }

      return NOTIFICATION_STATE.EVERYTHING;
    });

    this.is_archived = this.archivedState;
    this.is_cleared = ko.pureComputed(() => this.last_event_timestamp() <= this.cleared_timestamp());
    this.is_verified = ko.pureComputed(() => {
      if (!this.hasInitializedUsers()) {
        return undefined;
      }

      return this.allUserEntities().every(userEntity => userEntity.is_verified());
    });

    this.legalHoldStatus = ko.observable(LegalHoldStatus.DISABLED);

    this.hasLegalHold = ko.computed(() => {
      const isInitialized = this.hasInitializedUsers();
      const hasLegalHold = isInitialized && this.allUserEntities().some(userEntity => userEntity.isOnLegalHold());

      if (isInitialized) {
        this.legalHoldStatus(hasLegalHold ? LegalHoldStatus.ENABLED : LegalHoldStatus.DISABLED);
      }

      if (!hasLegalHold) {
        const {closeRequestModal} = useLegalHoldModalState.getState();
        closeRequestModal(this.id);
      }

      return hasLegalHold;
    });

    this.blockLegalHoldMessage = false;

    this.legalHoldStatus.subscribe(legalHoldStatus => {
      if (!this.blockLegalHoldMessage && !isSelfConversation(this) && this.hasInitializedUsers()) {
        amplify.publish(WebAppEvents.CONVERSATION.INJECT_LEGAL_HOLD_MESSAGE, {
          conversationEntity: this,
          legalHoldStatus,
          userId: this.selfUser().qualifiedId,
        });
      }
    });

    this.isCreatedBySelf = ko.pureComputed(
      () => this.selfUser().id === this.creator && !this.removed_from_conversation(),
    );

    this.showNotificationsEverything = ko.pureComputed(() => {
      return this.notificationState() === NOTIFICATION_STATE.EVERYTHING;
    });
    this.showNotificationsNothing = ko.pureComputed(() => {
      return this.notificationState() === NOTIFICATION_STATE.NOTHING;
    });
    this.showNotificationsMentionsAndReplies = ko.pureComputed(() => {
      return this.notificationState() === NOTIFICATION_STATE.MENTIONS_AND_REPLIES;
    });

    this.status = ko.observable(ConversationStatus.CURRENT_MEMBER);
    this.removed_from_conversation = ko.pureComputed(() => {
      return this.status() === ConversationStatus.PAST_MEMBER;
    });
    this.isActiveParticipant = ko.pureComputed(() => !this.removed_from_conversation() && !this.isGuest());
    this.isClearable = ko.pureComputed(() => !this.isRequest() && !this.is_cleared());
    this.isLeavable = ko.pureComputed(() => this.isGroup() && !this.removed_from_conversation());
    this.isMutable = ko.pureComputed(() => !this.isRequest() && !this.removed_from_conversation());

    // Messages
    this.localMessageTimer = ko.observable(null);
    this.globalMessageTimer = ko.observable(null);

    this.receiptMode = ko.observable(RECEIPT_MODE.OFF);

    // The team configuration for self-deleting messages has
    // always precedence over conversation or local settings.
    // https://wearezeta.atlassian.net/wiki/spaces/SER/pages/474873953/Tech+spec+Self-deleting+messages+feature+config
    //
    // E.g. If a user is participant of a foreign conversation
    // that enforces self-deleting messages while self-deleting
    // messages are disabled for the users team, the user will
    // send normal messages (not self-deleting) and ignore the
    // setting of the conversation.
    this.messageTimer = ko.pureComputed(
      () =>
        this.teamState.isSelfDeletingMessagesEnabled() &&
        (this.teamState.getEnforcedSelfDeletingMessagesTimeout() ||
          this.globalMessageTimer() ||
          this.localMessageTimer()),
    );
    this.hasGlobalMessageTimer = ko.pureComputed(() => this.globalMessageTimer() > 0);

    this.messages_unordered = ko.observableArray();
    this.messages = ko.pureComputed(() =>
      [...this.messages_unordered()].sort((message_a, message_b) => {
        return message_a.timestamp() - message_b.timestamp();
      }),
    );
    this.lastDeliveredMessage = ko.pureComputed(() => this.getLastDeliveredMessage());

    this.incomingMessages = ko.observableArray();

    this.hasAdditionalMessages = ko.observable(true);

    // Since we release messages from memory when the conversation is not active, we use an observable to keep track of conversations with messages
    this.hasContentMessages = ko.observable(
      [...this.messages(), ...this.incomingMessages()].some(message => message.isContent()),
    );

    this.messages_visible = ko
      .pureComputed(() => (!this.id ? [] : this.messages().filter(messageEntity => messageEntity.visible())))
      .extend({trackArrayChanges: true});

    // Calling
    this.unreadState = ko.pureComputed(() => {
      const unreadState: UnreadState = {
        allEvents: [],
        allMessages: [],
        calls: [],
        otherMessages: [],
        pings: [],
        selfMentions: [],
        selfReplies: [],
      };
      const messages = [...this.messages(), ...this.incomingMessages()];
      for (let index = messages.length - 1; index >= 0; index--) {
        const messageEntity = messages[index];
        if (messageEntity.visible()) {
          const isReadMessage = messageEntity.timestamp() <= this.last_read_timestamp() || messageEntity.user().isMe;
          if (isReadMessage) {
            break;
          }

          const isMissedCall = messageEntity.isCall() && !messageEntity.wasCompleted();
          const isPing = messageEntity.isPing();
          const isMessage = messageEntity.isContent();
          const isSelfMentioned =
            isMessage &&
            this.selfUser() &&
            (messageEntity as ContentMessage).isUserMentioned(this.selfUser().qualifiedId);
          const isSelfQuoted =
            isMessage && this.selfUser() && (messageEntity as ContentMessage).isUserQuoted(this.selfUser().id);

          if (isMissedCall || isPing || isMessage) {
            unreadState.allMessages.push(messageEntity as ContentMessage);
          }

          if (isSelfMentioned) {
            unreadState.selfMentions.push(messageEntity as ContentMessage);
          } else if (isSelfQuoted) {
            unreadState.selfReplies.push(messageEntity as ContentMessage);
          } else if (isMissedCall) {
            unreadState.calls.push(messageEntity);
          } else if (isPing) {
            unreadState.pings.push(messageEntity);
          } else if (isMessage) {
            unreadState.otherMessages.push(messageEntity as ContentMessage);
          }

          unreadState.allEvents.push(messageEntity as ContentMessage);
        }
      }

      return unreadState;
    });

    this.hasUnread = ko.pureComputed(() => {
      const isIgnored = this.isRequest() || this.showNotificationsNothing();
      if (isIgnored) {
        return false;
      }
      const {
        allMessages: unreadMessages,
        selfMentions: unreadSelfMentions,
        selfReplies: unreadSelfReplies,
      } = this.unreadState();

      return this.showNotificationsMentionsAndReplies()
        ? unreadSelfMentions.length > 0 || unreadSelfReplies.length > 0
        : unreadMessages.length > 0;
    });

    /**
     * Display name strategy:
     *
     * 'One-to-One Conversations' and 'Connection Requests':
     * We should not use the conversation name received from the backend as fallback as it will always contain the
     * name of the user who received the connection request initially
     *
     * - Name of the other participant
     * - Name of the other user of the associated connection
     * - "Name not available" if neither of those has been attached yet
     *
     * 'Group Conversation':
     * - Conversation name received from backend
     * - If unnamed, we will create a name from the participant names
     * - Join the user's first names to a comma separated list or uses the user's first name if only one user participating
     * - "..." if the user entities have not yet been attached
     */
    this.display_name = ko.pureComputed(() => {
      if (this.isRequest() || this.is1to1()) {
        const [userEntity] = this.participating_user_ets();
        const userName = userEntity?.name();
        return userName || t('unavailableUser');
      }

      if (this.isGroup()) {
        if (this.name()) {
          return this.name();
        }

        const hasUserEntities = !!this.participating_user_ets().length;
        if (hasUserEntities) {
          const isJustServices = this.participating_user_ets().every(userEntity => userEntity.isService);
          const joinedNames = this.participating_user_ets()
            .filter(userEntity => isJustServices || !userEntity.isService)
            .map(userEntity => userEntity.name())
            .join(', ');

          const maxLength = ConversationRepository.CONFIG.GROUP.MAX_NAME_LENGTH;
          return truncate(joinedNames, maxLength, false);
        }

        const hasUserIds = !!this.participating_user_ids().length;
        if (!hasUserIds) {
          return t('conversationsEmptyConversation');
        }
      }

      return '…';
    });

    this.shouldPersistStateChanges = false;
    this.publishPersistState = debounce(() => {
      amplify.publish(WebAppEvents.CONVERSATION.PERSIST_STATE, this);
    }, 100);

    this._initSubscriptions();
  }

  get qualifiedId(): QualifiedId {
    return {domain: this.domain, id: this.id};
  }

  private hasInitializedUsers() {
    const hasMappedUsers = this.participating_user_ets().length || !this.participating_user_ids().length;
    return Boolean(this.selfUser() && hasMappedUsers);
  }

  private _initSubscriptions() {
    [
      this.archivedState,
      this.archivedTimestamp,
      this.cleared_timestamp,
      this.messageTimer,
      this.isGuest,
      this.last_event_timestamp,
      this.last_read_timestamp,
      this.last_server_timestamp,
      this.mutedState,
      this.mutedTimestamp,
      this.name,
      this.participating_user_ids,
      this.receiptMode,
      this.status,
      this.type,
      this.verification_state,
    ].forEach(property => (property as ko.Observable).subscribe(this.persistState));
  }

  readonly persistState = (): void => {
    if (this.shouldPersistStateChanges) {
      this.publishPersistState();
    }
  };

  setStateChangePersistence(persistChanges: boolean): void {
    this.shouldPersistStateChanges = persistChanges;
  }

  /**
   * Remove all message from conversation unless there are unread messages.
   */
  release(): void {
    if (!this.unreadState().allEvents.length) {
      this.removeMessages();
      this.is_loaded(false);
      this.hasAdditionalMessages(true);
    }
  }

  /**
   * Set the timestamp of a given type.
   * @note This will only increment timestamps
   * @param timestamp Timestamp to be set
   * @param type Type of timestamp to be updated
   * @param forceUpdate set the timestamp regardless of previous timestamp value (no checks)
   * @returns Timestamp value which can be `false` (boolean) if there is no timestamp
   */
  setTimestamp(timestamp: string | number, type: TIMESTAMP_TYPE, forceUpdate: boolean = false): number | false {
    if (typeof timestamp === 'string') {
      timestamp = window.parseInt(timestamp, 10);
    }

    let entityTimestamp: ko.Observable<number>;

    switch (type) {
      case TIMESTAMP_TYPE.ARCHIVED:
        entityTimestamp = this.archivedTimestamp;
        break;
      case TIMESTAMP_TYPE.CLEARED:
        entityTimestamp = this.cleared_timestamp;
        break;
      case TIMESTAMP_TYPE.LAST_EVENT:
        entityTimestamp = this.last_event_timestamp;
        break;
      case TIMESTAMP_TYPE.LAST_READ:
        entityTimestamp = this.last_read_timestamp;
        break;
      case TIMESTAMP_TYPE.LAST_SERVER:
        entityTimestamp = this.last_server_timestamp;
        break;
      case TIMESTAMP_TYPE.MUTED:
        entityTimestamp = this.mutedTimestamp;
        break;
    }

    if (!entityTimestamp) {
      throw new ConversationError(
        ConversationError.TYPE.INVALID_PARAMETER,
        ConversationError.MESSAGE.INVALID_PARAMETER,
      );
    }

    const updatedTimestamp = forceUpdate ? timestamp : this._incrementTimeOnly(entityTimestamp(), timestamp);

    if (updatedTimestamp !== false) {
      entityTimestamp(updatedTimestamp);
    }

    return updatedTimestamp;
  }

  /**
   * Increment only on timestamp update
   * @param currentTimestamp Current timestamp
   * @param updatedTimestamp Timestamp from update
   * @returns Updated timestamp or `false` if not increased
   */
  private _incrementTimeOnly(currentTimestamp: number, updatedTimestamp: number): number | false {
    const timestampIncreased = updatedTimestamp > currentTimestamp;
    return timestampIncreased ? updatedTimestamp : false;
  }

  /**
   * Adds a single message to the conversation.
   * @param messageEntity Message entity to be added to the conversation.
   * @returns If a message was replaced in the conversation
   */
  addMessage(messageEntity: Message): boolean | void {
    if (messageEntity) {
      const messageWithLinkPreview = () => this._findDuplicate(messageEntity.id, messageEntity.from);
      const editedMessage = () =>
        this._findDuplicate((messageEntity as ContentMessage).replacing_message_id, messageEntity.from);
      const alreadyAdded = messageWithLinkPreview() || editedMessage();

      if (messageEntity.isContent()) {
        this.hasContentMessages(true);
      }
      if (alreadyAdded) {
        return false;
      }
      if (this.hasLastReceivedMessageLoaded()) {
        this.updateTimestamps(messageEntity);
        this.incomingMessages.remove(({id}) => messageEntity.id === id);
        // If the last received message is currently in memory, we can add this message to the displayed messages
        this.messages_unordered.push(messageEntity);
      } else {
        // If the conversation is not loaded, we will add this message to the incoming messages (but not to the messages displayed)
        this.incomingMessages.push(messageEntity);
      }
      amplify.publish(WebAppEvents.CONVERSATION.MESSAGE.ADDED, messageEntity);
      return true;
    }
  }

  /**
   * Adds multiple messages to the conversation.
   * @param message_ets Array of message entities to be added to the conversation
   */
  addMessages(message_ets: ContentMessage[]): void {
    message_ets = message_ets
      .map(message_et => this._checkForDuplicate(message_et))
      .filter(message_et => !!message_et) as ContentMessage[];

    // in order to avoid multiple db writes check the messages from the end and stop once
    // we found a message from self user
    for (let counter = message_ets.length - 1; counter >= 0; counter--) {
      const message_et = message_ets[counter];
      if (message_et.user()?.isMe) {
        this.updateTimestamps(message_et);
        break;
      }
    }
    const messageIds = message_ets.map(({id}) => id);
    this.incomingMessages.remove(({id}) => messageIds.includes(id));
    this.messages_unordered.push(...message_ets);
  }

  getFirstUnreadSelfMention(): ContentMessage {
    return this.unreadState().selfMentions.slice().pop();
  }

  getLastKnownTimestamp(currentTimestamp?: number): number {
    const last_known_timestamp = Math.max(this.last_server_timestamp(), this.last_event_timestamp());
    return last_known_timestamp ?? currentTimestamp;
  }

  /**
   * Return the next timestamp that can be used to inject a message right after the last message that is not a message currently being sent
   */
  getNextTimestamp(): number {
    const sentMessages = this.messages().filter(message => message?.status() !== StatusType.SENDING);
    if (sentMessages.length === 0) {
      return this.getLastKnownTimestamp() + 1;
    }
    const lastMessageTimestamp = sentMessages[sentMessages.length - 1].timestamp();
    // The next timestamp can never be before the last known timestamp, so we need to take the max between the last message and the last known server timestamp
    return Math.max(lastMessageTimestamp, this.getLastKnownTimestamp()) + 1;
  }

  getLatestTimestamp(currentTimestamp: number): number {
    return Math.max(this.last_server_timestamp(), this.last_event_timestamp(), currentTimestamp);
  }

  getNextIsoDate(currentTimestamp?: number): string {
    if (typeof currentTimestamp !== 'number') {
      currentTimestamp = Date.now();
    }
    const timestamp = Math.max(this.last_server_timestamp() + 1, currentTimestamp);
    return new Date(timestamp).toISOString();
  }

  getNumberOfServices(): number {
    return this.participating_user_ets().filter(userEntity => userEntity.isService).length;
  }

  getNumberOfParticipants(countSelf: boolean = true, countServices: boolean = true): number {
    const adjustCountForSelf = countSelf && !this.removed_from_conversation() ? 1 : 0;
    const adjustCountForServices = countServices ? 0 : this.getNumberOfServices();

    return this.participating_user_ids().length + adjustCountForSelf - adjustCountForServices;
  }

  getNumberOfClients(): number {
    const participantsMapped = this.participating_user_ids().length === this.participating_user_ets().length;
    if (participantsMapped) {
      return this.participating_user_ets().reduce((accumulator, userEntity) => {
        return userEntity.devices().length
          ? accumulator + userEntity.devices().length
          : accumulator + ClientRepository.CONFIG.AVERAGE_NUMBER_OF_CLIENTS;
      }, this.selfUser().devices().length);
    }

    return this.getNumberOfParticipants() * ClientRepository.CONFIG.AVERAGE_NUMBER_OF_CLIENTS;
  }

  /**
   * Prepends messages with new batch of messages.
   * @param message_ets Array of messages to be added to conversation
   */
  prependMessages(message_ets: ContentMessage[]): void {
    message_ets = message_ets
      .map(message_et => this._checkForDuplicate(message_et))
      .filter(message_et => !!message_et) as ContentMessage[];

    this.messages_unordered.unshift(...message_ets);
  }

  /**
   * Removes message from the conversation by message id.
   * @param message_id ID of the message entity to be removed from the conversation
   */
  removeMessageById(message_id: string): void {
    this.messages_unordered.remove(message_et => message_id && message_id === message_et.id);
  }

  /**
   * Removes messages from the conversation.
   * @param timestamp Optional timestamp which messages should be removed
   */
  removeMessages(timestamp?: number): void {
    if (timestamp && typeof timestamp === 'number') {
      this.messages_unordered.remove(message_et => timestamp >= message_et.timestamp());
      return;
    }
    this.messages_unordered.removeAll();
  }

  shouldUnarchive(): boolean {
    if (!this.archivedState() || this.showNotificationsNothing()) {
      return false;
    }

    const isNewerMessage = (messageEntity: Message) => messageEntity.timestamp() > this.archivedTimestamp();

    const {allEvents, allMessages, selfMentions, selfReplies} = this.unreadState();
    if (this.showNotificationsMentionsAndReplies()) {
      const mentionsAndReplies = selfMentions.concat(selfReplies);
      return mentionsAndReplies.some(isNewerMessage);
    }

    const hasNewMessage = allMessages.some(isNewerMessage);
    if (hasNewMessage) {
      return true;
    }

    return allEvents.some(messageEntity => {
      if (!isNewerMessage(messageEntity)) {
        return false;
      }

      const isCallActivation = messageEntity.isCall() && messageEntity.isActivation();
      const isMemberJoin = messageEntity.isMember() && (messageEntity as MemberMessage).isMemberJoin();
      const wasSelfUserAdded =
        isMemberJoin && (messageEntity as MemberMessage).isUserAffected(this.selfUser().qualifiedId);

      return isCallActivation || wasSelfUserAdded;
    });
  }

  /**
   * Checks for message duplicates.
   *
   * @param messageEntity Message entity to be added to the conversation
   * @returns Message if it is not a duplicate
   */
  private _checkForDuplicate(messageEntity: ContentMessage): ContentMessage | undefined {
    if (messageEntity) {
      const existingMessageEntity = this._findDuplicate(messageEntity.id, messageEntity.from);
      if (existingMessageEntity) {
        this.logger.warn(`Filtered message '${messageEntity.id}' as duplicate in view`);
        return undefined;
      }
      return messageEntity;
    }
    return undefined;
  }

  private _findDuplicate(): undefined;
  private _findDuplicate(messageId: string, from: string): Message;
  private _findDuplicate(messageId?: string, from?: string): Message | undefined {
    if (messageId) {
      return this.messages_unordered().find(messageEntity => {
        const sameId = messageEntity.id === messageId;
        const sameSender = messageEntity.from === from;
        return sameId && sameSender;
      });
    }
    return undefined;
  }

  updateTimestampServer(time: number | string, is_backend_timestamp: boolean = false): void {
    if (is_backend_timestamp) {
      const timestamp = new Date(time).getTime();

      if (!isNaN(timestamp)) {
        this.setTimestamp(timestamp, TIMESTAMP_TYPE.LAST_SERVER);
      }
    }
  }

  /**
   * Update information about conversation activity from single message.
   *
   * @param message_et Message to be added to conversation
   * @param forceUpdate set the timestamp regardless of previous timestamp value (no checks)
   */
  updateTimestamps(message_et?: Message, forceUpdate: boolean = false): void {
    if (message_et) {
      const timestamp = message_et.timestamp();
      if (timestamp <= this.last_server_timestamp()) {
        // Some message do not bubble the conversation up in the conversation list (call messages for example or some system messages).
        // Those should not update the conversation timestamp.
        // This is ignored if the `forceUpdate` flag is set.
        if (message_et.timestamp_affects_order() || forceUpdate) {
          this.setTimestamp(timestamp, TIMESTAMP_TYPE.LAST_EVENT, forceUpdate);

          const from_self = message_et.user()?.isMe;
          if (from_self) {
            this.setTimestamp(timestamp, TIMESTAMP_TYPE.LAST_READ);
          }
        }
      }
    }
  }

  getAllMessages(): Message[] {
    return this.messages();
  }

  /**
   * Get the oldest loaded message of the conversation.
   */
  getOldestMessage(): Message | undefined {
    return this.messages().find(
      message =>
        // Deleted message should be ignored since they might have a timestamp in the past (the timestamp of a delete message is the timestamp of the message that was deleted)
        !isDeleteMessage(message),
    );
  }

  /**
   * Get the last message of the conversation.
   */
  getNewestMessage(): Message | undefined {
    return this.messages()[this.messages().length - 1];
  }

  /**
   * Get the message before a given message.
   * @param message_et Message to look up from
   */
  getPreviousMessage(message_et: Message): Message | undefined {
    const messages_visible = this.messages_visible();
    const message_index = messages_visible.indexOf(message_et);
    if (message_index > 0) {
      return messages_visible[message_index - 1];
    }
    return undefined;
  }

  /**
   * Get the last text message that was added by self user.
   */
  getLastEditableMessage(): Message | undefined {
    const messages = this.messages();
    for (let index = messages.length - 1; index >= 0; index--) {
      const message_et = messages[index];
      if (message_et.isEditable()) {
        return message_et;
      }
    }
    return undefined;
  }

  /**
   * Get the last delivered message.
   */
  private getLastDeliveredMessage(): Message | undefined {
    return this.messages()
      .slice()
      .reverse()
      .find(messageEntity => {
        const isDelivered = [StatusType.DELIVERED, StatusType.SEEN].includes(messageEntity.status());
        return isDelivered && messageEntity.user().isMe;
      });
  }

  /**
   * Get a message by its unique ID.
   * Only lookup in the loaded message list which is a limited view of all the messages in DB.
   *
   * @param messageId ID of message to be retrieved
   */
  getMessage(messageId: string): Message | undefined {
    return this.messages().find(messageEntity => messageEntity.id === messageId);
  }
  /**
   * Get a message by its replacing message id. Useful if the message in question is an edit and has replaced the original message.
   * Only lookup in the loaded message list which is a limited view of all the messages in DB.
   *
   * @param messageId ID of message to be retrieved
   */
  getMessageByReplacementId(messageId: string): Message | undefined {
    return this.messages().find(
      messageEntity => isContentMessage(messageEntity) && messageEntity.replacing_message_id === messageId,
    );
  }

  updateGuests(): void {
    this.getTemporaryGuests().forEach(userEntity => userEntity.checkGuestExpiration());
  }

  getTemporaryGuests(): User[] {
    const userEntities = this.selfUser()
      ? this.participating_user_ets().concat(this.selfUser())
      : this.participating_user_ets();
    return userEntities.filter(userEntity => userEntity.isTemporaryGuest());
  }

  getUsersWithUnverifiedClients(): User[] {
    const userEntities = this.selfUser()
      ? this.participating_user_ets().concat(this.selfUser())
      : this.participating_user_ets();
    return userEntities.filter(userEntity => !userEntity.is_verified());
  }

  getAllUserEntities(): User[] {
    return this.participating_user_ets();
  }

  supportsVideoCall(sftEnabled: boolean): boolean {
    if (sftEnabled) {
      return true;
    }
    const participantCount = this.getNumberOfParticipants(true, false);
    const config = Config.getConfig();
    return participantCount <= config.MAX_VIDEO_PARTICIPANTS;
  }

  readonly hasLastReceivedMessageLoaded = (): boolean => {
    const newestMessage = this.getNewestMessage();
    return newestMessage?.timestamp() ? newestMessage.timestamp() >= this.last_event_timestamp() : true;
  };

  serialize(): ConversationRecord {
    return {
      access: this.accessModes,
      access_role: this.accessRole,
      archived_state: this.archivedState(),
      archived_timestamp: this.archivedTimestamp(),
      cipher_suite: this.cipherSuite,
      cleared_timestamp: this.cleared_timestamp(),
      creator: this.creator,
      domain: this.domain,
      ephemeral_timer: this.localMessageTimer(),
      epoch: this.epoch,
      global_message_timer: this.globalMessageTimer(),
      group_id: this.groupId,
      id: this.id,
      is_guest: this.isGuest(),
      last_event_timestamp: this.last_event_timestamp(),
      last_read_timestamp: this.last_read_timestamp(),
      last_server_timestamp: this.last_server_timestamp(),
      legal_hold_status: this.legalHoldStatus(),
      muted_state: this.mutedState(),
      muted_timestamp: this.mutedTimestamp(),
      name: this.name(),
      others: this.participating_user_ids().map(user => user.id),
      protocol: this.protocol,
      qualified_others: this.participating_user_ids(),
      receipt_mode: this.receiptMode(),
      roles: this.roles(),
      status: this.status(),
      team_id: this.team_id,
      type: this.type(),
      verification_state: this.verification_state(),
      mlsVerificationState: this.mlsVerificationState(),
    };
  }
}
