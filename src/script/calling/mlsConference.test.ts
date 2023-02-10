/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {MLSService} from '@wireapp/core/lib/messagingProtocols/mls';

import {getSubconversationEpochInfo, subscribeToEpochUpdates} from './mlsConference';

const mockMLSService = {
  joinConferenceSubconversation: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  getGroupIdFromConversationId: jest.fn(),
  renewKeyMaterial: jest.fn(),
  getClientIds: jest.fn(() => Promise.resolve([])),
  getEpoch: jest.fn(() => Promise.resolve([])),
  exportSecretKey: jest.fn(() => Promise.resolve([])),
} as unknown as MLSService;

const conversationId = {domain: 'example.com', id: 'conversation1'};
const keyLength = 32;

const MOCK_GROUP_ID = {
  PARENT_GROUP: 'parentGroupId',
  SUB_GROUP: 'subGroupId',
};

const mockGetClientIdsResponses = {
  [MOCK_GROUP_ID.PARENT_GROUP]: [
    {userId: 'userId1', clientId: 'clientId1', domain: 'example.com'},
    {userId: 'userId1', clientId: 'clientId1A', domain: 'example.com'},
    {userId: 'userId2', clientId: 'clientId2', domain: 'example.com'},
    {userId: 'userId2', clientId: 'clientId2A', domain: 'example.com'},
    {userId: 'userId3', clientId: 'clientId3', domain: 'example.com'},
  ],
  [MOCK_GROUP_ID.SUB_GROUP]: [
    {userId: 'userId1', clientId: 'clientId1', domain: 'example.com'},
    {userId: 'userId1', clientId: 'clientId1A', domain: 'example.com'},
    {userId: 'userId2', clientId: 'clientId2', domain: 'example.com'},
  ],
};

const expectedMemberListResult = [
  {
    userid: 'userId1@example.com',
    clientid: 'clientId1',
    in_subconv: true,
  },
  {
    userid: 'userId1@example.com',
    clientid: 'clientId1A',
    in_subconv: true,
  },
  {
    userid: 'userId2@example.com',
    clientid: 'clientId2',
    in_subconv: true,
  },
  {
    userid: 'userId2@example.com',
    clientid: 'clientId2A',
    in_subconv: false,
  },
  {
    userid: 'userId3@example.com',
    clientid: 'clientId3',
    in_subconv: false,
  },
];

const mockSecretKey = 'secretKey';
const mockEpochNumber = 1;

jest
  .spyOn(mockMLSService, 'getGroupIdFromConversationId')
  .mockImplementation((_conversationId, subconversationId) =>
    subconversationId ? Promise.resolve(MOCK_GROUP_ID.SUB_GROUP) : Promise.resolve(MOCK_GROUP_ID.PARENT_GROUP),
  );

jest
  .spyOn(mockMLSService, 'getClientIds')
  .mockImplementation((groupId: string) =>
    Promise.resolve(mockGetClientIdsResponses[groupId as keyof typeof mockGetClientIdsResponses]),
  );

jest.spyOn(mockMLSService, 'getEpoch').mockImplementation(() => Promise.resolve(1));

jest.spyOn(mockMLSService, 'exportSecretKey').mockResolvedValue(mockSecretKey);

jest
  .spyOn(mockMLSService, 'joinConferenceSubconversation')
  .mockResolvedValue({epoch: mockEpochNumber, groupId: MOCK_GROUP_ID.SUB_GROUP});

describe('getSubconversationEpochInfo', () => {
  it('returns subconversation epoch info with mapped members', async () => {
    const result = await getSubconversationEpochInfo({mlsService: mockMLSService}, conversationId);
    expect(mockMLSService.renewKeyMaterial).not.toHaveBeenCalled();

    expect(result).toEqual({
      epoch: mockEpochNumber,
      keyLength,
      secretKey: mockSecretKey,
      members: expectedMemberListResult,
    });
  });

  it('advances epoch number when param is passed', async () => {
    await getSubconversationEpochInfo({mlsService: mockMLSService}, conversationId, true);
    expect(mockMLSService.renewKeyMaterial).toHaveBeenCalledWith(MOCK_GROUP_ID.SUB_GROUP);
  });
});

describe('subscribeToEpochUpdates', () => {
  it('subscribes to epoch updates and runs callback with initial epoch state', async () => {
    const mockCallback = jest.fn();
    await subscribeToEpochUpdates({mlsService: mockMLSService}, conversationId, mockCallback);

    //we started subscribing to newEpoch event
    expect(mockMLSService.on).toHaveBeenCalledWith('newEpoch', expect.any(Function));

    //we called the callback with initial epoch number
    expect(mockCallback).toHaveBeenCalledWith({
      epoch: mockEpochNumber,
      keyLength,
      secretKey: mockSecretKey,
      members: expectedMemberListResult,
    });
  });

  it('unsubscribes to epoch updates', async () => {
    const mockCallback = jest.fn();
    const unsubscribe = await subscribeToEpochUpdates({mlsService: mockMLSService}, conversationId, mockCallback);

    //we started subscribing to newEpoch event
    expect(mockMLSService.on).toHaveBeenCalledWith('newEpoch', expect.any(Function));

    unsubscribe();
    expect(mockMLSService.off).toHaveBeenCalledWith('newEpoch', expect.any(Function));
  });
});
