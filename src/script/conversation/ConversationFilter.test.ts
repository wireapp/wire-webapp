import {Conversation} from '../entity/Conversation';
import {ConversationFilter} from './ConversationFilter';
import {ConversationDatabaseData, ConversationMapper} from './ConversationMapper';
import {ConversationStatus} from './ConversationStatus';
import {CONVERSATION_ACCESS, CONVERSATION_ACCESS_ROLE, CONVERSATION_TYPE} from '@wireapp/api-client/src/conversation';

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
        archived_timestamp: 0,
        cleared_timestamp: 0,
        creator: '077f0600-4ee6-4b9c-84e6-2795d6cbef0a',
        domain: '',
        ephemeral_timer: null,
        global_message_timer: null,
        id: '796161e1-a319-41e3-9b33-2b3ab0b3b87a',
        is_guest: false,
        is_managed: false,
        last_event_timestamp: 9,
        last_read_timestamp: 0,
        last_server_timestamp: 9,
        legal_hold_status: 1,
        muted_state: 0,
        muted_timestamp: 0,
        name: 'Florian@Staging11',
        others: ['71e25be1-5433-4647-964d-03a5d9e7c970'],
        qualified_others: undefined,
        receipt_mode: null,
        roles: {},
        status: 0,
        team_id: undefined,
        type: 3,
        verification_state: 0,
      };
      const [conversationEntity] = ConversationMapper.mapConversations([conversationData]);
      expect(conversationEntity.is1to1()).toBeFalsy();
      expect(conversationEntity['isTeam1to1']()).toBeFalsy();
      expect(conversationEntity.isGroup()).toBeFalsy();
      expect(conversationEntity.participating_user_ids().length).toBe(1);
      expect(conversationEntity.removed_from_conversation()).toBeFalsy();
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
        access_role: CONVERSATION_ACCESS_ROLE.PRIVATE,
        archived_state: false,
        archived_timestamp: 0,
        cleared_timestamp: 0,
        creator: '077f0600-4ee6-4b9c-84e6-2795d6cbef0a',
        domain: '',
        ephemeral_timer: null,
        global_message_timer: null,
        id: '796161e1-a319-41e3-9b33-2b3ab0b3b87a',
        is_guest: false,
        is_managed: false,
        last_event_timestamp: 4,
        last_read_timestamp: 0,
        last_server_timestamp: 1627916459003,
        legal_hold_status: 1,
        message_timer: null,
        muted_state: 0,
        muted_timestamp: 0,
        name: 'Florian@Staging11',
        others: ['71e25be1-5433-4647-964d-03a5d9e7c970'],
        qualified_others: undefined,
        receipt_mode: null,
        roles: {
          '077f0600-4ee6-4b9c-84e6-2795d6cbef0a': 'wire_admin',
          '71e25be1-5433-4647-964d-03a5d9e7c970': 'wire_admin',
        },
        status: 0,
        team_id: null,
        type: 2,
        verification_state: 0,
      };
      const [conversationEntity] = ConversationMapper.mapConversations([conversationData]);
      expect(conversationEntity.is1to1()).toBeTruthy();
      expect(conversationEntity['isTeam1to1']()).toBeFalsy();
      expect(conversationEntity.isGroup()).toBeFalsy();
      expect(conversationEntity.participating_user_ids().length).toBe(1);
      expect(conversationEntity.removed_from_conversation()).toBeFalsy();
      expect(conversationEntity.status()).toBe(ConversationStatus.CURRENT_MEMBER);
      expect(conversationEntity.type()).toBe(CONVERSATION_TYPE.ONE_TO_ONE);
      expect(conversationEntity.name()).toBe('Florian@Staging11');

      const showCallControls = ConversationFilter.showCallControls(conversationEntity, false);
      expect(showCallControls).toBeTruthy();
    });
  });
});
