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

import {getGrid} from 'src/script/calling/videoGridHandler';
import {Participant} from 'src/script/calling/Participant';
import {Call} from 'src/script/calling/Call';
import {CONV_TYPE} from '@wireapp/avs';
import {User} from 'src/script/entity/User';

describe('videoGridHandler', () => {
  let participants;

  beforeEach(() => {
    participants = [
      generateVideoParticipant('one'),
      generateVideoParticipant('two'),
      generateVideoParticipant('three'),
      generateVideoParticipant('four'),
    ];
  });

  describe('getGrid', () => {
    describe('people leaving call', () => {
      it('removes people from the grid', () => {
        const tests = [
          {
            expected: [participants[0]],
            newParticipants: [participants[0]],
            oldParticipants: [participants[0], participants[1]],
            scenario: 'second participant (of 2) leaves',
          },
          {
            expected: [participants[0], participants[2]],
            newParticipants: [participants[0], participants[2]],
            oldParticipants: [participants[0], participants[1], participants[2]],
            scenario: 'second participant (of 3) leaves',
          },
          {
            expected: [participants[0], participants[2], participants[3]],
            newParticipants: [participants[0], participants[2], participants[3]],
            oldParticipants: [participants[0], participants[1], participants[2], participants[3]],
            scenario: 'second participant (of 4) leaves',
          },
          {
            expected: [participants[0], participants[3]],
            newParticipants: [participants[0], participants[3]],
            oldParticipants: [participants[0], participants[3], participants[2]],
            scenario: 'one participant leaves one column empty',
          },
        ];

        const participantsObs = ko.observable([]);
        const selfUser = new User();
        selfUser.isMe = true;
        const selfParticipant = new Participant(selfUser, 'selfdevice');
        const call = new Call('', '', undefined, selfParticipant);
        call.participants = participantsObs;
        const grid = getGrid(call);
        tests.forEach(({oldParticipants, newParticipants, expected, scenario}) => {
          participantsObs([selfParticipant, ...oldParticipants]);
          participantsObs([selfParticipant, ...newParticipants]);

          expect(grid().grid.map(toParticipantId)).toEqual(expected.map(toParticipantId), scenario);
        });
      });
    });

    describe('self user with video', () => {
      it('places the self user in the thumbnail if the call is one to one', () => {
        const selfParticipant = generateVideoParticipant('self', true);
        const call = new Call('', '', CONV_TYPE.ONEONONE, selfParticipant);
        call.addParticipant(participants[0]);
        const grid = getGrid(call);

        expect(grid().grid.map(toParticipantId)).toEqual([participants[0]].map(toParticipantId));

        expect(grid().thumbnail).toBe(selfParticipant);
      });

      it('places the self user in the grid if the call is a group call with just one other participant', () => {
        const selfParticipant = generateVideoParticipant('self', true);
        const call = new Call('', '', CONV_TYPE.GROUP, selfParticipant);
        call.addParticipant(participants[0]);
        const grid = getGrid(call);

        expect(grid().grid.map(toParticipantId)).toEqual([selfParticipant, participants[0]].map(toParticipantId));

        expect(grid().thumbnail).toBe(null);
      });

      it('places the self user in the grid if there are no other video participants', () => {
        const selfParticipant = generateVideoParticipant('self', true);
        const call = new Call('', '', CONV_TYPE.GROUP, selfParticipant);
        const grid = getGrid(call);

        expect(grid().grid.map(toParticipantId)).toEqual([selfParticipant].map(toParticipantId));

        expect(grid().thumbnail).toBe(null);
      });

      it('places the self user in the grid if there are more than 1 other participant', () => {
        const selfParticipant = generateVideoParticipant('self', true);
        const call = new Call('', '', CONV_TYPE.GROUP, selfParticipant);
        call.addParticipant(participants[0]);
        call.addParticipant(participants[1]);
        const grid = getGrid(call);

        expect(grid().grid.map(toParticipantId)).toEqual(
          [selfParticipant, participants[0], participants[1]].map(toParticipantId),
        );

        expect(grid().thumbnail).toBe(null);
      });
    });
  });

  function generateVideoParticipant(id, isMe = false) {
    const user = new User(id);
    user.isMe = isMe;
    const participant = new Participant(user, 'deviceid');
    participant.hasActiveVideo = () => true;
    return participant;
  }

  function toParticipantId(participant) {
    return participant && participant.user.id;
  }
});
