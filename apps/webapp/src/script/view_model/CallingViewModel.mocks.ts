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

import ko from 'knockout';
import {Call} from 'Repositories/calling/Call';
import {CallingRepository} from 'Repositories/calling/CallingRepository';
import {CallState} from 'Repositories/calling/CallState';
import {Conversation} from 'Repositories/entity/Conversation';
import {MediaDevicesHandler} from 'Repositories/media/MediaDevicesHandler';
import {container} from 'tsyringe';

import {CALL_TYPE, CONV_TYPE} from '@wireapp/avs';

import {CallingViewModel} from './CallingViewModel';

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

const mockMediaDevicesHandler = {
  initializeMediaDevices: jest.fn(() => Promise.resolve()),
} as unknown as MediaDevicesHandler;

export const callState = new CallState();

export function buildCall(conversation: Conversation, convType = CONV_TYPE.ONEONONE) {
  return new Call({id: 'user1', domain: ''}, conversation, convType, {} as any, CALL_TYPE.NORMAL, {
    currentAvailableDeviceId: {audiooutput: ko.observable()},
  } as any);
}

export function buildCallingViewModel() {
  const mockCore = container.resolve(Core);
  const callingViewModel = new CallingViewModel(
    mockCallingRepository,
    {} as any,
    mockMediaDevicesHandler,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    callState,
    {} as any,
  );

  return [callingViewModel, {core: mockCore}] as const;
}
