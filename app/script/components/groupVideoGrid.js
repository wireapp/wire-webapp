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

    this.participants = ko.observableArray([]);
    this.participantsGrid = ko.observableArray([0, 0, 0, 0]);
    this.thumbnailVideo = ko.observable();
    this.participants.subscribe(participants => {
      const me = params.me();
      if (participants.length !== 1) {
        participants = participants.concat(me);
        this.thumbnailVideo(null);
      } else {
        this.thumbnailVideo(me);
      }

      const newGrid = this.computeGrid(this.participantsGrid(), participants);
      this.participantsGrid(newGrid);
    });
  }

  /**
   * Will compute the next grid layout according to the previous state and the new array of participants
   * The grid will fill according to this pattern
   * - 1 participant : [id, 0, 0, 0]
   * - 2 participants: [id, 0, id, 0]
   * - 3 participants: [id, 0, id, id]
   * - 3 participants: [id, id, 0, id]
   * - 4 participants: [id, id, id, id]
   * @param {Array<ParticipantId|0>} previousGrid - the previous state of the grid
   * @param {Array<Participant>} participants - the new array of participants to dispatch in the grid
   *
   * @returns {Array<ParticipantId|0>} the new grid
   */
  computeGrid(previousGrid, participants) {
    const participantIds = participants.map(participant => participant.id);
    const currentParticipants = previousGrid.filter(participantId => participantId !== 0);

    const addedParticipants = arrayDiff(currentParticipants, participantIds);
    const deletedParticipants = arrayDiff(participantIds, currentParticipants);

    if (deletedParticipants.length > 0) {
      // if there was some participants that left the call
      // do not reorder the matrix
      const newGrid = previousGrid.map(id => {
        return deletedParticipants.includes(id) ? 0 : id;
      });

      const newParticipants = newGrid.filter(participantId => participantId !== 0);

      if (newParticipants.length === 2) {
        return [newParticipants[0], 0, newParticipants[1], 0];
      }
      return newGrid;
    }

    const newParticipantsList = currentParticipants
      // add the new participants at the and
      .concat(addedParticipants);

    return [
      newParticipantsList[0] || 0,
      newParticipantsList[3] || 0,
      newParticipantsList[1] || 0,
      newParticipantsList[2] || 0,
    ];
  }

  devAdd() {
    this.participants.push({id: Math.floor(Math.random() * 1000)});
  }

  devRemove(id) {
    this.participants.remove(element => element.id === id);
  }

  getClassNameForVideo(index) {
    const baseClass = `video-grid__element${index}`;
    const grid = this.participantsGrid();
    let extraClass = '';
    if (grid[index] === 0) {
      extraClass = 'video-grid__element--empty';
    }
    const isAlone = grid.reduce((alone, value, i) => (i !== index && value !== 0 ? false : alone), true);
    const hasVerticalNeighbor = index % 2 === 0 ? grid[index + 1] !== 0 : grid[index - 1] !== 0;

    if (isAlone) {
      extraClass += ' video-grid__element--full-size';
    } else if (!hasVerticalNeighbor) {
      extraClass += ' video-grid__element--full-height';
    }
    return `${baseClass} ${extraClass}`;
  }
};

function arrayDiff(a, b) {
  return b.filter(i => a.indexOf(i) === -1);
}

ko.components.register('group-video-grid', {
  template: `
    <!-- ko if: participantsGrid().length !== 3 -->
      <div
        class="video-grid"
        data-bind="foreach: { data: participantsGrid, as: 'participant' }"
      >
        <div class="video-grid__element" data-bind=" css: $parents[0].getClassNameForVideo($index())">
          <span data-bind="text: participant"></span>
          <button data-bind="click: () => $parents[0].devRemove(participant)">Remove</button>
        </div>
      </div>
      <!-- ko if: thumbnailVideo() -->
        <div class="video-grid__thumbnail" data-bind="text: thumbnailVideo().id"></div>
      <!-- /ko -->
    <!-- /ko -->
    <buttton style="position: absolute; top: 0; width: 100px; height: 100px; background-color: blue;" data-bind="click: devAdd">Add</button>
  `,
  viewModel: z.components.GroupVideoGrid,
});
