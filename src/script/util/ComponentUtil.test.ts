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

import ko from 'knockout';

import {renderHook, act} from '@testing-library/react-hooks';
import {
  useKoSubscribable,
  useKoSubscribableCallback,
  useKoSubscribableChildren,
  useKoSubscribableMap,
} from './ComponentUtil';

describe('ComponentUtil', () => {
  describe('useKoSubscribableCallback', () => {
    it('should call the callback function with the updated value', () => {
      const observable = ko.observable(0);
      const callback = jest.fn();
      renderHook(() => useKoSubscribableCallback(observable, callback));
      act(() => {
        observable(1);
      });

      expect(callback).toHaveBeenCalledWith(1);
    });
  });
  describe('useKoSubscribable', () => {
    it('should have the current value', () => {
      const observable = ko.observable(0);
      const {result} = renderHook(() => useKoSubscribable(observable));

      expect(result.current).toBe(0);
      act(() => {
        observable(1);
      });

      expect(result.current).toBe(1);
    });
  });

  describe('useKoSubscribableChildren', () => {
    it('returns a new object with updated values, when one observable changes', () => {
      const obj = {
        observableA: ko.observable(0),
        observableB: ko.observable(0),
      };
      const {result} = renderHook(() => useKoSubscribableChildren(obj, ['observableA', 'observableB']));
      const preResult = result.current;
      act(() => {
        obj.observableA(1);
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

  describe('useKoSubscribableMap', () => {
    it('returns a new array of values when one observable changes', () => {
      const obj = [
        {
          observable: ko.observable(0),
        },
        {
          observable: ko.observable(0),
        },
      ];

      const {result} = renderHook(() => useKoSubscribableMap(obj, 'observable'));

      const preResult = result.current;
      act(() => {
        obj[0].observable(1);
      });
      const postResult = result.current;

      expect(preResult).toEqual([0, 0]);

      expect(postResult).toEqual([1, 0]);
    });
    it('returns a new object when the observed object changes', () => {
      const {result, rerender} = renderHook(({obj}) => useKoSubscribableMap(obj, 'observable'), {
        initialProps: {
          obj: [
            {
              observable: ko.observable(1),
            },
            {
              observable: ko.observable(0),
            },
          ],
        },
      });
      const preResult = result.current;
      rerender({
        obj: [
          {
            observable: ko.observable(0),
          },

          {
            observable: ko.observable(1),
          },
        ],
      });
      const postResult = result.current;

      expect(preResult).toEqual([1, 0]);

      expect(postResult).toEqual([0, 1]);
    });
  });
});
