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
  rejectCall: jest.fn(),
  setEpochInfo: jest.fn(),
  supportsConferenceCalling: true,
} as unknown as CallingRepository;

export const callState = new CallState();

export function buildCall(conversationId: QualifiedId, convType = CONV_TYPE.ONEONONE) {
  const qualifiedId = typeof conversationId === 'string' ? {id: conversationId, domain: ''} : conversationId;
  return new Call({id: 'user1', domain: ''}, qualifiedId, convType, {} as any, CALL_TYPE.NORMAL, {
    currentAvailableDeviceId: {audiooutput: ko.observable()},
  } as any);
}

export function buildCallingViewModel() {
  const mockCore = container.resolve(Core);
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
  );

  return [callingViewModel, {core: mockCore}] as const;
}
