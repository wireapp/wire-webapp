/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import {STATE as CALL_STATE} from '@wireapp/avs';
import {createRandomUuid} from 'Util/util';

import {instantiateComponent} from '../../../helper/knockoutHelpers';
import {Call} from 'src/script/calling/Call';
import {Participant} from 'src/script/calling/Participant';
import {Conversation} from 'src/script/entity/Conversation';
import 'src/script/components/list/conversationListCallingCell';
import {User} from 'src/script/entity/User';

function createCall(state, selfUser = new User(createRandomUuid())) {
  const selfParticipant = new Participant(selfUser);
  const call = new Call('', '', undefined, selfParticipant);
  call.state(state);
  return call;
}

describe('conversationListCallingCell', () => {
  let defaultParams;

  beforeEach(() => {
    jasmine.clock().install();
    const mockedCallingRepository = {
      isMuted: () => false,
      supportsScreenSharing: () => true,
    };
    const conversation = new Conversation();
    conversation.participating_user_ets([new User('id')]);
    defaultParams = {
      call: new Call(),
      callActions: {},
      callingRepository: mockedCallingRepository,
      conversation: () => conversation,
      hasAccessToCamera: () => true,
      multitasking: {isMinimized: () => false},
      videoGrid: () => ({grid: []}),
    };
  });

  afterEach(() => {
    jasmine.clock().uninstall();
  });

  it('displays an incoming ringing call', () => {
    const call = createCall(CALL_STATE.INCOMING);
    const params = {...defaultParams, call};
    return instantiateComponent('conversation-list-calling-cell', params).then(domContainer => {
      expect(domContainer.querySelector('[data-uie-name=do-call-controls-call-accept]')).not.toBe(null);
      expect(domContainer.querySelector('[data-uie-name=do-call-controls-call-decline]')).not.toBe(null);
    });
  });

  it('displays an outgoing ringing call', () => {
    const call = createCall(CALL_STATE.OUTGOING);
    const params = {...defaultParams, call};
    return instantiateComponent('conversation-list-calling-cell', params).then(domContainer => {
      expect(domContainer.querySelector('[data-uie-name=call-label-outgoing]')).not.toBe(null);
    });
  });

  it('displays a call that is connecting', () => {
    const call = createCall(CALL_STATE.ANSWERED);
    const params = {...defaultParams, call};
    return instantiateComponent('conversation-list-calling-cell', params).then(domContainer => {
      expect(domContainer.querySelector('[data-uie-name=call-label-connecting]')).not.toBe(null);
    });
  });

  it('displays the running time of an ongoing call', () => {
    const conversation = new Conversation();
    spyOn(conversation, 'supportsVideoCall').and.returnValue(true);
    const selfUserEntity = new User(createRandomUuid());
    selfUserEntity.isMe = true;
    conversation.selfUser(selfUserEntity);
    const call = createCall(CALL_STATE.MEDIA_ESTAB, selfUserEntity);
    const mockedTeamRepository = {
      isExternal: () => false,
    };
    const params = {...defaultParams, call, conversation: () => conversation, teamRepository: mockedTeamRepository};
    return instantiateComponent('conversation-list-calling-cell', params).then(domContainer => {
      call.startedAt(Date.now());
      const callDurationElement = domContainer.querySelector('[data-uie-name=call-duration]');

      expect(callDurationElement).not.toBe(null);
      expect(callDurationElement.innerText).toBe('00:00');

      jasmine.clock().mockDate(10000);
      jasmine.clock().tick(10000);

      expect(callDurationElement.innerText).toBe('00:10');
    });
  });
});
