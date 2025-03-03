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

import * as StringUtil from './StringUtil';

/**
 * @testEnvironment node
 */
describe('StringUtil', () => {
  describe('"capitalize"', () => {
    it('does not lowercase other characters', () => {
      const test = 'aBCD';
      const expected = 'ABCD';
      const actual = StringUtil.capitalize(test);
      expect(actual).toEqual(expected);
    });

    it('capitalizes first letter', () => {
      const test = 'abcd';
      const expected = 'Abcd';
      const actual = StringUtil.capitalize(test);
      expect(actual).toEqual(expected);
    });
  });

  describe('pluralize', () => {
    it('pluralizes the word "hour"', () => {
      const test = 'hour';
      const expected = 'hours';
      const actual = StringUtil.pluralize(test, 5);
      expect(actual).toEqual(expected);
    });

    it('pluralizes the word "bugfix"', () => {
      const test = 'bugfix';
      const expected = 'bugfixes';
      const actual = StringUtil.pluralize(test, 2, {postfix: 'es'});
      expect(actual).toEqual(expected);
    });

    it('does not pluralize if the count is 1', () => {
      const test = 'time';
      const expected = 'time';
      const actual = StringUtil.pluralize(test, 1);
      expect(actual).toEqual(expected);
    });
  });

  describe('uuidToBytes', () => {
    it('converts a UUID to bytes', () => {
      // Example taken from https://en.wikipedia.org/wiki/Universally_unique_identifier#Encoding
      const uuid = '00112233-4455-6677-8899-aabbccddeeff';
      const expected = Buffer.from([
        0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88, 0x99, 0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff,
      ]);
      const actual = StringUtil.uuidToBytes(uuid);
      expect(expected).toEqual(actual);
    });
  });

  describe('bytesToUUID', () => {
    it('converts a UUID to bytes', () => {
      // Example taken from https://en.wikipedia.org/wiki/Universally_unique_identifier#Encoding
      const expected = '00112233-4455-6677-8899-aabbccddeeff';
      const uuid = Buffer.from([
        0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88, 0x99, 0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff,
      ]);
      const actual = StringUtil.bytesToUUID(uuid);
      expect(expected).toEqual(actual);
    });
  });

  describe('serializeArgs - Browser Safe Tests', () => {
    jest.setTimeout(30000);

    test('should truncate a very large string', () => {
      const largeString = 'a'.repeat(1_000_000); // 1MB string (should truncate)

      const result = StringUtil.serializeArgs([largeString]);

      expect(result[0].length).toBeLessThanOrEqual(10_010); // Should truncate
      expect(result[0]).toContain('... [truncated]');
    });

    test('should handle circular references', () => {
      const circularObj: any = {};
      circularObj.self = circularObj; // Create circular reference

      const result = StringUtil.serializeArgs([circularObj]);

      expect(result[0]).toContain('[Circular]'); // Should replace circular references
      expect(() => JSON.parse(result[0])).not.toThrow(); // Should be valid JSON
    });

    test('should serialize a large object safely', () => {
      const largeObject: any = {};
      for (let i = 0; i < 100_000; i++) {
        // 100k properties
        largeObject[`key${i}`] = 'value';
      }

      const result = StringUtil.serializeArgs([largeObject]);

      expect(typeof result[0]).toBe('string'); // Should still be a valid JSON string
      expect(result[0].length).toBeLessThanOrEqual(1_000_010); // Should be within the truncation limit
    });

    test('should serialize a normal object correctly', () => {
      const obj = {a: 1, b: 'test', c: [1, 2, 3]};

      const result = StringUtil.serializeArgs([obj]);

      expect(() => JSON.parse(result[0])).not.toThrow(); // Should be valid JSON
      expect(JSON.parse(result[0])).toEqual(obj); // Should match original object
    });

    test('should return "[Unserializable Object]" for unsupported values', () => {
      const unserializable = {
        toJSON: () => {
          throw new Error('Cannot serialize');
        },
      };

      const result = StringUtil.serializeArgs([unserializable]);

      expect(result[0]).toBe('[Unserializable Object]'); // Should return error placeholder
    });
  });
});
