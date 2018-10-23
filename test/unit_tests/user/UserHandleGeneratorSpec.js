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

// grunt test_init && grunt test_run:user/UserHandleGenerator

'use strict';

describe('UserHandleGenerator', () => {
  describe('generate_handle_variations', () => {
    it('generates handle variations', () => {
      const handle = 'superman';
      const number_of_variations = 10;
      const variations = z.user.UserHandleGenerator.generate_handle_variations(handle, number_of_variations);

      expect(variations.length).toBe(number_of_variations);
      variations.forEach(variation => expect(variation).not.toBe(handle));
    });
  });

  describe('normalize_name', () => {
    it('should normalize user names', () => {
      expect(z.user.UserHandleGenerator.normalize_name('Maria LaRochelle')).toBe('marialarochelle');
      expect(z.user.UserHandleGenerator.normalize_name('Mêrié "LaRöche\'lle"')).toBe('merielaroechelle');
      expect(z.user.UserHandleGenerator.normalize_name('Maria I ❤️🍕')).toBe('mariai');
      expect(z.user.UserHandleGenerator.normalize_name('.-/Maria-.')).toBe('maria');
      // expect(z.user.UserHandleGenerator.normalize_name('苹果')).toBe 'pingguo'
      // expect(z.user.UserHandleGenerator.normalize_name('תפוח ')).toBe 'tpwh'
      // expect(z.user.UserHandleGenerator.normalize_name('सेवफलम्')).toBe 'sevaphalam'
      // expect(z.user.UserHandleGenerator.normalize_name('μήλο')).toBe 'melo'
      // expect(z.user.UserHandleGenerator.normalize_name('Яблоко')).toBe 'abloko'
      // expect(z.user.UserHandleGenerator.normalize_name('خطای سطح دسترسی')).toBe 'khtaysthdstrsy'
      expect(z.user.UserHandleGenerator.normalize_name('ᑭᒻᒥᓇᐅᔭᖅ')).toBe('');
      expect(z.user.UserHandleGenerator.normalize_name('    Maria LaRochelle Von Schwerigstein ')).toBe(
        'marialarochellevonsch'
      );

      expect(z.user.UserHandleGenerator.normalize_name(' \n\t Maria LaRochelle Von Schwerigstein ')).toBe(
        'marialarochellevonsch'
      );

      expect(z.user.UserHandleGenerator.normalize_name('🐙☀️')).toBe('');
      expect(z.user.UserHandleGenerator.normalize_name('name@mail.com')).toBe('namemailcom');
    });
  });

  describe('validate_character', () => {
    it('returns true character is valid', () => {
      const latin_alphabet = [
        'a',
        'b',
        'c',
        'd',
        'e',
        'f',
        'g',
        'h',
        'i',
        'j',
        'k',
        'l',
        'm',
        'n',
        'o',
        'p',
        'q',
        'r',
        's',
        't',
        'u',
        'v',
        'w',
        'x',
        'y',
        'z',
      ];
      const numbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
      const allowed_symbols = ['_'];

      latin_alphabet.concat(numbers, allowed_symbols).forEach(character => {
        expect(z.user.UserHandleGenerator.validate_character(character)).toBeTruthy();
      });
    });

    it('returns false if character is not a string', () => {
      expect(z.user.UserHandleGenerator.validate_character()).toBeFalsy();
      expect(z.user.UserHandleGenerator.validate_character(null)).toBeFalsy();
      expect(z.user.UserHandleGenerator.validate_character({})).toBeFalsy();
      expect(z.user.UserHandleGenerator.validate_character(1)).toBeFalsy();
    });

    it('returns false if character contains other than alphanumeric characters and underscores', () => {
      expect(z.user.UserHandleGenerator.validate_character('A')).toBeFalsy();
      expect(z.user.UserHandleGenerator.validate_character('太')).toBeFalsy();
      expect(z.user.UserHandleGenerator.validate_character('شمس')).toBeFalsy();
      expect(z.user.UserHandleGenerator.validate_character('!')).toBeFalsy();
    });
  });

  describe('append_random_digits', () => {
    it('appends random digits to the end of the string', () => {
      const handle = 'foo';
      const additional_numbers = 5;
      const string_with_digits = z.user.UserHandleGenerator.append_random_digits('foo', additional_numbers);

      expect(string_with_digits.length).toBe(handle.length + additional_numbers);
      expect(string_with_digits.match(/[1-9]*$/)[0].length).toBe(additional_numbers);
    });
  });

  describe('create_suggestions', () => {
    it('appends random digits to the end of the string', () => {
      const username = 'memphis';
      const suggestions = z.user.UserHandleGenerator.create_suggestions(username);

      expect(suggestions.length).toBe(12);
      expect(suggestions.shift()).toBe(username);
      suggestions.forEach(suggestion => expect(suggestion).not.toBe(username));
    });
  });

  describe('validate_handle', () => {
    it('returns true for valid handles', () => {
      expect(z.user.UserHandleGenerator.validate_handle('valid1')).toBeTruthy();
      expect(z.user.UserHandleGenerator.validate_handle('1valid')).toBeTruthy();
      expect(z.user.UserHandleGenerator.validate_handle('val1d')).toBeTruthy();
      expect(z.user.UserHandleGenerator.validate_handle('still_valid')).toBeTruthy();
    });

    it('returns false for invalid handles', () => {
      expect(z.user.UserHandleGenerator.validate_handle()).toBeFalsy();
      expect(z.user.UserHandleGenerator.validate_handle('')).toBeFalsy();
      expect(z.user.UserHandleGenerator.validate_handle(1)).toBeFalsy();
      expect(z.user.UserHandleGenerator.validate_handle('Invalid')).toBeFalsy();
      expect(z.user.UserHandleGenerator.validate_handle('invaliD')).toBeFalsy();
      expect(z.user.UserHandleGenerator.validate_handle('invAlid')).toBeFalsy();
      expect(z.user.UserHandleGenerator.validate_handle('!invalid')).toBeFalsy();
      expect(z.user.UserHandleGenerator.validate_handle('invalid!')).toBeFalsy();
      expect(z.user.UserHandleGenerator.validate_handle('inva!lid')).toBeFalsy();
      expect(z.user.UserHandleGenerator.validate_handle('inva!lid')).toBeFalsy();
      expect(z.user.UserHandleGenerator.validate_handle('thisisaverylongandthusinvalidhandle')).toBeFalsy();
    });
  });
});
