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
import {getGrid, updateVideoGrid} from './videoGridHandler';
import {Call} from 'Repositories/calling/Call';
import {CALL_TYPE, CONV_TYPE} from '@wireapp/avs';
import {buildMediaDevicesHandler} from '../../auth/util/test/TestUtil';
import {User} from 'Repositories/entity/User';
import {createUuid} from 'Util/uuid';
import {Conversation} from 'Repositories/entity/Conversation';
import {Participant} from 'Repositories/calling/Participant';
import {createConversationForTest} from 'Util/test/createConversationForTest';
import {translateForTest} from 'Util/test/translateForTest';
import {CONVERSATION_PROTOCOL} from '@wireapp/api-client/lib/team';

describe('videoGridHandler', () => {
  const createCall = () => {
    const selfUser = new User(createUuid());

    return new Call(
      {domain: '', id: ''},
      createConversationForTest('', '', CONVERSATION_PROTOCOL.PROTEUS, translateForTest),
      CONV_TYPE.CONFERENCE,
      new Participant(selfUser, ''),
      CALL_TYPE.NORMAL,
      buildMediaDevicesHandler(),
    );
  };

  const createParticipant = (name: string) => {
    const user = new User(createUuid());
    user.name(name);

    return new Participant(user, `client-${name}`);
  };

  describe('getGrid', () => {
    it('does not crash when call is undefined', () => {
      let result;

      expect(() => {
        result = getGrid(undefined);
      }).not.toThrow();

      expect(result).toEqual({
        grid: [],
        thumbnail: null,
      });
    });

    it('returns remote participants and self thumbnail for 1:1 call', () => {
      const call = createCall();

      const selfParticipant = createParticipant('self');
      const remoteParticipant = createParticipant('remote');

      jest.spyOn(call, 'participants').mockReturnValue([selfParticipant, remoteParticipant]);
      jest.spyOn(call, 'getRemoteParticipants').mockReturnValue([remoteParticipant]);
      jest.spyOn(call, 'getSelfParticipant').mockReturnValue(selfParticipant);

      expect(getGrid(call)).toEqual({
        grid: [remoteParticipant],
        thumbnail: selfParticipant,
      });
    });

    it('returns current page participants for group call', () => {
      const call = createCall();

      const participantA = createParticipant('a');
      const participantB = createParticipant('b');
      const participantC = createParticipant('c');

      const page0 = [participantA];
      const page1 = [participantB];

      jest.spyOn(call, 'participants').mockReturnValue([participantA, participantB, participantC]);
      jest.spyOn(call, 'pages').mockReturnValue([page0, page1]);
      jest.spyOn(call, 'currentPage').mockReturnValue(1);

      expect(getGrid(call)).toEqual({
        grid: page1,
        thumbnail: null,
      });
    });

    it('returns empty grid if current page index is out of bounds', () => {
      const call = createCall();

      const participantA = createParticipant('a');
      const participantB = createParticipant('b');
      const participantC = createParticipant('c');

      jest.spyOn(call, 'participants').mockReturnValue([participantA, participantB, participantC]);
      jest.spyOn(call, 'pages').mockReturnValue([]);
      jest.spyOn(call, 'currentPage').mockReturnValue(5);

      expect(getGrid(call)).toEqual({
        grid: [],
        thumbnail: null,
      });
    });

    it('treats missing participants as group call fallback path', () => {
      const call = createCall();

      const fallbackParticipant = createParticipant('fallback');

      jest.spyOn(call, 'participants').mockReturnValue(undefined);
      jest.spyOn(call, 'pages').mockReturnValue([[fallbackParticipant]]);
      jest.spyOn(call, 'currentPage').mockReturnValue(0);

      expect(getGrid(call)).toEqual({
        grid: [fallbackParticipant],
        thumbnail: null,
      });
    });
  });

  describe('updateVideoGrid', () => {
    it('does nothing when call is undefined', () => {
      const setGrid = jest.fn();

      expect(() => updateVideoGrid(undefined, setGrid)).not.toThrow();

      expect(setGrid).not.toHaveBeenCalled();
    });

    it('updates pages and sets the latest grid', () => {
      const call = createCall();

      const participantA = createParticipant('a');
      const participantB = createParticipant('b');
      const participantC = createParticipant('c');

      const grid = [participantA];

      jest.spyOn(call, 'updatePages').mockImplementation(jest.fn());
      jest.spyOn(call, 'participants').mockReturnValue([participantA, participantB, participantC]);
      jest.spyOn(call, 'pages').mockReturnValue([grid]);
      jest.spyOn(call, 'currentPage').mockReturnValue(0);

      const setGrid = jest.fn();

      updateVideoGrid(call, setGrid);

      expect(call.updatePages).toHaveBeenCalled();

      expect(setGrid).toHaveBeenCalledWith({
        grid,
        thumbnail: null,
      });
    });
  });
});
