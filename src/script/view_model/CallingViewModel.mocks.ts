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

import {QualifiedId} from '@wireapp/api-client/lib/user';
import ko from 'knockout';
import {container} from 'tsyringe';

import {CALL_TYPE, CONV_TYPE} from '@wireapp/avs';

import {CallingViewModel} from './CallingViewModel';

import {Call} from '../calling/Call';
import {CallingRepository} from '../calling/CallingRepository';
import {CallState} from '../calling/CallState';
import {Core} from '../service/CoreSingleton';

export const mockCallingRepository = {
  startCall: jest.fn(),
  answerCall: jest.fn(),
  onIncomingCall: jest.fn(),
  onRequestClientsCallback: jest.fn(),
  onRequestNewEpochCallback: jest.fn(),
  onCallParticipantChangedCallback: jest.fn(),
  onCallClosed: jest.fn(),
  leaveCall: jest.fn(),
  setEpochInfo: jest.fn(),
} as unknown as CallingRepository;

export const callState = new CallState();

export function buildCall(conversationId: QualifiedId, convType = CONV_TYPE.ONEONONE) {
  const qualifiedId = typeof conversationId === 'string' ? {id: conversationId, domain: ''} : conversationId;
  return new Call({id: 'user1', domain: ''}, qualifiedId, convType, {} as any, CALL_TYPE.NORMAL, {
    currentAvailableDeviceId: {audiooutput: ko.observable()},
  } as any);
}

const mockCore = container.resolve(Core);

export function buildCallingViewModel() {
  const callingViewModel = new CallingViewModel(
    mockCallingRepository,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    undefined,
    callState,
    undefined,
    mockCore,
  );

  return callingViewModel;
}

export const prepareMLSConferenceMocks = (parentGroupId: string, subGroupId: string) => {
  const mockGetClientIdsResponses = {
    [parentGroupId]: [
      {userId: 'userId1', clientId: 'clientId1', domain: 'example.com'},
      {userId: 'userId1', clientId: 'clientId1A', domain: 'example.com'},
      {userId: 'userId2', clientId: 'clientId2', domain: 'example.com'},
      {userId: 'userId2', clientId: 'clientId2A', domain: 'example.com'},
      {userId: 'userId3', clientId: 'clientId3', domain: 'example.com'},
    ],
    [subGroupId]: [
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
    .spyOn(mockCore.service!.mls!, 'joinConferenceSubconversation')
    .mockResolvedValue({epoch: mockEpochNumber, groupId: subGroupId});

  jest
    .spyOn(mockCore.service!.mls!, 'getGroupIdFromConversationId')
    .mockImplementation((_conversationId, subconversationId) =>
      subconversationId ? Promise.resolve(subGroupId) : Promise.resolve(parentGroupId),
    );

  jest
    .spyOn(mockCore.service!.mls!, 'getClientIds')
    .mockImplementation(groupId =>
      Promise.resolve(mockGetClientIdsResponses[groupId as keyof typeof mockGetClientIdsResponses]),
    );

  jest.spyOn(mockCore.service!.mls!, 'getEpoch').mockImplementation(() => Promise.resolve(mockEpochNumber));

  jest.spyOn(mockCore.service!.mls!, 'exportSecretKey').mockResolvedValue(mockSecretKey);

  let callClosedCallback: (conversationId: QualifiedId, callType: CONV_TYPE) => void;

  jest.spyOn(mockCallingRepository, 'onCallClosed').mockImplementation(callback => (callClosedCallback = callback));
  jest
    .spyOn(mockCallingRepository, 'leaveCall')
    .mockImplementation(conversationId => callClosedCallback(conversationId, CONV_TYPE.CONFERENCE_MLS));

  return {expectedMemberListResult, mockSecretKey, mockEpochNumber};
};
