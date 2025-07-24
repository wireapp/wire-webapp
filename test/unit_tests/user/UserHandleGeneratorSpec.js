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

import {
  normalizeName,
  validateCharacter,
  validateHandle,
  generateHandleVariations,
  appendRandomDigits,
  createSuggestions,
} from 'Repositories/user/UserHandleGenerator';

describe('UserHandleGenerator', () => {
  describe('generate_handle_variations', () => {
    it('generates handle variations', () => {
      const handle = 'superman';
      const number_of_variations = 10;
      const variations = generateHandleVariations(handle, number_of_variations);

      expect(variations.length).toBe(number_of_variations);
      variations.forEach(variation => expect(variation).not.toBe(handle));
    });
  });

  describe('normalizeName', () => {
    it('should normalize user names', () => {
      expect(normalizeName('Maria LaRochelle')).toBe('maria-larochelle');
      expect(normalizeName('Mêrié "LaRöche\'lle"')).toBe('merie-laroeche-lle');
      expect(normalizeName('Maria I ❤️🍕')).toBe('maria-i');
      expect(normalizeName('.-/Maria-.')).toBe('.-maria-.');
      // expect(normalizeName('苹果')).toBe 'pingguo'
      // expect(normalizeName('תפוח ')).toBe 'tpwh'
      // expect(normalizeName('सेवफलम्')).toBe 'sevaphalam'
      // expect(normalizeName('μήλο')).toBe 'melo'
      // expect(normalizeName('Яблоко')).toBe 'abloko'
      // expect(normalizeName('خطای سطح دسترسی')).toBe 'khtaysthdstrsy'
      expect(normalizeName('ᑭᒻᒥᓇᐅᔭᖅ')).toBe('');
      expect(normalizeName('    Maria LaRochelle Von Schwerigstein ')).toBe('maria-larochelle-von-schwerigstein');

      expect(normalizeName(' \n\t Maria LaRochelle Von Schwerigstein ')).toBe('maria-larochelle-von-schwerigstein');

      expect(normalizeName('🐙☀️')).toBe('');
      expect(normalizeName('name@mail.com')).toBe('name-mail.com');
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
        expect(validateCharacter(character)).toBeTruthy();
      });
    });

    it('returns false if character is not a string', () => {
      expect(validateCharacter()).toBeFalsy();
      expect(validateCharacter(null)).toBeFalsy();
      expect(validateCharacter({})).toBeFalsy();
      expect(validateCharacter(1)).toBeFalsy();
    });

    it('returns false if character contains other than alphanumeric characters and underscores', () => {
      expect(validateCharacter('A')).toBeFalsy();
      expect(validateCharacter('太')).toBeFalsy();
      expect(validateCharacter('شمس')).toBeFalsy();
      expect(validateCharacter('!')).toBeFalsy();
    });
  });

  describe('append_random_digits', () => {
    it('appends random digits to the end of the string', () => {
      const handle = 'foo';
      const additional_numbers = 5;
      const string_with_digits = appendRandomDigits('foo', additional_numbers);

      expect(string_with_digits.length).toBe(handle.length + additional_numbers);
      expect(string_with_digits.match(/[1-9]*$/)[0].length).toBe(additional_numbers);
    });
  });

  describe('create_suggestions', () => {
    it('appends random digits to the end of the string', () => {
      const username = 'memphis';
      const suggestions = createSuggestions(username);

      expect(suggestions.length).toBe(12);
      expect(suggestions.shift()).toBe(username);
      suggestions.forEach(suggestion => expect(suggestion).not.toBe(username));
    });
  });

  describe('validate_handle', () => {
    it('returns true for valid handles', () => {
      expect(validateHandle('valid1')).toBeTruthy();
      expect(validateHandle('1valid')).toBeTruthy();
      expect(validateHandle('val1d')).toBeTruthy();
      expect(validateHandle('still_valid')).toBeTruthy();
      expect(validateHandle('thisisaverylongandthusinvalidhandle')).toBeTruthy();
      expect(validateHandle('this-is-also-very-valid.')).toBeTruthy();
    });

    it('returns false for invalid handles', () => {
      expect(validateHandle()).toBeFalsy();
      expect(validateHandle('')).toBeFalsy();
      expect(validateHandle(1)).toBeFalsy();
      expect(validateHandle('Invalid')).toBeFalsy();
      expect(validateHandle('invaliD')).toBeFalsy();
      expect(validateHandle('invAlid')).toBeFalsy();
      expect(validateHandle('!invalid')).toBeFalsy();
      expect(validateHandle('invalid!')).toBeFalsy();
      expect(validateHandle('inva!lid')).toBeFalsy();
      expect(validateHandle('inva!lid')).toBeFalsy();
    });
  });
});
