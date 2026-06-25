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

import ko from 'knockout';

import {DefaultConversationRoleName} from '@wireapp/api-client/lib/conversation';
import {FEATURE_KEY, FEATURE_STATUS} from '@wireapp/api-client/lib/team';

import {useLeaveGroupAdminModalStore} from 'Components/modals/leavegroupadminmodal/useleavegroupadminmodalstore';
import {PrimaryModal} from 'Components/modals/primarymodal';
import {CellsRepository} from 'Repositories/cells/cellsrepository';
import {ConnectionRepository} from 'Repositories/connection/connectionrepository';
import {ConversationRepository} from 'Repositories/conversation/conversationrepository';
import {MessageRepository} from 'Repositories/conversation/messagerepository';
import {User} from 'Repositories/entity/user';
import {IntegrationRepository} from 'Repositories/integration/integrationrepository';
import {SelfRepository} from 'Repositories/self/selfrepository';
import {TeamState} from 'Repositories/team/teamstate';
import {UserState} from 'Repositories/user/userstate';
import {generateConversation} from 'test/helper/ConversationGenerator';
import type {Translate} from 'Util/localizerUtil';
import {translateForTest} from 'Util/test/translatefortest';
import {createUuid} from 'Util/uuid';

import {ActionsViewModel} from './actionsviewmodel';
import {MainViewModel} from './mainviewmodel';
import {UserType} from '@wireapp/api-client/lib/user';

// ─── helpers ────────────────────────────────────────────────────────────────

/** Create a User that passes every eligibility criterion in leaveConversation. */
function makeEligibleUser(id = createUuid()): User {
  const user = new User(id, 'example.com', translateForTest);
  user.name('Test User ' + id);
  user.username('testuser.' + id);
  user.isFederated = false;
  user.isService = false;
  user.isTemporaryGuest(false);
  user.type = UserType.REGULAR;
  return user;
}

const featureWithPreventAdminLessGroups = {
  [FEATURE_KEY.PREVENT_ADMIN_LESS_GROUPS]: {status: FEATURE_STATUS.ENABLED},
} as any;

function buildActionsViewModel({
  selfUser = new User('self-id', 'example.com', translateForTest),
  teamFeatures = undefined as any,
  setMemberConversationRole = jest.fn().mockResolvedValue(undefined),
  leaveConversationMock = jest.fn().mockResolvedValue(undefined),
  translate,
}: {
  selfUser?: User;
  teamFeatures?: any;
  setMemberConversationRole?: jest.Mock;
  leaveConversationMock?: jest.Mock;
  translate: Translate;
}) {
  const mockUserState = {self: ko.observable(selfUser)} as unknown as UserState;
  const mockTeamState = {teamFeatures: ko.observable(teamFeatures)} as unknown as TeamState;

  const conversationRepository = {
    leaveConversation: leaveConversationMock,
    clearConversation: jest.fn().mockResolvedValue(undefined),
    conversationRoleRepository: {setMemberConversationRole},
  } as unknown as ConversationRepository;

  const vm = new ActionsViewModel(
    {} as SelfRepository,
    {} as CellsRepository,
    {} as ConnectionRepository,
    conversationRepository,
    {} as IntegrationRepository,
    {} as MessageRepository,
    mockUserState,
    mockTeamState,
    {} as MainViewModel,
    translate,
  );

  return {vm, setMemberConversationRole, leaveConversationMock};
}

// ─── tests ───────────────────────────────────────────────────────────────────

