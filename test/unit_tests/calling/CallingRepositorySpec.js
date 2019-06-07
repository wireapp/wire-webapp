/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import UUID from 'uuidjs';
import {Participant} from 'src/script/calling/Participant';
import {Call} from 'src/script/calling/Call';
import {User} from 'src/script/entity/User';
import {CONV_TYPE, CALL_TYPE, STATE as CALL_STATE} from '@wireapp/avs';
import {WebAppEvents} from 'src/script/event/WebApp';
import {ModalsViewModel} from 'src/script/view_model/ModalsViewModel';

describe('CallingRepository', () => {
  const testFactory = new TestFactory();
  let callingRepository;
  let wCall;
  let wUser;
  const selfUser = new User(genUUID());
  const clientId = genUUID();

  beforeEach(() => {
    return testFactory.exposeCallingActors().then(injectedCallingRepository => {
      callingRepository = injectedCallingRepository;
      return callingRepository.initAvs(selfUser, clientId).then(avsApi => {
        wCall = avsApi.wCall;
        wUser = avsApi.wUser;
      });
    });
  });

  describe('startCall', () => {
    it('warns the user that there is an ongoing call before starting a new one', done => {
      const activeCall = new Call(selfUser.id, genUUID(), CONV_TYPE.ONEONONE, new Participant(), CALL_TYPE.NORMAL);
      activeCall.state(CALL_STATE.MEDIA_ESTAB);
      spyOn(callingRepository, 'activeCalls').and.returnValue([activeCall]);
      spyOn(amplify, 'publish').and.returnValue(undefined);
      const conversationId = genUUID();
      const conversationType = CONV_TYPE.ONEONONE;
      const callType = CALL_TYPE.NORMAL;
      spyOn(wCall, 'start');
      callingRepository.startCall(conversationId, conversationType, callType).catch(done);
      setTimeout(() => {
        expect(amplify.publish).toHaveBeenCalledWith(
          WebAppEvents.WARNING.MODAL,
          ModalsViewModel.TYPE.CONFIRM,
          jasmine.any(Object)
        );

        expect(wCall.start).not.toHaveBeenCalled();
        done();
      }, 10);
    });

    it('starts a normal call in a 1:1 conversation', () => {
      const conversationId = genUUID();
      const conversationType = CONV_TYPE.ONEONONE;
      const callType = CALL_TYPE.NORMAL;
      spyOn(wCall, 'start');
      return callingRepository.startCall(conversationId, conversationType, callType).then(() => {
        expect(wCall.start).toHaveBeenCalledWith(wUser, conversationId, conversationType, callType, 0);
      });
    });
  });
});

function genUUID() {
  return UUID.genV4().hexString;
}
