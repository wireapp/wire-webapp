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
 */

import {render} from '@testing-library/react';
import {container} from 'tsyringe';

import {CALL_TYPE, STATE as CALL_STATE} from '@wireapp/avs';
import {CONVERSATION_PROTOCOL} from '@wireapp/api-client/lib/team';

import {Call} from 'Repositories/calling/Call';
import {CallState} from 'Repositories/calling/CallState';
import {Participant} from 'Repositories/calling/Participant';
import {Conversation} from 'Repositories/entity/Conversation';
import {User} from 'Repositories/entity/User';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import type {MainViewModel} from 'src/script/view_model/MainViewModel';
import {buildMediaDevicesHandler} from 'src/script/auth/util/test/testUtil';
import {translateForTest} from 'Util/test/translateForTest';
import {createUuid} from 'Util/uuid';

import {MeetingCallingView} from './meetingCallingView';

const createCall = (): Call => {
  const id = createUuid();
  const selfUser = new User(createUuid(), '', translateForTest);
  const conversation = new Conversation(id, 'example.com', CONVERSATION_PROTOCOL.PROTEUS, translateForTest);
  const call = new Call(
    {domain: 'example.com', id},
    conversation,
    0,
    new Participant(selfUser, createUuid()),
    CALL_TYPE.NORMAL,
    buildMediaDevicesHandler(),
  );
  call.state(CALL_STATE.INCOMING);
  return call;
};

const createMainViewModel = (): MainViewModel =>
  ({
    calling: {
      callActions: {
        answer: jest.fn(),
        reject: jest.fn(),
      },
      callingRepository: {},
      hasAccessToCamera: jest.fn(() => true),
    },
    content: {repositories: {properties: {getPreference: jest.fn()}}},
  }) as unknown as MainViewModel;

describe('MeetingCallingView', () => {
  const callState = container.resolve(CallState);
  const mainViewModel = createMainViewModel();
  const rootProviderWrapper = createRootProviderWrapperForTest(
    createRootContextValueForTest({
      mainViewModel,
      translate: translateForTest,
    }),
  );

  it('renders incoming 1:1, group, and meeting calls', () => {
    const calls = [createCall(), createCall(), createCall()];
    callState.calls(calls);

    const {container: renderedContainer} = render(<MeetingCallingView />, {wrapper: rootProviderWrapper});

    expect(renderedContainer.querySelectorAll('[data-uie-name="item-call"]')).toHaveLength(calls.length);
    expect(renderedContainer.querySelectorAll('[data-uie-name="do-call-controls-call-accept"]')).toHaveLength(
      calls.length,
    );
    expect(renderedContainer.querySelectorAll('[data-uie-name="do-call-controls-call-decline"]')).toHaveLength(
      calls.length,
    );
  });

  it('renders nothing when there are no active calls', () => {
    callState.calls([]);
    const {container: renderedContainer} = render(<MeetingCallingView />, {wrapper: rootProviderWrapper});

    expect(renderedContainer.querySelector('[data-uie-name="meeting-calling-view"]')).toBeNull();
  });
});
