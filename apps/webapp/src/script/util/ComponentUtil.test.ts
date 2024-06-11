/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import {renderHook, act} from '@testing-library/react';
import ko from 'knockout';

import {useKoSubscribableChildren} from './ComponentUtil';

describe('ComponentUtil', () => {
  describe('useKoSubscribableChildren', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    it('returns a new object with updated values, when one observable changes', () => {
      const obj = {
        observableA: ko.observable(0),
        observableB: ko.observable(0),
      };
      const {result} = renderHook(() => useKoSubscribableChildren(obj, ['observableA', 'observableB']));
      const preResult = result.current;
      act(() => {
        obj.observableA(1);
        jest.advanceTimersByTime(1);
      });
      const postResult = result.current;

      expect(preResult).toEqual({observableA: 0, observableB: 0});
      expect(postResult).toEqual({observableA: 1, observableB: 0});
    });

    it('returns a new object when the observed object changes', () => {
      const {result, rerender} = renderHook(({obj}) => useKoSubscribableChildren(obj, ['observableA', 'observableB']), {
        initialProps: {
          obj: {
            observableA: ko.observable(1),
            observableB: ko.observable(0),
          },
        },
      });
      const preResult = result.current;
      rerender({
        obj: {
          observableA: ko.observable(0),
          observableB: ko.observable(1),
        },
      });
      const postResult = result.current;

      expect(preResult).toEqual({observableA: 1, observableB: 0});

      expect(postResult).toEqual({observableA: 0, observableB: 1});
    });
  });
});
