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

'use strict';

window.z = window.z || {};
window.z.components = z.components || {};

z.components.GroupVideoGrid = class GroupVideoGrid {
  constructor(params) {
    this.me = params.me();
    this.participants = ko.pureComputed(() => {
      return params.participants().concat(params.me());
    });

    this.participantsGrid = ko.observableArray([0, 0, 0, 0]);
  }

  /**
   * Will compute the next grid layout according to the previous state and the new array of participants
   * The grid will fill according to this pattern
   * - 1 participant : [id, 0, 0, 0]
   * - 2 participants: [id, 0, id, 0]
   * - 3 participants: [id, 0, id, id]
   * - 4 participants: [id, id, id, id]
   * @param {Array<ParticipantId|0>} previousGrid - the previous state of the grid
   * @param {Array<Participant>} participants - the new array of participants to dispatch in the grid
   *
   * @returns {Array<ParticipantId|0>} the new grid
   */
  computeGrid(previousGrid, participants) {
    const participantIds = participants.map(participant => participant.id);
    const currentParticipants = previousGrid.filter(participantId => participantId !== 0);

    if (currentParticipants.length === 0) {
      // if the current grid is empty, we just dispatch the participants according to this pattern
      return [participantIds[0] || 0, participantIds[3] || 0, participantIds[1] || 0, participantIds[2] || 0];
    }
    const newParticipants = arrayDiff(currentParticipants, participantIds);
    //const deletedParticipants = arrayDiff(participantIds, currentParticipants);

    newParticipants.forEach(participant => {
      const lastAvailableIndex = previousGrid.lastIndexOf(0);
      previousGrid.splice(lastAvailableIndex, 1, participant);
    });

    return normalize(previousGrid);
  }
};

function arrayDiff(a, b) {
  return b.filter(i => a.indexOf(i) === -1);
}

const participantVideo = `
  <div class="participant" data-bind="css: { is_me: participant === $parents[0].me }">
    <span data-bind="text: participant.first_name()"></span>
  </div>
`;

const threeParticipantsLayout = `
  <div class="participant-grid">
    <div class="participant" data-bind="css: { is_me: participants()[0] === $parents[0].me }">
      <span data-bind="text: participants()[0].first_name()"></span>
    </div>
    <div class="participant-v-grid" data-bind="foreach: { data: participants().slice(1), as: 'participant' }">
      ${participantVideo}
    </div>
  </div>
`;

ko.components.register('group-video-grid', {
  template: `
    <!-- ko if: participants().length !== 3 -->
      <div
        class="participant-grid"
        data-bind="foreach: { data: participants, as: 'participant' }, css: {'has-overlay-thumbnail': participants().length === 2}"
      >
        ${participantVideo}
      </div>
    <!-- /ko -->
    <!-- ko if: participants().length === 3 -->
      ${threeParticipantsLayout}
    <!-- /ko -->
  `,
  viewModel: z.components.GroupVideoGrid,
});
