/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {CONVERSATION_PROTOCOL} from '@wireapp/api-client/lib/team';

import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import type {Translate} from 'Util/localizerUtil';
import {translateForTest} from 'Util/test/translateForTest';

import {ACCESS_STATE} from './AccessState';
import {ConversationStateHandler} from './ConversationStateHandler';
import type {ConversationService} from './ConversationService';

import {Conversation} from '../entity/Conversation';

function buildHandler() {
  const conversationService: jest.Mocked<Pick<ConversationService, 'deleteConversationCode' | 'putConversationAccess'>> = {
    deleteConversationCode: jest.fn(),
    putConversationAccess: jest.fn(),
  };
  const translate = jest.fn((key: Parameters<Translate>[0]) => `translated:${key}`) as Translate;
  const handler = new ConversationStateHandler(conversationService as unknown as ConversationService, translate);

  return {conversationService, translate, handler};
}

function buildConversation(inTeam: boolean) {
  const conversation = new Conversation('conversation-id', 'wire.com', CONVERSATION_PROTOCOL.PROTEUS, translateForTest);
  (conversation as any).inTeam = jest.fn(() => inTeam);
  return conversation;
}

describe('ConversationStateHandler', () => {
  const originalPrimaryModalShow = PrimaryModal.show;
  let primaryModalShow: jest.Mock;

  beforeEach(() => {
    primaryModalShow = jest.fn();
    PrimaryModal.show = primaryModalShow;
  });

  afterEach(() => {
    PrimaryModal.show = originalPrimaryModalShow;
  });

  describe('changeAccessState', () => {
    it.each([
      [ACCESS_STATE.TEAM.TEAM_ONLY, ACCESS_STATE.TEAM.SERVICES],
      [ACCESS_STATE.TEAM.SERVICES, ACCESS_STATE.TEAM.TEAM_ONLY],
    ])('does not revoke an access code when toggling apps from %s to %s', async (previousState, nextState) => {
      const {conversationService, translate, handler} = buildHandler();
      const conversation = buildConversation(true);
      conversation.accessState(previousState);

      await handler.changeAccessState(conversation, nextState);

      expect(conversationService.deleteConversationCode).not.toHaveBeenCalled();
      expect(conversationService.putConversationAccess).toHaveBeenCalled();
      expect(translate).not.toHaveBeenCalledWith('modalConversationGuestOptionsRevokeCodeMessage');
      expect(conversation.accessState()).toBe(nextState);
    });

    it('revokes the access code when disabling guest access', async () => {
      const {conversationService, handler} = buildHandler();
      const conversation = buildConversation(true);
      conversation.accessState(ACCESS_STATE.TEAM.GUEST_ROOM);
      conversation.accessCode('access-code');

      await handler.changeAccessState(conversation, ACCESS_STATE.TEAM.TEAM_ONLY);

      expect(conversationService.deleteConversationCode).toHaveBeenCalledWith('conversation-id');
      expect(conversation.accessCode()).toBe('');
      expect(conversationService.putConversationAccess).toHaveBeenCalled();
    });

    it('shows the app allow-failure modal with the app translation key when granting service access fails', async () => {
      const {conversationService, translate, handler} = buildHandler();
      conversationService.putConversationAccess.mockRejectedValue(new Error('Expected unit test error'));
      const conversation = buildConversation(true);
      conversation.accessState(ACCESS_STATE.TEAM.TEAM_ONLY);

      await handler.changeAccessState(conversation, ACCESS_STATE.TEAM.SERVICES);

      expect(translate).toHaveBeenCalledWith('modalConversationOptionsAllowAppMessage');
      expect(primaryModalShow).toHaveBeenCalledWith(
        PrimaryModal.type.ACKNOWLEDGE,
        expect.objectContaining({
          text: expect.objectContaining({message: 'translated:modalConversationOptionsAllowAppMessage'}),
        }),
        undefined,
        translate,
      );
    });

    it('shows the app disable-failure modal with the app translation key when revoking service access fails', async () => {
      const {conversationService, translate, handler} = buildHandler();
      conversationService.putConversationAccess.mockRejectedValue(new Error('Expected unit test error'));
      const conversation = buildConversation(true);
      conversation.accessState(ACCESS_STATE.TEAM.SERVICES);

      await handler.changeAccessState(conversation, ACCESS_STATE.TEAM.TEAM_ONLY);

      expect(translate).toHaveBeenCalledWith('modalConversationOptionsDisableAppMessage');
      expect(primaryModalShow).toHaveBeenCalledWith(
        PrimaryModal.type.ACKNOWLEDGE,
        expect.objectContaining({
          text: expect.objectContaining({message: 'translated:modalConversationOptionsDisableAppMessage'}),
        }),
        undefined,
        translate,
      );
    });

    it('shows the guest allow-failure modal with the guest translation key when granting guest access fails', async () => {
      const {conversationService, translate, handler} = buildHandler();
      conversationService.putConversationAccess.mockRejectedValue(new Error('Expected unit test error'));
      const conversation = buildConversation(true);
      conversation.accessState(ACCESS_STATE.TEAM.TEAM_ONLY);

      await handler.changeAccessState(conversation, ACCESS_STATE.TEAM.GUEST_ROOM);

      expect(translate).toHaveBeenCalledWith('modalConversationOptionsAllowGuestMessage');
      expect(primaryModalShow).toHaveBeenCalledWith(
        PrimaryModal.type.ACKNOWLEDGE,
        expect.objectContaining({
          text: expect.objectContaining({message: 'translated:modalConversationOptionsAllowGuestMessage'}),
        }),
        undefined,
        translate,
      );
    });

    it('shows the app toggle modal with the app translation key when the conversation is not part of a team', async () => {
      const {conversationService, translate, handler} = buildHandler();
      const conversation = buildConversation(false);
      conversation.accessState(ACCESS_STATE.TEAM.TEAM_ONLY);

      await handler.changeAccessState(conversation, ACCESS_STATE.TEAM.SERVICES);

      expect(conversationService.putConversationAccess).not.toHaveBeenCalled();
      expect(translate).toHaveBeenCalledWith('modalConversationOptionsToggleAppMessage');
      expect(primaryModalShow).toHaveBeenCalledWith(
        PrimaryModal.type.ACKNOWLEDGE,
        expect.objectContaining({
          text: expect.objectContaining({message: 'translated:modalConversationOptionsToggleAppMessage'}),
        }),
        undefined,
        translate,
      );
    });
  });
});
