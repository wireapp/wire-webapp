/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {assertNotNullOrUndefined} from '@sindresorhus/is';

import {MessageCategory} from 'src/script/message/messageCategory';

import {mapEventRecord} from './mapEventRecord';

import {BackupDateTime, BackupMessage, BackupMessageContent, BackupQualifiedId} from '../cPB.library';

type BackupMessageOptions = {
  readonly content: BackupMessageContent;
  readonly lastEditTime?: BackupDateTime | null;
};

function createBackupMessage(options: BackupMessageOptions): BackupMessage {
  const {content, lastEditTime} = options;

  return new BackupMessage(
    'message-id',
    new BackupQualifiedId('conversation-id', ''),
    new BackupQualifiedId('sender-id', ''),
    'client-id',
    new BackupDateTime(new Date('2026-09-30T10:00:00.000Z')),
    content,
    0,
    lastEditTime,
  );
}

describe('mapEventRecord', () => {
  it.each([null, undefined, new BackupDateTime(new Date(0))])(
    'preserves optional edit time %p and a zero primary key',
    lastEditTime => {
      const message = createBackupMessage({content: new BackupMessageContent.Text(''), lastEditTime});

      const actualRecord = mapEventRecord(message);
      assertNotNullOrUndefined(actualRecord);

      expect(actualRecord).toMatchObject({
        edited_time: lastEditTime?.date.toISOString(),
        primary_key: '0',
        data: {content: ''},
        qualified_conversation: {id: 'conversation-id', domain: ''},
      });
    },
  );

  it.each([
    {name: null, expectedCategory: MessageCategory.UNDEFINED},
    {name: '', expectedCategory: MessageCategory.UNDEFINED},
    {name: 'document.txt', expectedCategory: MessageCategory.FILE},
  ])('preserves asset categorization without metadata for $name', options => {
    const {name, expectedCategory} = options;
    const content = new BackupMessageContent.Asset(
      'application/octet-stream',
      0,
      name,
      new Int8Array(),
      new Int8Array(),
      'asset-id',
      null,
      '',
      null,
      null,
    );

    const actualRecord = mapEventRecord(createBackupMessage({content}));
    assertNotNullOrUndefined(actualRecord);

    expect(actualRecord).toMatchObject({
      category: expectedCategory,
      data: {info: {name}, domain: '', content_length: '0'},
    });
  });
});
