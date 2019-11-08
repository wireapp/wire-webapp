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
    describe('people joining call', () => {
      it('computes a new grid', () => {
        const tests = [
          {
            expected: [participants[0], null, null, null],
            participants: [participants[0]],
            scenario: 'dispatches a single initial participant',
          },
          {
            expected: [participants[0], null, participants[1], null],
            participants: [participants[0], participants[1]],
            scenario: 'dispatches two initial participants',
          },
          {
            expected: [participants[0], null, participants[1], participants[2]],
            participants: [participants[0], participants[1], participants[2]],
            scenario: 'dispatches three initial participants',
          },
          {
            expected: [participants[0], participants[3], participants[1], participants[2]],
            participants: [participants[0], participants[1], participants[2], participants[3]],
            scenario: 'dispatches four initial participants',
          },
          {
            expected: [participants[0], null, participants[1], null],
            participants: [participants[0], participants[1]],
            scenario: 'second participant joins',
          },
          {
            expected: [participants[0], null, participants[1], participants[2]],
            participants: [participants[0], participants[1], participants[2]],
            scenario: 'third participant joins',
          },
        ];

        tests.forEach(({participants: participantList, expected, scenario}) => {
          const grid = getGrid(ko.observable(participantList), new Participant('self', 'selfdevice'));

          expect(grid().grid.map(toParticipantId)).toEqual(expected.map(toParticipantId), scenario);
        });
      });
    });

    describe('people leaving call', () => {
      it('removes people from the grid', () => {
        const tests = [
          {
            expected: [participants[0], null, null, null],
            newParticipants: [participants[0]],
            oldParticipants: [participants[0], participants[1]],
            scenario: 'second participant (of 2) leaves',
          },
          {
            expected: [participants[0], null, participants[2], null],
            newParticipants: [participants[0], participants[2]],
            oldParticipants: [participants[0], participants[1], participants[2]],
            scenario: 'second participant (of 3) leaves',
          },
          {
            expected: [participants[0], null, participants[2], participants[3]],
            newParticipants: [participants[0], participants[2], participants[3]],
            oldParticipants: [participants[0], participants[1], participants[2], participants[3]],
            scenario: 'second participant (of 4) leaves',
          },
          {
            expected: [participants[0], null, participants[3], null],
            newParticipants: [participants[0], participants[3]],
            oldParticipants: [participants[0], participants[3], participants[2]],
            scenario: 'one participant leaves one column empty',
          },
        ];

        const participantsObs = ko.observable([]);
        const grid = getGrid(participantsObs, new Participant('self', 'selfdevice'));
        tests.forEach(({oldParticipants, newParticipants, expected, scenario}) => {
          participantsObs(oldParticipants);
          participantsObs(newParticipants);

          expect(grid().grid.map(toParticipantId)).toEqual(expected.map(toParticipantId), scenario);
        });
      });
    });

    describe('self user with video', () => {
      it('places the self user in the thumbnail if there is only one other participant', () => {
        const selfUser = generateVideoParticipant('self');

        const grid = getGrid(ko.observable([participants[0]]), selfUser);

        expect(grid().grid.map(toParticipantId)).toEqual([participants[0], null, null, null].map(toParticipantId));
        expect(grid().thumbnail).toBe(selfUser);
      });

      it('places the self user in the grid if there are no other video participants', () => {
        const selfUser = generateVideoParticipant('self');

        const grid = getGrid(ko.observable([]), selfUser);

        expect(grid().grid.map(toParticipantId)).toEqual([selfUser, null, null, null].map(toParticipantId));
        expect(grid().thumbnail).toBe(null);
      });

      it('places the self user in the grid if there are more than 1 other participant', () => {
        const selfUser = generateVideoParticipant('self');

        const grid = getGrid(ko.observable([participants[0], participants[1]]), selfUser);

        expect(grid().grid.map(toParticipantId)).toEqual(
          [selfUser, null, participants[0], participants[1]].map(toParticipantId),
        );

        expect(grid().thumbnail).toBe(null);
      });
    });
  });

  function generateVideoParticipant(id) {
    const participant = new Participant(id, 'deviceid');
    participant.hasActiveVideo = () => true;
    return participant;
  }

  function toParticipantId(participant) {
    return participant && participant.userId;
  }
});