describe('ActionsViewModel.leaveConversation', () => {
  let mockShow: jest.Mock;

  beforeEach(() => {
    mockShow = jest.fn();
    jest.spyOn(useLeaveGroupAdminModalStore, 'getState').mockReturnValue({show: mockShow} as any);
    jest.spyOn(PrimaryModal, 'show').mockImplementation(() => {});
  });

  afterEach(() => jest.restoreAllMocks());

  it('uses the injected translate function for modal copy', () => {
    const selfUser = new User('self-id', 'example.com', translateForTest);
    const userToBlock = makeEligibleUser('blocked-user');
    const translate = jest.fn(
      (translationKey: Parameters<Translate>[0]) => `translated:${translationKey}`,
    ) as Translate;

    const {vm} = buildActionsViewModel({selfUser, translate});

    void vm.blockUser(userToBlock);

    expect(translate).toHaveBeenCalledWith('modalUserBlockAction');
    expect(translate).toHaveBeenCalledWith('modalUserBlockMessage', {user: userToBlock.name()});
    expect(translate).toHaveBeenCalledWith('modalUserBlockHeadline', {user: userToBlock.name()});
    expect(PrimaryModal.show).toHaveBeenCalledWith(
      PrimaryModal.type.CONFIRM,
      expect.objectContaining({
        primaryAction: expect.objectContaining({text: 'translated:modalUserBlockAction'}),
        text: expect.objectContaining({
          message: 'translated:modalUserBlockMessage',
          title: 'translated:modalUserBlockHeadline',
        }),
      }),
      undefined,
      translate,
    );
  });

  describe('feature flag off', () => {
    it('shows the standard PrimaryModal leave flow when PREVENT_ADMIN_LESS_GROUPS is disabled', () => {
      const selfUser = new User('self-id', 'example.com', translateForTest);
      const conversation = generateConversation({users: [makeEligibleUser()]});
      conversation.roles({[selfUser.id]: DefaultConversationRoleName.WIRE_ADMIN});

      const {vm} = buildActionsViewModel({translate: translateForTest, selfUser, teamFeatures: undefined});

      void vm.leaveConversation(conversation);

      expect(PrimaryModal.show).toHaveBeenCalledWith(
        PrimaryModal.type.OPTION,
        expect.any(Object),
        undefined,
        translateForTest,
      );
      expect(mockShow).not.toHaveBeenCalled();
    });
  });

  describe('feature flag on', () => {
    it('shows the standard PrimaryModal leave flow when the self user is not the last admin', () => {
      const selfUser = new User('self-id', 'example.com', translateForTest);
      const otherAdmin = makeEligibleUser('other-admin');
      const conversation = generateConversation({users: [otherAdmin]});
      // Both users are admins → self is NOT the last admin
      conversation.roles({
        [selfUser.id]: DefaultConversationRoleName.WIRE_ADMIN,
        [otherAdmin.id]: DefaultConversationRoleName.WIRE_ADMIN,
      });

      const {vm} = buildActionsViewModel({
        translate: translateForTest,
        selfUser,
        teamFeatures: featureWithPreventAdminLessGroups,
      });

      void vm.leaveConversation(conversation);

      expect(PrimaryModal.show).toHaveBeenCalledWith(
        PrimaryModal.type.OPTION,
        expect.any(Object),
        undefined,
        translateForTest,
      );
      expect(mockShow).not.toHaveBeenCalled();
    });

    it('opens the LeaveGroupAdminModal when the self user is the last admin and eligible users exist', async () => {
      const selfUser = new User('self-id', 'example.com', translateForTest);
      const conversation = generateConversation({users: [makeEligibleUser()]});
      conversation.roles({[selfUser.id]: DefaultConversationRoleName.WIRE_ADMIN});

      const {vm} = buildActionsViewModel({
        translate: translateForTest,
        selfUser,
        teamFeatures: featureWithPreventAdminLessGroups,
      });

      await vm.leaveConversation(conversation);

      expect(mockShow).toHaveBeenCalledTimes(1);
      expect(PrimaryModal.show).not.toHaveBeenCalled();
    });

    it('excludes the self user from the eligible users list passed to the modal', async () => {
      const selfUser = new User('self-id', 'example.com', translateForTest);
      // participating_user_ets never includes self, but add an eligible other user
      const otherUser = makeEligibleUser('other-id');
      const conversation = generateConversation({users: [otherUser]});
      conversation.roles({[selfUser.id]: DefaultConversationRoleName.WIRE_ADMIN});

      const {vm} = buildActionsViewModel({
        translate: translateForTest,
        selfUser,
        teamFeatures: featureWithPreventAdminLessGroups,
      });

      await vm.leaveConversation(conversation);

      const {eligibleUsers} = mockShow.mock.calls[0][0] as {eligibleUsers: User[]};
      expect(eligibleUsers.every(u => u.id !== selfUser.id)).toBe(true);
    });

    it('passes an empty eligibleUsers list to the modal when no participant meets eligibility criteria', async () => {
      const selfUser = new User('self-id', 'example.com', translateForTest);
      // Federated users are ineligible
      const federatedUser = new User('fed-id', 'external.com', translateForTest);
      federatedUser.isFederated = true;
      federatedUser.name('Fed User');
      federatedUser.username('fed.user');
      const conversation = generateConversation({users: [federatedUser]});
      conversation.roles({[selfUser.id]: DefaultConversationRoleName.WIRE_ADMIN});

      const {vm} = buildActionsViewModel({
        translate: translateForTest,
        selfUser,
        teamFeatures: featureWithPreventAdminLessGroups,
      });

      await vm.leaveConversation(conversation);

      const {eligibleUsers} = mockShow.mock.calls[0][0] as {eligibleUsers: User[]};
      expect(eligibleUsers).toHaveLength(0);
    });

    it('assigns the admin role to the selected user before calling leaveConversation', async () => {
      const selfUser = new User('self-id', 'example.com', translateForTest);
      const newAdmin = makeEligibleUser('new-admin-id');
      const conversation = generateConversation({users: [newAdmin]});
      conversation.roles({[selfUser.id]: DefaultConversationRoleName.WIRE_ADMIN});

      const callOrder: string[] = [];
      const setMemberConversationRole = jest.fn().mockImplementation(async () => callOrder.push('setRole'));
      const leaveConversationMock = jest.fn().mockImplementation(async () => callOrder.push('leave'));

      const {vm} = buildActionsViewModel({
        selfUser,
        teamFeatures: featureWithPreventAdminLessGroups,
        setMemberConversationRole,
        leaveConversationMock,
        translate: translateForTest,
      });

      await vm.leaveConversation(conversation);
      const {onLeave} = mockShow.mock.calls[0][0] as {onLeave: (clear: boolean, user: User) => Promise<void>};
      await onLeave(false, newAdmin);

      expect(setMemberConversationRole).toHaveBeenCalledWith(
        conversation,
        newAdmin.qualifiedId,
        DefaultConversationRoleName.WIRE_ADMIN,
      );
      expect(leaveConversationMock).toHaveBeenCalledWith(conversation);
      expect(callOrder).toEqual(['setRole', 'leave']);
    });

    it('does not call leaveConversation when role assignment fails', async () => {
      const selfUser = new User('self-id', 'example.com', translateForTest);
      const newAdmin = makeEligibleUser('new-admin-id');
      const conversation = generateConversation({users: [newAdmin]});
      conversation.roles({[selfUser.id]: DefaultConversationRoleName.WIRE_ADMIN});

      const setMemberConversationRole = jest.fn().mockRejectedValue(new Error('Role assignment failed'));
      const leaveConversationMock = jest.fn().mockResolvedValue(undefined);

      const {vm} = buildActionsViewModel({
        selfUser,
        teamFeatures: featureWithPreventAdminLessGroups,
        setMemberConversationRole,
        leaveConversationMock,
        translate: translateForTest,
      });

      await vm.leaveConversation(conversation);
      const {onLeave} = mockShow.mock.calls[0][0] as {onLeave: (clear: boolean, user: User) => Promise<void>};

      await expect(onLeave(false, newAdmin)).rejects.toThrow('Role assignment failed');
      expect(leaveConversationMock).not.toHaveBeenCalled();
    });
  });
});
