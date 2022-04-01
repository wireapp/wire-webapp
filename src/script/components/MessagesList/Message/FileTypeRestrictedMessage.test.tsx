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

import TestPage from 'Util/test/TestPage';
import {FileTypeRestrictedMessage as FileTypeRestrictedMessageEntity} from 'src/script/entity/message/FileTypeRestrictedMessage';
import FileTypeRestrictedMessage, {FileTypeRestrictedMessageProps} from './FileTypeRestrictedMessage';

class FileTypeRestrictedMessagePage extends TestPage<FileTypeRestrictedMessageProps> {
  constructor(props?: FileTypeRestrictedMessageProps) {
    super(FileTypeRestrictedMessage, props);
  }

  getFileTypeRestrictedMessageText = (isIncoming?: boolean) =>
    this.get(
      `[data-uie-name="filetype-restricted-message-text"]${
        isIncoming ? '[data-uie-value="incoming"]' : '[data-uie-value="outgoing"]'
      }`,
    );
}

const createFileTypeRestrictedMessage = (
  partialFileTypeRestrictedMessage: Partial<FileTypeRestrictedMessageEntity>,
) => {
  const FileTypeRestrictedMessage: Partial<FileTypeRestrictedMessageEntity> = {
    fileExt: 'txt',
    isIncoming: false,
    name: 'name',
    ...partialFileTypeRestrictedMessage,
  };
  return FileTypeRestrictedMessage as FileTypeRestrictedMessageEntity;
};

describe('FileTypeRestrictedMessage', () => {
  it('shows incoming message', async () => {
    const fileTypeRestrictedMessagePage = new FileTypeRestrictedMessagePage({
      message: createFileTypeRestrictedMessage({
        isIncoming: true,
      }),
    });

    expect(fileTypeRestrictedMessagePage.getFileTypeRestrictedMessageText(true).exists()).toBe(true);
  });

  it('shows outgoing message', async () => {
    const fileTypeRestrictedMessagePage = new FileTypeRestrictedMessagePage({
      message: createFileTypeRestrictedMessage({
        isIncoming: false,
      }),
    });

    expect(fileTypeRestrictedMessagePage.getFileTypeRestrictedMessageText(false).exists()).toBe(true);
  });
});
