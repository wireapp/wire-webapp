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

import {categoryFromEvent} from 'src/script/message/MessageCategorization';
import {MessageCategory} from 'src/script/message/MessageCategory';

describe('MessageCategorization', () => {
  describe('categoryFromEvent', () => {
    it('malformed events should have category of type UNDEFINED', () => {
      expect(categoryFromEvent()).toBe(MessageCategory.UNDEFINED);
    });

    it('ephemeral message should have category of type TEXT', () => {
      const event = {
        conversation: '34e7f58e-b834-4d84-b628-b89b295d46c0',
        data: {content: 'test', nonce: '0004ebd7-1ba9-4747-b880-e63504595cc7', previews: []},
        ephemeral_expires: '1483968961027',
        ephemeral_started: '1483968661027',
        from: '9b47476f-974d-481c-af64-13f82ed98a5f',
        id: '0004ebd7-1ba9-4747-b880-e63504595cc7',
        status: 2,
        time: '2017-01-09T13:31:01.003Z',
        type: 'conversation.message-add',
      };
      const category = categoryFromEvent(event);

      expect(category).toBe(MessageCategory.TEXT);
    });

    it('expired message should have category of type TEXT', () => {
      const event = {
        conversation: 'c499f282-2d79-4188-9808-8b63444194f8',
        data: {content: 'aqgxjp', nonce: '9ba0f061-0159-492b-8e6f-ba31d37ad962'},
        ephemeral_expires: true,
        ephemeral_started: '1483967267134',
        from: '9b47476f-974d-481c-af64-13f82ed98a5f',
        id: '9ba0f061-0159-492b-8e6f-ba31d37ad962',
        status: 2,
        time: '2017-01-09T13:07:47.096Z',
        type: 'conversation.message-add',
      };
      const category = categoryFromEvent(event);

      expect(category).toBe(MessageCategory.TEXT);
    });

    it('text message should have category of type TEXT', () => {
      const event = {
        conversation: '34e7f58e-b834-4d84-b628-b89b295d46c0',
        data: {content: 'test', nonce: 'b6498d81-92e8-4da7-afd2-054239595da7', previews: []},
        from: '9b47476f-974d-481c-af64-13f82ed98a5f',
        id: 'b6498d81-92e8-4da7-afd2-054239595da7',
        status: 2,
        time: '2017-01-09T13:11:15.632Z',
        type: 'conversation.message-add',
      };
      const category = categoryFromEvent(event);

      expect(category).toBe(MessageCategory.TEXT);
    });

    it('text message with link should have category of type TEXT and LINK', () => {
      const event = {
        conversation: '34e7f58e-b834-4d84-b628-b89b295d46c0',
        data: {
          content: 'https://wire.com',
          nonce: 'f7adaa16-38f5-483e-b621-72ff1dbd2276',
          previews: [
            'CjZodHRwczovL3dpcmUuY29tLz81ZDczNDQ0OC00NDZiLTRmYTItYjMwMy1lYTJhNzhiY2NhMDgQABpWCjZodHRwczovL3dpcmUuY29tLz81ZDczNDQ0OC00NDZiLTRmYTItYjMwMy1lYTJhNzhiY2NhMDgSHFdpcmUgwrcgTW9kZXJuIGNvbW11bmljYXRpb24=',
          ],
        },
        from: '5598f954-674f-4a34-ad47-9e5ee8f00bcd',
        id: 'f7adaa16-38f5-483e-b621-72ff1dbd2276',
        time: '2017-01-09T13:11:15.051Z',
        type: 'conversation.message-add',
      };
      const category = categoryFromEvent(event);

      expect(category & MessageCategory.TEXT).toBe(MessageCategory.TEXT);
      expect(category & MessageCategory.LINK).toBe(MessageCategory.LINK);
    });

    it('text message with like should have category of type TEXT and LIKED', () => {
      const event = {
        conversation: '34e7f58e-b834-4d84-b628-b89b295d46c0',
        data: {content: 'test', nonce: 'b2a9bf4f-f912-4c0c-9f8b-aea290fe53e3', previews: []},
        from: '9b47476f-974d-481c-af64-13f82ed98a5f',
        id: 'b2a9bf4f-f912-4c0c-9f8b-aea290fe53e3',
        reactions: {'9b47476f-974d-481c-af64-13f82ed98a5f': '❤️'},
        status: 2,
        time: '2017-01-09T13:53:27.965Z',
        type: 'conversation.message-add',
        version: 2,
      };
      const category = categoryFromEvent(event);

      expect(category & MessageCategory.TEXT).toBe(MessageCategory.TEXT);
      expect(category & MessageCategory.LIKED).toBe(MessageCategory.LIKED);
    });

    it('image message should have category of type IMAGE', () => {
      const event = {
        conversation: '34e7f58e-b834-4d84-b628-b89b295d46c0',
        data: {
          content_length: 47527,
          content_type: 'image/jpeg',
          id: 'b77e8639-a32d-4ba7-88b9-7a0ae461e90d',
          info: {height: 905, nonce: 'b77e8639-a32d-4ba7-88b9-7a0ae461e90d', tag: 'medium', width: 1448},
          otr_key: {},
          sha256: {},
        },
        from: '9b47476f-974d-481c-af64-13f82ed98a5f',
        id: 'da7930dd-4c30-4378-846d-b29e1452bdfb',
        status: 1,
        time: '2017-01-09T13:37:31.941Z',
        type: 'conversation.asset-add',
      };
      const category = categoryFromEvent(event);

      expect(category).toBe(MessageCategory.IMAGE);
    });

    it('image (gif) message should have category of type IMAGE and GIF', () => {
      const event = {
        conversation: '34e7f58e-b834-4d84-b628-b89b295d46c0',
        data: {
          content_length: 9953127,
          content_type: 'image/gif',
          id: '8cc946e4-e450-47c0-87a8-584d5c18b79b',
          info: {height: 450, nonce: '8cc946e4-e450-47c0-87a8-584d5c18b79b', tag: 'medium', width: 450},
          otr_key: {},
          sha256: {},
        },
        from: '9b47476f-974d-481c-af64-13f82ed98a5f',
        id: '1846af80-7755-4b61-885d-4e37ce77e5ff',
        status: 2,
        time: '2017-01-09T13:41:50.170Z',
        type: 'conversation.asset-add',
      };
      const category = categoryFromEvent(event);

      expect(category & MessageCategory.IMAGE).toBe(MessageCategory.IMAGE);
      expect(category & MessageCategory.GIF).toBe(MessageCategory.GIF);
    });

    it('file message should have category of type FILE', () => {
      const event = {
        conversation: '34e7f58e-b834-4d84-b628-b89b295d46c0',
        data: {
          content_length: 199580,
          content_type: 'image/jpeg',
          id: 'aed78bfd-7c98-475b-badd-2c11fd150a63',
          info: {name: '6642.jpg', nonce: '95377495-d203-4071-a02a-5221b75644fa'},
          otr_key: {},
          sha256: {},
          status: 'uploaded',
        },
        from: '9b47476f-974d-481c-af64-13f82ed98a5f',
        id: '95377495-d203-4071-a02a-5221b75644fa',
        status: 2,
        time: '2017-01-09T13:46:14.855Z',
        type: 'conversation.asset-add',
      };
      const category = categoryFromEvent(event);

      expect(category).toBe(MessageCategory.FILE);
    });

    it('ping message should have category of type KNOCK', () => {
      const event = {
        conversation: '34e7f58e-b834-4d84-b628-b89b295d46c0',
        data: {nonce: '6cb452b4-6ae3-496d-90a8-8d7af6d756c8'},
        from: '9b47476f-974d-481c-af64-13f82ed98a5f',
        id: '6cb452b4-6ae3-496d-90a8-8d7af6d756c8',
        status: 2,
        time: '2017-01-09T13:51:00.960Z',
        type: 'conversation.knock',
      };
      const category = categoryFromEvent(event);

      expect(category).toBe(MessageCategory.KNOCK);
    });

    it('location message should have category of type LOCATION', () => {
      const event = {
        conversation: '34e7f58e-b834-4d84-b628-b89b295d46c0',
        data: {
          location: {latitude: 52, longitude: 13, name: 'Alexanderplatz', zoom: 20},
          nonce: 'ae551ad3-2ca5-4d3a-8eec-ef9985996c29',
        },
        from: '9b47476f-974d-481c-af64-13f82ed98a5f',
        id: 'ae551ad3-2ca5-4d3a-8eec-ef9985996c29',
        time: '2017-01-09T13:54:00.960',
        type: 'conversation.location',
      };
      const category = categoryFromEvent(event);

      expect(category).toBe(MessageCategory.LOCATION);
    });

    it('composite message should have category of type COMPOSITE', () => {
      const event = {
        conversation: '34e7f58e-b834-4d84-b628-b89b295d46c0',
        data: {
          items: [
            {text: {content: 'test', mentions: []}},
            {button: {id: '0', text: 'one'}},
            {button: {id: '1', text: 'two'}},
          ],
        },
        from: '6f0778eb-fa36-4261-bd64-c965c3ef6946',
        from_client_id: 'f56a3d2e97c98409',
        id: '58c08888-5d92-41fa-9559-cf7a8cf67c28',
        time: '2020-03-03T13:00:13.476Z',
        type: 'conversation.composite-message-add',
      };
      const category = categoryFromEvent(event);

      expect(category).toBe(MessageCategory.COMPOSITE);
    });
  });
});
