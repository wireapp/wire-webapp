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

// KARMA_SPECS=util/ObjectUtil yarn test:app

import {escapeProperties, mergeEntities} from 'app/script/util/objectUtil';
import ko from 'knockout';

describe('objectUtil', () => {
  describe('escapeProperties', () => {
    it('escapes all properties of an object', () => {
      const object = {
        age: '<b>25</b>',
        favorite: {
          place: '<b>Berlin</b>',
        },
        name: 'Lara',
      };

      const escaped_object = escapeProperties(object);

      expect(escaped_object.age).toBe('&lt;b&gt;25&lt;/b&gt;');
      expect(escaped_object.favorite.place).toBe('&lt;b&gt;Berlin&lt;/b&gt;');
      expect(escaped_object.name).toBe('Lara');
    });
  });

  describe('mergeEntities', () => {
    it('merges raw values', () => {
      const destination = {
        value: 1,
      };
      const source = {
        value: 2,
      };

      const merged = mergeEntities(destination, source);

      expect(merged.value).toEqual(source.value);
    });

    it('does not replace observables but push new value instead', () => {
      const originalValue = ko.observable(1);

      const destination = {
        value: originalValue,
      };
      const source = {
        value: ko.observable(2),
      };

      const merged = mergeEntities(destination, source);

      expect(merged.value).toBe(originalValue);
      expect(merged.value()).toBe(source.value());
    });

    it('deeply merges nested data structures', () => {
      const originalValue = {value: 11};

      const destination = {value: originalValue};
      const source = {value: {value: 12}};

      const merged = mergeEntities(destination, source);

      expect(merged.value).toBe(originalValue);
      expect(merged.value.value).toBe(source.value.value);
    });

    it('deeply merges nested data structures containing observables', () => {
      const originalValue = {value: ko.observable(11)};

      const destination = {value: originalValue};
      const source = {value: {value: ko.observable(12)}};

      const merged = mergeEntities(destination, source);

      expect(merged.value).toBe(originalValue);
      expect(merged.value.value()).toBe(source.value.value());
    });

    it('deeply merges observables containing objects', () => {
      const originalValue = ko.observable({value: 11});

      const destination = {value: originalValue};
      const source = {value: ko.observable({value: 12})};

      const merged = mergeEntities(destination, source);

      expect(merged.value).toBe(originalValue);
      expect(merged.value()).toBe(originalValue());
      expect(merged.value().value).toBe(source.value().value);
    });

    it('leaves ignored property to their initial value', () => {
      const originalName = 'felix';
      const destination = {name: originalName, value: 11};
      const source = {name: 'other', value: 12};

      const merged = mergeEntities(destination, source, ['name']);

      expect(merged.value).toBe(source.value);
      expect(merged.name).toBe(originalName);
    });

    it('reset properties of the destination object', () => {
      const destination = {value: {value: 1}};
      const source = {value: {}};

      const merged = mergeEntities(destination, source);

      expect(merged.value.value).toBe(undefined);
    });

    it('overwrite object with primitive values', () => {
      const destination = {value: {value: 1}};
      const source = {value: undefined};

      const merged = mergeEntities(destination, source);

      expect(merged.value).toBe(source.value);
    });

    it('updates destination array values with source array values', () => {
      const destination = {value: [1, 2, 3]};
      const source = {value: []};

      const merged = mergeEntities(destination, source);

      expect(merged.value.length).toBe(source.value.length);
      expect(merged.value).toBe(destination.value);
    });
  });
});
