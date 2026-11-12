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

import {act, render, screen, waitFor} from '@testing-library/react';
import {container} from 'tsyringe';
import ko from 'knockout';

import {ContentMessage} from '../../../../../../repositories/entity/message/contentMessage';
import {FileAsset} from '../../../../../../repositories/entity/message/fileAsset';
import {TeamState} from '../../../../../../repositories/team/TeamState';
import {StatusType} from '../../../../../../message/statusType';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from '../../../../../../page/testSupport/rootContextTestSupport';
import {translateForTest} from '../../../../../../util/test/translateForTest';

import {FileAsset as FileAssetComponent} from './fileAsset';
import {createStartupFeatureTogglesFromLocationSearch} from '../../../../../../featureToggles/startupFeatureToggles';
import {AssetRemoteData} from '../../../../../../repositories/assets/assetRemoteData';
import {AssetRepository} from '../../../../../../repositories/assets/assetRepository';
import {AssetTransferState} from '../../../../../../repositories/assets/assetTransferState';
import {requireValueForTest} from '../../../../../../page/testSupport/rootContextTestSupport';
import type {MainViewModel} from '../../../../../../view_model/MainViewModel';

describe('FileAssetComponent', () => {
  const rootProviderWrapper = createRootProviderWrapperForTest(
    createRootContextValueForTest({
      translate: translateForTest,
      isFeatureToggleEnabled: createStartupFeatureTogglesFromLocationSearch('?enabled-features=e2e-pdf-preview')
        .isFeatureToggleEnabled,
    }),
  );

  function mockContentMessage(fileName: string | undefined = 'test-file.log'): ContentMessage {
    const asset = new FileAsset();
    asset.file_name = fileName;
    asset.file_size = 10485760;

    const message = new ContentMessage(undefined, translateForTest);
    message.addAsset(asset);

    return message;
  }

  const teamState = {
    isFileSharingReceivingEnabled: ko.pureComputed(() => {
      return true;
    }),
  } as TeamState;

  it('renders file uploads', () => {
    const {queryByTestId} = render(<FileAssetComponent message={mockContentMessage()} teamState={teamState} />, {
      wrapper: rootProviderWrapper,
    });

    expect(queryByTestId('file')).not.toBeNull();
  });

  it('renders file uploads without a file name', () => {
    const {queryByTestId} = render(
      <FileAssetComponent message={mockContentMessage(undefined)} teamState={teamState} />,
      {
        wrapper: rootProviderWrapper,
      },
    );

    expect(queryByTestId('file')).not.toBeNull();
  });

  it('does not render file uploads from timed-out / obfuscated messages', () => {
    const message = mockContentMessage();
    message.ephemeral_expires(true);
    message.status(StatusType.SENT);

    const {queryByTestId} = render(<FileAssetComponent message={message} teamState={teamState} />, {
      wrapper: rootProviderWrapper,
    });
    expect(queryByTestId('file')).toBeNull();
  });

  it.each([
    ['disabled receiving', false, false, AssetTransferState.UPLOADED],
    ['expired message', true, true, AssetTransferState.UPLOADED],
    ['pending upload', true, false, AssetTransferState.UPLOAD_PENDING],
    ['failed upload', true, false, AssetTransferState.UPLOAD_FAILED],
  ] as const)('does not fetch PDF previews for %s', (_reason, receiving, expired, status) => {
    const load = jest.spyOn(container.resolve(AssetRepository), 'load');
    const message = mockContentMessage('report.pdf');
    const asset = message.getFirstAsset() as FileAsset;
    asset.file_type = 'application/pdf';
    asset.status(status);
    asset.preview_resource(
      new AssetRemoteData({
        assetKey: 'preview',
        assetDomain: 'wire.test',
        otrKey: new Uint8Array(32),
        sha256: new Uint8Array(32),
      }),
    );
    message.ephemeral_expires(expired);
    message.status(StatusType.SENT);
    const restrictedTeam = new TeamState();
    jest.spyOn(restrictedTeam, 'isFileSharingReceivingEnabled').mockReturnValue(receiving);

    render(<FileAssetComponent message={message} teamState={restrictedTeam} />, {wrapper: rootProviderWrapper});

    expect(load).not.toHaveBeenCalled();
    load.mockRestore();
  });

  it('removes the PDF preview and revokes its URL when the message expires', async () => {
    const png = new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])]);
    const repository = container.resolve(AssetRepository);
    const load = jest.spyOn(repository, 'load').mockResolvedValue(png);
    const previewWrapper = createRootProviderWrapperForTest(
      createRootContextValueForTest({
        translate: translateForTest,
        isFeatureToggleEnabled: createStartupFeatureTogglesFromLocationSearch('?enabled-features=e2e-pdf-preview')
          .isFeatureToggleEnabled,
        mainViewModel: {content: {repositories: {asset: repository}}} as MainViewModel,
      }),
    );
    URL.revokeObjectURL = jest.fn();
    jest.spyOn(URL, 'createObjectURL').mockReturnValue('blob:expiry-preview');
    const message = mockContentMessage('report.pdf');
    message.status(StatusType.SENT);
    const asset = message.getFirstAsset() as FileAsset;
    asset.file_type = 'application/pdf';
    asset.status(AssetTransferState.UPLOADED);
    asset.preview_resource(
      new AssetRemoteData({
        assetKey: 'preview',
        assetDomain: 'wire.test',
        otrKey: new Uint8Array(32),
        sha256: new Uint8Array(32),
      }),
    );
    render(<FileAssetComponent message={message} teamState={teamState} />, {wrapper: previewWrapper});
    const [callback] = requireValueForTest((IntersectionObserver as jest.Mock).mock.calls.at(-1));
    act(() => {
      return callback([{isIntersecting: true} as IntersectionObserverEntry], {} as IntersectionObserver);
    });
    await waitFor(() => {
      return expect(screen.getAllByRole('button')).toHaveLength(2);
    });

    act(() => {
      return message.ephemeral_expires(true);
    });

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(URL.revokeObjectURL).toHaveBeenCalled();
    load.mockRestore();
  });

  it('does not fetch or display an available PDF preview when the feature flag is disabled', () => {
    const load = jest.spyOn(container.resolve(AssetRepository), 'load');
    const message = mockContentMessage('report.pdf');
    const asset = message.getFirstAsset() as FileAsset;
    asset.file_type = 'application/pdf';
    asset.status(AssetTransferState.UPLOADED);
    asset.preview_resource(
      new AssetRemoteData({
        assetKey: 'preview',
        assetDomain: 'wire.test',
        otrKey: new Uint8Array(32),
        sha256: new Uint8Array(32),
      }),
    );
    const disabledWrapper = createRootProviderWrapperForTest(
      createRootContextValueForTest({translate: translateForTest}),
    );

    render(<FileAssetComponent message={message} teamState={teamState} />, {wrapper: disabledWrapper});

    expect(load).not.toHaveBeenCalled();
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.getByText('report')).toBeInTheDocument();
    load.mockRestore();
  });

  it('shows the file size in MB', () => {
    const {queryByText} = render(<FileAssetComponent message={mockContentMessage()} teamState={teamState} />, {
      wrapper: rootProviderWrapper,
    });
    expect(queryByText('10 MB')).not.toBeNull();
  });
});
