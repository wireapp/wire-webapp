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

import {Asset} from 'Repositories/entity/message/Asset';

import {getMessageAriaLabel} from './conversationMessages';

describe('Conversation messages', () => {
  describe(`Content messages area label by type`, () => {
    const sample1 = {
      assets: [
        {
          file_name: 'document.pdf',
          file_type: 'application/pdf',
          isAudio: jest.fn(),
          isButton: jest.fn(),
          isDownloadable: jest.fn(),
          isFile: jest.fn().mockReturnValue(true),
          isImage: jest.fn(),
          isLocation: jest.fn(),
          isText: jest.fn(),
          isVideo: jest.fn(),
          key: '',
          size: '',
          text: '',
          type: 'File',
        } as unknown as Asset,
      ],
      displayTimestampShort: '5:15 PM',
      senderName: 'Arjita',
    };

    it(`returns the expected aria label for a file type message`, () => {
      const actual = getMessageAriaLabel(sample1);
      const expected = `Arjita. At 5:15 PM. with file attachment, document.pdf `;

      expect(actual[0]).toBe(expected);
    });

    const sample2 = {
      assets: [
        {
          file_name: 'file_example_MP3_700KB.mp3',
          file_type: 'audio/mpeg',
          isAudio: jest.fn().mockReturnValue(true),
          isButton: jest.fn(),
          isDownloadable: jest.fn(),
          isFile: jest.fn(),
          isImage: jest.fn(),
          isLocation: jest.fn(),
          isText: jest.fn(),
          isVideo: jest.fn(),
          key: '',
          size: '',
          text: '',
          type: 'File',
        } as unknown as Asset,
      ],
      displayTimestampShort: '2:15 PM',
      senderName: 'Tim',
    };
    it(`returns the expected aria label for a audio type message`, () => {
      const actual = getMessageAriaLabel(sample2);
      const expected = `Tim. At 2:15 PM. with audio, file_example_MP3_700KB.mp3 `;

      expect(actual[0]).toBe(expected);
    });

    const sample3 = {
      assets: [
        {
          file_name: '',
          file_type: '',
          isAudio: jest.fn(),
          isButton: jest.fn(),
          isDownloadable: jest.fn(),
          isFile: jest.fn(),
          isImage: jest.fn(),
          isLocation: jest.fn(),
          isText: jest.fn().mockReturnValue(true),
          isVideo: jest.fn(),
          key: '',
          size: '',
          text: 'Hello, this is a text message',
          type: 'Text',
        } as unknown as Asset,
      ],
      displayTimestampShort: '10:15 PM',
      senderName: 'Virgil',
    };
    it(`returns the expected aria label for a text message`, () => {
      const actual = getMessageAriaLabel(sample3);
      const expected = `Virgil. Hello, this is a text message At 10:15 PM.`;

      expect(actual[0]).toBe(expected);
    });
  });
});
