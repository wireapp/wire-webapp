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

// grunt test_run:util/StringUtil

'use strict';

describe('z.util.StringUtil', () => {
  describe('compareTransliteration', () => {
    it('René equals Rene', () => {
      expect(z.util.StringUtil.compareTransliteration('René', 'Rene')).toBeTruthy();
    });

    it('Παναγιώτα equals Panagiota', () => {
      expect(z.util.StringUtil.compareTransliteration('Παναγιώτα', 'Panagiota')).toBeTruthy();
    });

    it('ΠΑΝΑΓΙΩΤΑ equals PANAGIOTA', () => {
      expect(z.util.StringUtil.compareTransliteration('ΠΑΝΑΓΙΩΤΑ', 'PANAGIOTA')).toBeTruthy();
    });

    it('Björn equals Bjoern', () => {
      expect(z.util.StringUtil.compareTransliteration('Björn', 'Bjoern')).toBeTruthy();
    });

    it('Bjørn equals Bjorn', () => {
      expect(z.util.StringUtil.compareTransliteration('Bjørn', 'Bjorn')).toBeTruthy();
    });
  });

  describe('format', () => {
    it('returns string with replaced placeholder', () => {
      expect(z.util.StringUtil.format('foo={0}&bar={1}', 1, 2)).toBe('foo=1&bar=2');
    });
  });

  describe('getRandomChar', () => {
    it('always returns an alphanumeric character', () => {
      _.range(1000).map(() => {
        expect(z.util.StringUtil.getRandomChar()).toMatch(/(\w|\d){1}/);
      });
    });
  });

  describe('includes', () => {
    const string = 'Club Zeta';

    it('returns true for positive matches', () => {
      expect(z.util.StringUtil.includes(string, 'ub')).toBeTruthy();
      expect(z.util.StringUtil.includes(string, 'Club Z')).toBeTruthy();
      expect(z.util.StringUtil.includes(string, 'club z')).toBeTruthy();
    });

    it('returns false for no matches', () => {
      expect(z.util.StringUtil.includes(string, 'wurst')).toBeFalsy();
    });
  });

  describe('obfuscate', () => {
    it("obfuscates a text preserving it's whitespaces", () => {
      const text = 'You Are The Sunshine Of My Life';
      const obfuscated = z.util.StringUtil.obfuscate(text);
      const whitespaces = obfuscated.match(/[\n\r\s]+/gi);

      expect(obfuscated).not.toBe(text);
      expect(whitespaces.length).toBe(6);
    });

    it('obfuscates a text keeping its length', () => {
      const text =
        'Bacon ipsum dolor amet sausage landjaeger ball tip brisket filet mignon, t-bone tenderloin tri-tip beef drumstick fatback burgdoggen ground round meatball. Tri-tip spare ribs ground round bresaola ball tip tail, sirloin chicken doner boudin turkey leberkas bacon alcatra. ';
      const obfuscated = z.util.StringUtil.obfuscate(text);

      expect(obfuscated).not.toBe(text);
      expect(obfuscated.length).toBe(text.length);
    });

    it('obfuscates a text keeping its length (commas)', () => {
      const text = ',,,,,,';
      const obfuscated = z.util.StringUtil.obfuscate(text);

      expect(obfuscated).not.toBe(text);
      expect(obfuscated.length).toBe(text.length);
    });

    it('obfuscates a text keeping its length (dots)', () => {
      const text = '......';
      const obfuscated = z.util.StringUtil.obfuscate(text);

      expect(obfuscated).not.toBe(text);
      expect(obfuscated.length).toBe(text.length);
    });
  });

  describe('removeLineBreaks', () => {
    it('removes all the line breaks', () => {
      expect(z.util.StringUtil.removeLineBreaks('\nA\nB\nC\nD\n')).toBe('ABCD');
    });
  });

  describe('sortByPriority', () => {
    it('can sort strings', () => {
      const string_1 = 'a b';
      const string_2 = 'c d';

      expect(z.util.StringUtil.sortByPriority(string_1, string_2)).toEqual(-1);
      expect(z.util.StringUtil.sortByPriority(string_2, string_1)).toEqual(1);
      expect(z.util.StringUtil.sortByPriority(string_1, string_1)).toEqual(0);
      expect(z.util.StringUtil.sortByPriority(string_1, string_2, 'a')).toEqual(-1);
      expect(z.util.StringUtil.sortByPriority(string_1, string_2, 'c')).toEqual(1);
      expect(z.util.StringUtil.sortByPriority(string_1, string_2, 'A')).toEqual(-1);
      expect(z.util.StringUtil.sortByPriority(string_1, string_2, 'C')).toEqual(1);
    });
  });

  describe('splitAtPivotElement', () => {
    it('splits a text in two halves at a pivot element', () => {
      const pivot = '{{variable}}';
      const replacement = 'messaging';
      const text = `Secure ${pivot} for everyone.`;

      const actual = z.util.StringUtil.splitAtPivotElement(text, pivot, replacement);

      expect(actual.length).toBe(3);
      expect(actual[1].text).toBe(replacement);
      expect(actual[0].isStyled).toBe(false);
      expect(actual[1].isStyled).toBe(true);
      expect(actual[2].isStyled).toBe(false);
    });

    it('works when the pivot element is first', () => {
      const pivot = '{{time}}';
      const replacement = '22:42';
      const turkish = `${pivot} ’da aktif edildi`;

      const actual = z.util.StringUtil.splitAtPivotElement(turkish, pivot, replacement);

      expect(actual.length).toBe(2);
      expect(actual[0].text).toBe(replacement);
      expect(actual[0].isStyled).toBe(true);
      expect(actual[1].isStyled).toBe(false);
    });

    it('works when the pivot element is last', () => {
      const pivot = '{{time}}';
      const replacement = '22:42';
      const greek = `Ενεργοποιήθηκε στις ${pivot}`;

      const actual = z.util.StringUtil.splitAtPivotElement(greek, pivot, replacement);

      expect(actual.length).toBe(2);
      expect(actual[1].text).toBe(replacement);
      expect(actual[1].isStyled).toBe(true);
      expect(actual[0].isStyled).toBe(false);
    });

    it('works when the pivot element is in-between', () => {
      const pivot = '{{time}}';
      const replacement = '22:42';
      const finish = `Aktivoitu ${pivot}: ssa`;

      const actual = z.util.StringUtil.splitAtPivotElement(finish, pivot, replacement);

      expect(actual.length).toBe(3);
      expect(actual[0].isStyled).toBe(false);
      expect(actual[1].text).toBe(replacement);
      expect(actual[1].isStyled).toBe(true);
      expect(actual[2].isStyled).toBe(false);
    });

    it('works with pivots that need to be escaped in regular expressions', () => {
      const pivot = '{{time}}';
      const replacement = '?';
      const english = `Activated on ${pivot}`;

      const actual = z.util.StringUtil.splitAtPivotElement(english, pivot, replacement);

      expect(actual.length).toBe(2);
      expect(actual[0].isStyled).toBe(false);
      expect(actual[1].text).toBe(replacement);
      expect(actual[1].isStyled).toBe(true);
    });

    it('returns the initial string when no pivot element is provided', () => {
      const english = `Activated on 22:42`;
      const actual = z.util.StringUtil.splitAtPivotElement(english);

      expect(actual.length).toBe(1);
      expect(actual[0].isStyled).toBe(false);
      expect(actual[0].text).toBe(english);
    });
  });

  describe('startsWith', () => {
    const string = 'To be, or not to be, that is the question.';

    it('returns true for positive matches', () => {
      expect(z.util.StringUtil.startsWith(string, 'To be')).toBeTruthy();
      expect(z.util.StringUtil.startsWith(string, 'to be')).toBeTruthy();
    });

    it('returns false for no matches', () => {
      expect(z.util.StringUtil.startsWith(string, 'not to be')).toBeFalsy();
    });
  });

  describe('truncate', () => {
    it('returns the full string if it is shorter than the target length', () => {
      const text = z.util.StringUtil.truncate(`${lorem_ipsum.substr(0, 80)}`, 90);

      expect(text.length).toBe(80);
      expect(text.charAt(79)).not.toBe('…');
    });

    it('returns a truncated string of correct length if it is longer than the target length', () => {
      const text = z.util.StringUtil.truncate(`${lorem_ipsum.substr(0, 80)}`, 70);

      expect(text.length).toBe(64);
      expect(text.charAt(63)).toBe('…');
    });

    it('returns a truncated string of correct length if word boundary is disabled', () => {
      const text = z.util.StringUtil.truncate(`${lorem_ipsum.substr(0, 80)}`, 70, false);

      expect(text.length).toBe(70);
      expect(text.charAt(69)).toBe('…');
    });

    it('returns a truncated string of correct length if word boundary is disabled and there are no whitespaces in the string', () => {
      const text = z.util.StringUtil.truncate(`${lorem_ipsum.replace(/\s/g, '').substr(0, 80)}`, 70);

      expect(text.length).toBe(70);
      expect(text.charAt(69)).toBe('…');
    });
  });

  describe('bytesToHex', () => {
    it('converts string values to hex', () => {
      const stringValue = 'wire';
      const expectedResult = '77697265';

      const array = stringValue.split('').map(char => char.charCodeAt(0));
      const resultValue = z.util.StringUtil.bytesToHex(array);

      expect(resultValue).toBe(expectedResult);
    });
  });

  describe('hexToBytes', () => {
    it('converts string values to hex', () => {
      const hexValue = '77697265';
      const expectedResult = 'wire';

      const resultArray = z.util.StringUtil.hexToBytes(hexValue);
      const resultValue = resultArray.map(byte => String.fromCharCode(byte)).join('');

      expect(resultValue).toBe(expectedResult);
    });
  });

  describe('padStart', () => {
    it('pads a string', () => {
      const unpaddedString = 'wire';
      const paddedString = '   wire';

      const result = z.util.StringUtil.padStart(unpaddedString, 7);

      expect(result).toBe(paddedString);
    });

    it('masks a credit card number', () => {
      const fullNumber = '2034399002125581';
      const last4Digits = fullNumber.slice(-4);
      const maskedNumber = '************5581';

      const result = z.util.StringUtil.padStart(last4Digits, fullNumber.length, '*');

      expect(result).toBe(maskedNumber);
    });
  });
});
