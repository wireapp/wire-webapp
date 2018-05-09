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
  const me = {id: 'its-me'};

  beforeEach(() => {
    groupVideoGrid = new z.components.GroupVideoGrid({me: ko.observable(me), participants: ko.observableArray([])});
  });

  describe('computeGrid', () => {
    describe('people joining', () => {
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
        ];

        tests.forEach(({grid, participants, expected, scenario}) => {
          expect(groupVideoGrid.computeGrid(grid, participants)).toEqual(expected, scenario);
        });
      });
    });

    describe('people leaving', () => {});
  });
});
