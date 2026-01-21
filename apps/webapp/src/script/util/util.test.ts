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

import {Conversation} from 'Repositories/entity/Conversation';
import {
  arrayToBase64,
  base64ToArray,
  base64ToBlob,
  formatBytes,
  getContentTypeFromDataUrl,
  getFileExtension,
  sortGroupsByLastEvent,
  stripDataUri,
  stripUrlWrapper,
  trimFileExtension,
  zeroPadding,
  getFileNameWithExtension,
  sanitizeFilename,
} from 'Util/util';

import {createUuid} from './uuid';

describe('base64ToBlob', () => {
  it('encodes Base64 data URI to blob', () => {
    const base64 = arrayToBase64(new Uint8Array([1, 2, 3]));
    const data_uri = `data:application/octet-binary;base64,${base64}`;
    const blob = base64ToBlob(data_uri);

    expect(blob.type).toBe('application/octet-binary');
  });
});

describe('createRandomUuid', () => {
  it('has the expected format', () => {
    expect(createUuid().length).toBe(36);
    expect(createUuid().split('-').length).toBe(5);
    expect(createUuid()).not.toEqual(createUuid());
  });
});

describe('formatBytes', () => {
  it('renders 0 bytes', () => {
    expect(formatBytes(0)).toEqual('0 B');
  });

  it('renders 1 KB', () => {
    expect(formatBytes(1024)).toEqual('1 KB');
  });

  it('renders 25 MB', () => {
    expect(formatBytes(25 * 1024 * 1024)).toEqual('25 MB');
  });

  it('renders 25 GB', () => {
    expect(formatBytes(25 * 1024 * 1024 * 1024)).toEqual('25 GB');
  });
});

describe('getFileExtension', () => {
  it('returns common extensions', () => {
    expect(getFileExtension('file.jpg')).toEqual('jpg');
    expect(getFileExtension('file.png')).toEqual('png');
    expect(getFileExtension('file.docx')).toEqual('docx');
    expect(getFileExtension('file.exe')).toEqual('exe');
    expect(getFileExtension('file.dmg')).toEqual('dmg');
  });

  it('returns extensions for gzip compressed tar archives', () => {
    expect(getFileExtension('archive.tar.gz')).toEqual('tar.gz');
  });

  it('returns an empty string if filename has no extension', () => {
    expect(getFileExtension('image')).toEqual('');
  });

  it('returns extension jpg for image.jpg', () => {
    expect(getFileExtension('path/to/image.jpg')).toEqual('jpg');
  });

  it('does not return .tar.gz when it is not the file extension', () => {
    expect(getFileExtension('path/to/image.tar.gz.jpg')).toEqual('jpg');
  });
});

describe('trimFileExtension', () => {
  it('returns the filename without extension', () => {
    expect(trimFileExtension('image.jpg')).toEqual('image');
  });

  it('returns the filename when there is no extension', () => {
    expect(trimFileExtension('image')).toEqual('image');
  });

  it('returns the filename without extension or directory path', () => {
    expect(trimFileExtension('foo/bar.exe')).toEqual('foo/bar');
  });

  it('returns the filename without extension for .tar.gz', () => {
    expect(trimFileExtension('archive.tar.gz')).toEqual('archive');
  });

  it('does not remove .tar.gz when it is not the file extension', () => {
    expect(trimFileExtension('cool.tar.gz.jpg')).toEqual('cool.tar.gz');
  });

  it('returns an empty string for undefined', () => {
    expect(trimFileExtension(undefined)).toEqual('');
  });

  it('returns an empty string for an object', () => {
    expect(trimFileExtension({} as any)).toEqual('');
  });
});

describe('base64ToArray', () => {
  it('can convert a gif', () => {
    const actual = base64ToArray('data:image/gif;base64,R0lGODlhAQABAAAAACw=');
    const expected = new Uint8Array([71, 73, 70, 56, 57, 97, 1, 0, 1, 0, 0, 0, 0, 44]);
    expect(actual).toEqual(expected);
  });

  it('can convert array buffer back and forth', () => {
    const buffer = new ArrayBuffer(8);
    const array = new Uint8Array(buffer);
    const bufferEncoded = arrayToBase64(array);
    const bufferDecoded = base64ToArray(bufferEncoded);

    expect(bufferDecoded).toEqual(array);
  });
});

describe('stripDataUri', () => {
  it('can strip data uri', () => {
    const base64 = 'AAAAAAA';
    const plainText = stripDataUri(base64);
    const textHtml = stripDataUri(`data:text/html,${base64}`);
    const base64TextPlain = stripDataUri(`data:text/plain;base64,${base64}`);
    const base64Gif = stripDataUri(`data:image/gif;base64,${base64}`);
    const base64Png = stripDataUri(`data:image/png;base64,${base64}`);
    const base64Jpg = stripDataUri(`data:image/jpg;base64,${base64}`);

    expect(plainText).toBe(base64);
    expect(textHtml).toBe(base64);
    expect(base64TextPlain).toBe(base64);
    expect(base64Gif).toBe(base64);
    expect(base64Png).toBe(base64);
    expect(base64Jpg).toBe(base64);
  });
});

describe('getContentTypeFromDataUrl', () => {
  it('can extract the type of a an image', () => {
    const actual = getContentTypeFromDataUrl('data:image/gif;base64,R0lGODlhAQABAAAAACw=');

    expect(actual).toEqual('image/gif');
  });
});

