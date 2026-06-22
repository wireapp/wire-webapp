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

import {render} from '@testing-library/react';
import ko from 'knockout';

import {ContentMessage} from 'Repositories/entity/message/ContentMessage';
import {FileAsset} from 'Repositories/entity/message/FileAsset';
import {TeamState} from 'Repositories/team/TeamState';
import {StatusType} from 'src/script/message/statusType';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {translate} from 'Util/localizerUtil';
import {translateForTest} from 'Util/test/translateForTest';

import {FileAsset as FileAssetComponent} from './FileAsset';

describe('FileAssetComponent', () => {
  const rootProviderWrapper = createRootProviderWrapperForTest(
    createRootContextValueForTest({translate: translateForTest}),
  );

  function mockContentMessage(): ContentMessage {
    const asset = new FileAsset();
    asset.file_name = 'test-file.log';
    asset.file_size = 10485760;

    const message = new ContentMessage(undefined, translateForTest);
    message.addAsset(asset);

    return message;
  }

  const teamState = {
    isFileSharingReceivingEnabled: ko.pureComputed(() => true),
  } as TeamState;

  it('renders file uploads', () => {
    const props = {
      message: mockContentMessage(),
      teamState,
    };

    const {queryByTestId} = render(<FileAssetComponent {...props} />, {wrapper: rootProviderWrapper});

    expect(queryByTestId('file')).not.toBeNull();
  });

  it('does not render file uploads from timed-out / obfuscated messages', () => {
    const message = mockContentMessage();
    message.ephemeral_expires(true);
    message.status(StatusType.SENT);

    const props = {
      message,
      teamState,
    };

    const {queryByTestId} = render(<FileAssetComponent {...props} />, {wrapper: rootProviderWrapper});
    expect(queryByTestId('file')).toBeNull();
  });

  it('shows the file size in MB', () => {
    const props = {
      message: mockContentMessage(),
      teamState,
    };

    const {queryByText} = render(<FileAssetComponent {...props} />, {wrapper: rootProviderWrapper});
    expect(queryByText('10 MB')).not.toBeNull();
  });
});
