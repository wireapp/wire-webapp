/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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
  CONVERSATION_ACCESS,
  CONVERSATION_LEGACY_ACCESS_ROLE,
  CONVERSATION_TYPE,
} from '@wireapp/api-client/lib/conversation';
import {CONVERSATION_PROTOCOL} from '@wireapp/api-client/lib/team';
import {Conversation} from 'Repositories/entity/Conversation';

import {ConversationFilter} from './ConversationFilter';
import {ConversationDatabaseData, ConversationMapper} from './ConversationMapper';
import {ConversationStatus} from './ConversationStatus';
import {ConversationVerificationState} from './ConversationVerificationState';

describe('ConversationFilter', () => {
  describe('showCallControls', () => {
    it('defines when to show audio/video call buttons in the UI', () => {
      const conversationEntity = new Conversation();
      const showCallControls = ConversationFilter.showCallControls(conversationEntity, false);
      expect(showCallControls).toBeFalsy();
    });

    it('does not show call controls for an outgoing connection request', () => {
      const conversationData: ConversationDatabaseData = {
        access: undefined,
        accessRoleV2: undefined,
        access_role: undefined,
        archived_state: false,
        readonly_state: null,
        archived_timestamp: 0,
        cipher_suite: 1,
        cleared_timestamp: 0,
        creator: '077f0600-4ee6-4b9c-84e6-2795d6cbef0a',
        domain: '',
        ephemeral_timer: null,
        epoch: 0,
        global_message_timer: null,
        group_id: 'test-group-id',
        id: '796161e1-a319-41e3-9b33-2b3ab0b3b87a',
        is_guest: false,
        last_event_timestamp: 9,
        last_read_timestamp: 0,
        last_server_timestamp: 9,
        legal_hold_status: 1,
        muted_state: 0,
        muted_timestamp: 0,
        name: 'Florian@Staging11',
        others: ['71e25be1-5433-4647-964d-03a5d9e7c970'],
        protocol: CONVERSATION_PROTOCOL.PROTEUS,
        initial_protocol: CONVERSATION_PROTOCOL.PROTEUS,
        qualified_others: undefined,
        receipt_mode: null,
        roles: {},
        status: 0,
        team_id: undefined,
        type: 3,
        verification_state: ConversationVerificationState.UNVERIFIED,
        mlsVerificationState: ConversationVerificationState.UNVERIFIED,
      };
      const [conversationEntity] = ConversationMapper.mapConversations([conversationData]);
      expect(conversationEntity.is1to1()).toBeFalsy();
      expect(conversationEntity['isProteusTeam1to1']()).toBeFalsy();
      expect(conversationEntity.isGroup()).toBeFalsy();
      expect(conversationEntity.participating_user_ids().length).toBe(1);
      expect(conversationEntity.isSelfUserRemoved()).toBeFalsy();
      expect(conversationEntity.status()).toBe(ConversationStatus.CURRENT_MEMBER);
      expect(conversationEntity.type()).toBe(CONVERSATION_TYPE.CONNECT);
      expect(conversationEntity.name()).toBe('Florian@Staging11');

      const showCallControls = ConversationFilter.showCallControls(conversationEntity, false);
      expect(showCallControls).toBeFalsy();
    });

    it('shows call controls for an accepted connection request', () => {
      const conversationData: ConversationDatabaseData = {
        access: [CONVERSATION_ACCESS.PRIVATE],
        accessRoleV2: undefined,
        access_role: CONVERSATION_LEGACY_ACCESS_ROLE.PRIVATE,
        archived_state: false,
        readonly_state: null,
        archived_timestamp: 0,
        cipher_suite: 1,
        cleared_timestamp: 0,
        creator: '077f0600-4ee6-4b9c-84e6-2795d6cbef0a',
        domain: '',
        ephemeral_timer: null,
        epoch: 0,
        global_message_timer: null,
        group_id: 'test-group-id',
        id: '796161e1-a319-41e3-9b33-2b3ab0b3b87a',
        is_guest: false,
        last_event_timestamp: 4,
        last_read_timestamp: 0,
        last_server_timestamp: 1627916459003,
        legal_hold_status: 1,
        message_timer: null,
        muted_state: 0,
        muted_timestamp: 0,
        name: 'Florian@Staging11',
        others: ['71e25be1-5433-4647-964d-03a5d9e7c970'],
        initial_protocol: CONVERSATION_PROTOCOL.PROTEUS,
        protocol: CONVERSATION_PROTOCOL.PROTEUS,
        qualified_others: undefined,
        receipt_mode: null,
        roles: {
          '077f0600-4ee6-4b9c-84e6-2795d6cbef0a': 'wire_admin',
          '71e25be1-5433-4647-964d-03a5d9e7c970': 'wire_admin',
        },
        status: 0,
        team_id: null,
        type: 2,
        verification_state: ConversationVerificationState.UNVERIFIED,
        mlsVerificationState: ConversationVerificationState.UNVERIFIED,
      };
      const [conversationEntity] = ConversationMapper.mapConversations([conversationData]);
      expect(conversationEntity.is1to1()).toBeTruthy();
      expect(conversationEntity['isProteusTeam1to1']()).toBeFalsy();
      expect(conversationEntity.isGroup()).toBeFalsy();
      expect(conversationEntity.participating_user_ids().length).toBe(1);
      expect(conversationEntity.isSelfUserRemoved()).toBeFalsy();
      expect(conversationEntity.status()).toBe(ConversationStatus.CURRENT_MEMBER);
      expect(conversationEntity.type()).toBe(CONVERSATION_TYPE.ONE_TO_ONE);
      expect(conversationEntity.name()).toBe('Florian@Staging11');

      const showCallControls = ConversationFilter.showCallControls(conversationEntity, false);
      expect(showCallControls).toBeTruthy();
    });
  });
});