describe('sortGroupsByLastEvent', () => {
  it('finds out that Group A is more recent than Group B', () => {
    const groupA = new Conversation();
    groupA.name('Latest');
    groupA.last_event_timestamp(1414505857975);

    const groupB = new Conversation();
    groupB.name('Older');
    groupB.last_event_timestamp(1414505766449);

    const groups = [groupA, groupB];
    const [firstGroup, secondGroup] = groups.sort(sortGroupsByLastEvent);

    expect(firstGroup.name()).toEqual(groupA.name());
    expect(secondGroup.name()).toEqual(groupB.name());
  });

  it('finds out that Group B is more recent than Group A', () => {
    const groupA = new Conversation();
    groupA.name('Older');
    groupA.last_event_timestamp(1414505766449);

    const groupB = new Conversation();
    groupB.name('Latest');
    groupB.last_event_timestamp(1414505857975);

    const groups = [groupA, groupB];
    const [firstGroup, secondGroup] = groups.sort(sortGroupsByLastEvent);

    expect(firstGroup.name()).toEqual(groupB.name());
    expect(secondGroup.name()).toEqual(groupA.name());
  });

  it('finds out if two groups are equally recent', () => {
    const groupA = new Conversation();
    const timestamp = 1414505857975;
    groupA.name('Group A');
    groupA.last_event_timestamp(timestamp);

    const groupB = new Conversation();
    groupB.name('Group B');
    groupB.last_event_timestamp(timestamp);

    expect(sortGroupsByLastEvent(groupA, groupB)).toEqual(0);

    const groups = [groupA, groupB];
    const [firstGroup, secondGroup] = groups.sort(sortGroupsByLastEvent);

    expect(firstGroup.name()).toEqual(groupA.name());
    expect(secondGroup.name()).toEqual(groupB.name());
  });
});

describe('stripUrlWrapper', () => {
  it('return the string without URL wrapper (single quotes)', () => {
    expect(stripUrlWrapper('url("/path/to/image/image.png")')).toBe('/path/to/image/image.png');
  });

  it('return the string without URL wrapper (quotes)', () => {
    expect(stripUrlWrapper('url("/path/to/image/image.png")')).toBe('/path/to/image/image.png');
  });

  it('return the string without URL wrapper (without quotes)', () => {
    expect(stripUrlWrapper('url(/path/to/image/image.png)')).toBe('/path/to/image/image.png');
  });
});

describe('zeroPadding', () => {
  it('should add zero padding when string length is smaller then max', () => {
    expect(zeroPadding('1', 10)).toBe('0000000001');
  });

  it('returns string if max is smaller then string length', () => {
    expect(zeroPadding('1000000000', 8)).toBe('1000000000');
  });

  it('returns string if max is equal string length', () => {
    expect(zeroPadding('1000000000', 10)).toBe('1000000000');
  });

  it('should handle numbers', () => {
    expect(zeroPadding(42, 10)).toBe('0000000042');
  });

  it('can add one zero to 6', () => {
    expect(zeroPadding(6)).toEqual('06');
  });

  it('can add 13 zeros to 6', () => {
    expect(zeroPadding(6, 14)).toEqual('00000000000006');
  });

  it('can transform 666 to a string', () => {
    expect(zeroPadding(666)).toEqual('666');
  });
});

describe('getFileNameWithExtension', () => {
  it('adds the extension if not present', () => {
    expect(getFileNameWithExtension('file', 'jpg')).toBe('file.jpg');
  });

  it('does not add the extension if already present', () => {
    expect(getFileNameWithExtension('file.jpg', 'jpg')).toBe('file.jpg');
  });
});

describe('sanitizeFilename', () => {
  it('converts German umlauts to ASCII equivalents', () => {
    expect(sanitizeFilename('Bild eingefügt am 12. Jan. 2026, 14:30:57.png')).toBe(
      'Bild eingefuegt am 12. Jan. 2026- 14-30-57.png',
    );
  });

  it('converts uppercase German umlauts', () => {
    expect(sanitizeFilename('ÄÖÜ.txt')).toBe('AeOeUe.txt');
  });

  it('converts lowercase German umlauts', () => {
    expect(sanitizeFilename('äöü.txt')).toBe('aeoeue.txt');
  });

  it('converts ß to ss', () => {
    expect(sanitizeFilename('Straße.pdf')).toBe('Strasse.pdf');
  });

  it('replaces colons with dashes', () => {
    expect(sanitizeFilename('file:name.txt')).toBe('file-name.txt');
  });

  it('replaces commas and semicolons with dashes', () => {
    expect(sanitizeFilename('file,name;test.txt')).toBe('file-name-test.txt');
  });

  it('preserves spaces but normalizes multiple spaces', () => {
    expect(sanitizeFilename('file   with   spaces.txt')).toBe('file with spaces.txt');
  });

  it('handles French accents by removing diacritics', () => {
    expect(sanitizeFilename('café.txt')).toBe('cafe.txt');
    expect(sanitizeFilename('résumé.pdf')).toBe('resume.pdf');
  });

  it('handles Spanish characters', () => {
    expect(sanitizeFilename('año.txt')).toBe('ano.txt');
  });

  it('leaves ASCII filenames unchanged', () => {
    expect(sanitizeFilename('simple-file.txt')).toBe('simple-file.txt');
  });

  it('trims whitespace from start and end', () => {
    expect(sanitizeFilename('  file.txt  ')).toBe('file.txt');
  });

  it('handles mixed special characters', () => {
    expect(sanitizeFilename('Müller: Café, 2:30 PM.pdf')).toBe('Mueller- Cafe- 2-30 PM.pdf');
  });
});
