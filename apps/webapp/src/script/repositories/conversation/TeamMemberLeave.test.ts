/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import type {CallingRepository} from 'Repositories/calling/CallingRepository';
import type {ConnectionRepository} from 'Repositories/connection/ConnectionRepository';
import type {ConnectionState} from 'Repositories/connection/ConnectionState';
import type {EventRepository} from 'Repositories/event/EventRepository';
import {EventService} from 'Repositories/event/EventService';
import type {PropertiesRepository} from 'Repositories/properties/PropertiesRepository';
import type {SelfRepository} from 'Repositories/self/SelfRepository';
import type {TeamRepository} from 'Repositories/team/TeamRepository';
import {TeamState} from 'Repositories/team/TeamState';
import type {UserRepository} from 'Repositories/user/UserRepository';
import {UserState} from 'Repositories/user/UserState';
import {generateConversation} from 'test/helper/ConversationGenerator';
import {generateUser} from 'test/helper/UserGenerator';

jest.mock('./EventMapper', () => ({EventMapper: jest.fn().mockReturnValue({})}));

import {ConversationRepository} from './ConversationRepository';
import type {ConversationService} from './ConversationService';
import {ConversationState} from './ConversationState';
import type {MessageRepository} from './MessageRepository';

import {Core} from '../../service/CoreSingleton';
import {serverTimeHandler} from '../../time/serverTimeHandler';

function buildConversationRepository() {
  const teamState = new TeamState();
  const conversationState = new ConversationState();

  const conversationService: jest.Mocked<
    Pick<
      ConversationService,
      | 'deleteConversation'
      | 'deleteConversationFromDb'
      | 'wipeMLSCapableConversation'
      | 'postBots'
      | 'saveConversationStateInDb'
    >
  > = {
    deleteConversation: jest.fn(),
    deleteConversationFromDb: jest.fn(),
    wipeMLSCapableConversation: jest.fn(),
    postBots: jest.fn(),
    saveConversationStateInDb: jest.fn(),
  };

  const messageRepository: jest.Mocked<Pick<MessageRepository, 'setClientMismatchHandler'>> = {
    setClientMismatchHandler: jest.fn(),
  };

  const callingRepository = {} as CallingRepository;

  const connectionRepository: jest.Mocked<Pick<ConnectionRepository, 'setDeleteConnectionRequestConversationHandler'>> =
    {
      setDeleteConnectionRequestConversationHandler: jest.fn(),
    };

  const eventRepository: jest.Mocked<Pick<EventRepository, 'eventService' | 'injectEvent' | 'injectEvents'>> = {
    eventService: new EventService(),
    injectEvent: jest.fn(),
    injectEvents: jest.fn(),
  };

  const selfRepository: jest.Mocked<Pick<SelfRepository, 'on'>> = {
    on: jest.fn(),
  };

  const teamRepository = {} as TeamRepository;

  const userRepository: jest.Mocked<Pick<UserRepository, 'on' | 'getUserById' | 'getUsersById'>> = {
    on: jest.fn(),
    getUserById: jest.fn(),
    getUsersById: jest.fn(),
  };

  const propertiesRepository = {} as PropertiesRepository;
  const userState = new UserState();
  const core = {backendFeatures: {isFederated: false}} as Core;
  const connectionState = {} as ConnectionState;

  const conversationRepository = new ConversationRepository(
    conversationService as unknown as ConversationService,
    messageRepository as unknown as MessageRepository,
    connectionRepository as unknown as ConnectionRepository,
    eventRepository as unknown as EventRepository,
    teamRepository as TeamRepository,
    userRepository as unknown as UserRepository,
    selfRepository as unknown as SelfRepository,
    propertiesRepository,
    callingRepository,
    serverTimeHandler,
    userState,
    teamState,
    conversationState,
    connectionState,
    core,
  );

  return [
    conversationRepository,
    {
      conversationState,
      teamState,
      userState,
      eventRepository,
      callingRepository,
      userRepository,
      teamRepository,
      messageRepository,
      conversationService,
      core,
      serverTimeHandler,
    },
  ] as const;
}

function setupTeamMemberLeaveSpies(
  repo: ConversationRepository,
  eventRepo: jest.Mocked<Pick<EventRepository, 'injectEvent'>>,
) {
  eventRepo.injectEvent.mockResolvedValue(undefined);
  type ClearFn = ConversationRepository['clearUsersFromConversation'];
  const clearSpy = jest.spyOn(repo as unknown as {clearUsersFromConversation: ClearFn}, 'clearUsersFromConversation');
  return {injectSpy: eventRepo.injectEvent, clearSpy};
}

describe('ConversationRepository.teamMemberLeave', () => {
  it('injects team leave events only for eligible conversations and cleans up user everywhere', async () => {
    const [conversationRepository, deps] = buildConversationRepository();
    const userA = generateUser();
    const userB = generateUser();

    deps.userRepository.getUserById.mockResolvedValue(userB);
    deps.userRepository.getUsersById.mockResolvedValue([]);

    const groupInTeamA = generateConversation({users: [userA, userB], overwites: {team_id: 'teamA'}});
    const groupInTeamB = generateConversation({users: [userA, userB], overwites: {team_id: 'teamB'}});

    deps.conversationState.conversations([groupInTeamA, groupInTeamB]);
    const {injectSpy, clearSpy} = setupTeamMemberLeaveSpies(conversationRepository, deps.eventRepository);

    await conversationRepository.teamMemberLeave('teamB', userB.qualifiedId);

    // leave event only for conversations belonging to teamB
    expect(injectSpy).toHaveBeenCalledTimes(1);
    expect(injectSpy).toHaveBeenCalledWith(expect.objectContaining({conversation: groupInTeamB.id}));

    // user is cleared from all conversations
    expect(clearSpy).toHaveBeenCalledTimes(2);
    expect(groupInTeamA.participating_user_ids()).not.toContainEqual(userB.qualifiedId);
    expect(groupInTeamB.participating_user_ids()).not.toContainEqual(userB.qualifiedId);
  });

  it("does nothing when the user doesn't participate in any conversation", async () => {
    const [conversationRepository, deps] = buildConversationRepository();
    const userB = generateUser();
    const otherUser = generateUser();

    deps.userRepository.getUserById.mockResolvedValue(userB);
    deps.userRepository.getUsersById.mockResolvedValue([]);

    jest
      .spyOn(conversationRepository, 'updateParticipatingUserEntities')
      .mockImplementation(async conversation => conversation);

    const conversationWithoutUser = generateConversation({
      users: [otherUser],
      overwites: {team_id: 'teamB'},
    });

    deps.conversationState.conversations([conversationWithoutUser]);

    const {injectSpy, clearSpy} = setupTeamMemberLeaveSpies(conversationRepository, deps.eventRepository);

    await conversationRepository.teamMemberLeave('teamB', userB.qualifiedId);

    expect(injectSpy).not.toHaveBeenCalled();
    expect(clearSpy).not.toHaveBeenCalled();
  });

  it('gracefully handles when there are no conversations', async () => {
    const [conversationRepository, deps] = buildConversationRepository();
    const userB = generateUser();

    deps.userRepository.getUserById.mockResolvedValue(userB);
    deps.userRepository.getUsersById.mockResolvedValue([]);

    deps.conversationState.conversations([]);

    const {injectSpy, clearSpy} = setupTeamMemberLeaveSpies(conversationRepository, deps.eventRepository);

    await conversationRepository.teamMemberLeave('teamB', userB.qualifiedId);

    expect(injectSpy).not.toHaveBeenCalled();
    expect(clearSpy).not.toHaveBeenCalled();
  });
});
