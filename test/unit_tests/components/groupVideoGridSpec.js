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

// grunt test_init && grunt test_run:components/groupVideoGrid

describe('z.component.GroupVideoGrid', () => {
  let groupVideoGrid;
  const initialGrid = [0, 0, 0, 0];

  beforeEach(() => {
    groupVideoGrid = new z.components.GroupVideoGrid({
      calls: ko.observableArray([]),
      selfStream: ko.observable(null),
      streamsInfo: ko.observableArray([]),
    });
  });

  describe('computeGrid', () => {
    describe('people joining call', () => {
      it('computes a new grid', () => {
        const tests = [
          {
            expected: ['first', 0, 0, 0],
            grid: initialGrid,
            participants: [{id: 'first'}],
            scenario: 'dispatches a single initial participant',
          },
          {
            expected: ['first', 0, 'second', 0],
            grid: initialGrid,
            participants: [{id: 'first'}, {id: 'second'}],
            scenario: 'dispatches two initial participants',
          },
          {
            expected: ['first', 0, 'second', 'three'],
            grid: initialGrid,
            participants: [{id: 'first'}, {id: 'second'}, {id: 'three'}],
            scenario: 'dispatches three initial participants',
          },
          {
            expected: ['first', 'four', 'second', 'three'],
            grid: initialGrid,
            participants: [{id: 'first'}, {id: 'second'}, {id: 'three'}, {id: 'four'}],
            scenario: 'dispatches four initial participants',
          },
          {
            expected: ['first', 0, 'second', 0],
            grid: ['first'],
            participants: [{id: 'first'}, {id: 'second'}],
            scenario: 'second participant joins',
          },
          {
            expected: ['first', 0, 'second', 'three'],
            grid: ['first', 'second'],
            participants: [{id: 'first'}, {id: 'second'}, {id: 'three'}],
            scenario: 'third participant joins',
          },
        ];

        tests.forEach(({grid, participants, expected, scenario}) => {
          expect(groupVideoGrid.computeGrid(grid, participants)).toEqual(expected, scenario);
        });
      });
    });

    describe('people leaving call', () => {
      const tests = [
        {
          expected: ['first', 0, 0, 0],
          grid: ['first', 0, 'second', 0],
          participants: [{id: 'first'}],
          scenario: 'second participant (of 2) leaves',
        },
        {
          expected: ['first', 0, 'third', 0],
          grid: ['first', 0, 'second', 'third'],
          participants: [{id: 'first'}, {id: 'third'}],
          scenario: 'second participant (of 3) leaves',
        },
        {
          expected: ['first', 'fourth', 0, 'third'],
          grid: ['first', 'fourth', 'second', 'third'],
          participants: [{id: 'first'}, {id: 'third'}, {id: 'fourth'}],
          scenario: 'second participant (of 4) leaves',
        },
        {
          expected: ['first', 0, 'fourth', 0],
          grid: ['first', 'fourth', 0, 'third'],
          participants: [{id: 'first'}, {id: 'fourth'}],
          scenario: 'one participant leaves one column empty',
        },
      ];

      tests.forEach(({grid, participants, expected, scenario}) => {
        it(scenario, () => {
          const result = groupVideoGrid.computeGrid(grid, participants);
          expect(result).toEqual(expected, scenario);
        });
      });
    });
  });

  describe('streams observable', () => {
    it("doesn't contain the user's own video if there is only a single remote stream", () => {
      const selfVideo = {self: true};
      const remoteVideos = [{stream: {}}];
      groupVideoGrid = new z.components.GroupVideoGrid({
        calls: ko.observableArray([]),
        selfStream: ko.observable(selfVideo),
        streamsInfo: ko.observableArray(remoteVideos),
      });

      expect(groupVideoGrid.streams()).not.toContain(selfVideo);
      expect(groupVideoGrid.thumbnailStream()).toBe(selfVideo);
    });

    it('contains only the active videos', () => {
      const remoteVideos = [
        {flow_id: 'user-1', stream: {}},
        {flow_id: 'user-2', stream: {}},
        {flow_id: 'user-3', stream: {}},
      ];
      groupVideoGrid = new z.components.GroupVideoGrid({
        calls: ko.observableArray([{participants: () => [{id: 'user-1', state: {videoSend: () => false}}]}]),
        selfStream: ko.observable(null),
        streamsInfo: ko.observableArray(remoteVideos),
      });

      expect(groupVideoGrid.streams().length).toBe(remoteVideos.length - 1);
    });

    it("contains the user's own video if there are more or less than one other participant", () => {
      const selfVideo = {self: true};
      const nbOfRemoteStreams = [0, 2, 3];

      nbOfRemoteStreams.forEach(nbOfStreams => {
        const remoteStreams = new Array(nbOfStreams).fill({remote: true, stream: {}});
        groupVideoGrid = new z.components.GroupVideoGrid({
          calls: ko.observableArray([]),
          selfStream: ko.observable(selfVideo),
          streamsInfo: ko.observableArray(remoteStreams),
        });

        expect(groupVideoGrid.streams()).toContain(selfVideo);
        expect(groupVideoGrid.thumbnailStream()).toBe(null);
      });
    });
  });
});
