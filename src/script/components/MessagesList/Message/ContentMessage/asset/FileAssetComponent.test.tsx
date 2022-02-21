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

import ko from 'knockout';
import {ContentMessage} from 'src/script/entity/message/ContentMessage';
import TestPage from 'Util/test/TestPage';
import FileAssetComponent, {FileAssetProps} from './FileAssetComponent';
import {FileAsset} from 'src/script/entity/message/FileAsset';
import {StatusType} from '../../../../../message/StatusType';
import {TeamState} from 'src/script/team/TeamState';

class FileAssetComponentTestPage extends TestPage<FileAssetProps> {
  constructor(props?: FileAssetProps) {
    super(FileAssetComponent, props);
  }

  getFile = () => this.get('[data-uie-name="file"]');

  getFileSize = () => this.get('[data-uie-name="file-size"]').text();
}

describe('FileAssetComponent', () => {
  function mockContentMessage(): ContentMessage {
    const asset = new FileAsset();
    asset.file_name = 'test-file.log';
    asset.file_size = 10485760;

    const message = new ContentMessage();
    message.addAsset(asset);

    return message;
  }

  it('renders file uploads', () => {
    const teamState = {
      isFileSharingReceivingEnabled: ko.pureComputed(() => true),
    } as TeamState;

    const testPage = new FileAssetComponentTestPage({
      message: mockContentMessage(),
      teamState,
    });

    const fileUploadMessage = testPage.getFile();
    expect(fileUploadMessage.exists()).toBeTruthy();
  });

  it('does not render file uploads from timed-out / obfuscated messages', () => {
    const teamState = {
      isFileSharingReceivingEnabled: ko.pureComputed(() => true),
    } as TeamState;

    const message = mockContentMessage();
    message.ephemeral_expires(true);
    message.status(StatusType.SENT);

    const testPage = new FileAssetComponentTestPage({
      message,
      teamState,
    });

    const fileUploadMessage = testPage.getFile();
    expect(fileUploadMessage.exists()).toBeFalsy();
  });

  it('shows the file size in MB', () => {
    const teamState = {
      isFileSharingReceivingEnabled: ko.pureComputed(() => true),
    } as TeamState;

    const testPage = new FileAssetComponentTestPage({
      message: mockContentMessage(),
      teamState,
    });

    const fileSize = testPage.getFileSize();
    expect(fileSize).toBe('10 MB');
  });
});
