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

import type {ComponentProps, ReactElement} from 'react';

import {act, fireEvent, render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {container} from 'tsyringe';
import ko from 'knockout';
import {noop} from 'noop-esm';
import Long from 'long';

import {Asset as ProtobufAsset} from '@wireapp/protocol-messaging';

import {ContentMessage} from '../../../../../../repositories/entity/message/contentMessage';
import {FileAsset} from '../../../../../../repositories/entity/message/fileAsset';
import {TeamState} from '../../../../../../repositories/team/TeamState';
import {StatusType} from '../../../../../../message/statusType';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from '../../../../../../page/testSupport/rootContextTestSupport';
import {translateForTest} from '../../../../../../util/test/translateForTest';

import {FileAsset as RealFileAssetComponent} from './fileAsset';
import {PdfModalTestStub} from './pdfModalTestStub';
import {createStartupFeatureTogglesFromLocationSearch} from '../../../../../../featureToggles/startupFeatureToggles';
import {AssetRemoteData} from '../../../../../../repositories/assets/assetRemoteData';
import {AssetRepository} from '../../../../../../repositories/assets/assetRepository';
import {AssetTransferState} from '../../../../../../repositories/assets/assetTransferState';
import {FEATURE_STATUS} from '../../../../../../apiClient/team/feature/featureList.types';
import {requireValueForTest} from '../../../../../../page/testSupport/rootContextTestSupport';
import type {MainViewModel} from '../../../../../../viewModel/mainViewModel';

const FileAssetComponent = (props: ComponentProps<typeof RealFileAssetComponent>): ReactElement => {
  return <RealFileAssetComponent {...props} FullscreenModalComponent={PdfModalTestStub} />;
};
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
    asset.original_resource(
      new AssetRemoteData({
        assetKey: 'original',
        assetDomain: 'wire.test',
        otrKey: new Uint8Array(32),
        sha256: new Uint8Array(32),
      }),
    );
    message.ephemeral_expires(expired);
    message.status(StatusType.SENT);
    const restrictedTeam = new TeamState();
    if (!receiving) {
      restrictedTeam.teamFeatures({fileSharing: {status: FEATURE_STATUS.DISABLED}});
    }

    render(<FileAssetComponent message={message} teamState={restrictedTeam} />, {wrapper: rootProviderWrapper});

    expect(load).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'cells.options.label'})).not.toBeInTheDocument();
    load.mockRestore();
  });

  it('does not render or fetch a PDF preview for quoted files', () => {
    const repository = container.resolve(AssetRepository);
    const load = jest.spyOn(repository, 'load').mockResolvedValue(new Blob());
    const previewWrapper = createRootProviderWrapperForTest(
      createRootContextValueForTest({
        translate: translateForTest,
        isFeatureToggleEnabled: createStartupFeatureTogglesFromLocationSearch('?enabled-features=e2e-pdf-preview')
          .isFeatureToggleEnabled,
        mainViewModel: {content: {repositories: {asset: repository}}} as MainViewModel,
      }),
    );
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

    asset.original_resource(
      new AssetRemoteData({
        assetKey: 'original',
        assetDomain: 'wire.test',
        otrKey: new Uint8Array(32),
        sha256: new Uint8Array(32),
      }),
    );

    (IntersectionObserver as jest.Mock).mockClear();
    render(<FileAssetComponent message={message} teamState={teamState} isQuote />, {wrapper: previewWrapper});

    expect((IntersectionObserver as jest.Mock).mock.calls).toHaveLength(0);
    expect(load).not.toHaveBeenCalled();
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.getByText('report')).toBeInTheDocument();
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
    asset.original_resource(
      new AssetRemoteData({
        assetKey: 'original',
        assetDomain: 'wire.test',
        otrKey: new Uint8Array(32),
        sha256: new Uint8Array(32),
      }),
    );
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
      const thumbnailButtons = screen
        .getAllByRole('button', {name: 'cells.filePreviewButton.ariaLabel'})
        .filter(button => {
          return button.tagName === 'BUTTON';
        });
      expect(thumbnailButtons).toHaveLength(1);
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
    asset.original_resource(
      new AssetRemoteData({
        assetKey: 'original',
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
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'cells.options.label'})).not.toBeInTheDocument();
    load.mockRestore();
  });

  it('opens the injected PDF modal and keeps it available during the existing file download', async () => {
    const repository = container.resolve(AssetRepository);
    const png = new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])]);
    const pdf = new Blob(['%PDF-1.7\nvalid test PDF']);
    const previewWrapper = createRootProviderWrapperForTest(
      createRootContextValueForTest({
        translate: translateForTest,
        isFeatureToggleEnabled: createStartupFeatureTogglesFromLocationSearch('?enabled-features=e2e-pdf-preview')
          .isFeatureToggleEnabled,
        mainViewModel: {content: {repositories: {asset: repository}}} as MainViewModel,
      }),
    );
    const message = mockContentMessage('report.pdf');
    const asset = message.getFirstAsset() as FileAsset;
    asset.file_type = 'application/pdf';
    asset.status(AssetTransferState.UPLOADED);
    const originalResource = new AssetRemoteData({
      assetKey: 'original',
      assetDomain: 'wire.test',
      otrKey: new Uint8Array(32),
      sha256: new Uint8Array(32),
    });
    asset.original_resource(originalResource);
    const previewResource = new AssetRemoteData({
      assetKey: 'preview',
      assetDomain: 'wire.test',
      otrKey: new Uint8Array(32),
      sha256: new Uint8Array(32),
    });
    asset.preview_resource(previewResource);
    let resolveDownload: (blob: Blob | undefined) => void = noop;
    const download = jest.spyOn(repository, 'downloadFile');
    const load = jest.spyOn(repository, 'load').mockImplementation(resource => {
      if (resource === previewResource) {
        return Promise.resolve(png);
      }
      if (resource === originalResource) {
        return new Promise<Blob | undefined>(resolve => {
          resolveDownload = resolve;
        });
      }
      return Promise.resolve(pdf);
    });
    const createObjectUrl = jest
      .spyOn(URL, 'createObjectURL')
      .mockReturnValueOnce('blob:thumbnail')
      .mockReturnValueOnce('blob:pdf')
      .mockReturnValue('blob:download');
    const revokeObjectUrl = jest.spyOn(URL, 'revokeObjectURL').mockImplementation(noop);
    const anchorClick = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(noop);

    const {unmount} = render(<FileAssetComponent message={message} teamState={teamState} />, {
      wrapper: previewWrapper,
    });
    const [callback] = requireValueForTest((IntersectionObserver as jest.Mock).mock.calls.at(-1));
    act(() => {
      return callback([{isIntersecting: true} as IntersectionObserverEntry], {} as IntersectionObserver);
    });
    await waitFor(() => {
      expect(screen.getAllByRole('button', {name: 'cells.filePreviewButton.ariaLabel'})).toHaveLength(2);
    });
    const thumbnailButton = requireValueForTest(
      screen.getAllByRole('button', {name: 'cells.filePreviewButton.ariaLabel'}).find(button => {
        return button.tagName === 'BUTTON';
      }),
    );
    fireEvent.click(thumbnailButton);

    const dialog = await screen.findByRole('dialog', {name: 'report.pdf'});
    await waitFor(() => {
      expect(dialog).toHaveAttribute('data-status', 'success');
    });
    expect(dialog).toHaveAttribute('data-context', 'chat');
    expect(dialog).toHaveAttribute('data-preview-type', 'pdf');
    expect(dialog).toHaveAttribute('data-preview-url', 'blob:pdf');
    expect(load).toHaveBeenCalledTimes(2);
    expect(load.mock.calls[0][0]).toBe(previewResource);
    const pdfResource = load.mock.calls[1][0];
    expect(pdfResource).not.toBe(originalResource);
    expect(pdfResource.urlData).toEqual(originalResource.urlData);
    expect(download).not.toHaveBeenCalled();

    expect(thumbnailButton.querySelector('img')).toHaveAttribute('src', 'blob:thumbnail');
    revokeObjectUrl.mockClear();

    fireEvent.click(screen.getByRole('button', {name: 'Download'}));
    await waitFor(() => {
      expect(asset.status()).toBe(AssetTransferState.DOWNLOADING);
    });
    expect(download).toHaveBeenCalledWith(asset);
    expect(screen.getByRole('dialog')).toBe(dialog);
    expect(revokeObjectUrl).not.toHaveBeenCalled();
    expect(load).toHaveBeenCalledTimes(3);
    expect(load.mock.calls[2][0]).toBe(originalResource);

    await act(async () => {
      resolveDownload(pdf);
      await download.mock.results[0].value;
    });
    expect(asset.status()).toBe(AssetTransferState.UPLOADED);
    expect(screen.getByRole('dialog')).toBe(dialog);

    fireEvent.click(screen.getByRole('button', {name: 'Close PDF preview'}));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(thumbnailButton).toHaveFocus();
    });
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:pdf');
    expect(revokeObjectUrl).not.toHaveBeenCalledWith('blob:thumbnail');

    unmount();
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:thumbnail');
    load.mockRestore();
    download.mockRestore();
    createObjectUrl.mockRestore();
    revokeObjectUrl.mockRestore();
    anchorClick.mockRestore();
  });

  it('opens the injected PDF modal from the action menu without triggering a download', async () => {
    const user = userEvent.setup();
    const repository = container.resolve(AssetRepository);
    const png = new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])]);
    const pdf = new Blob(['%PDF-1.7\\nvalid test PDF']);
    const previewWrapper = createRootProviderWrapperForTest(
      createRootContextValueForTest({
        translate: translateForTest,
        isFeatureToggleEnabled: createStartupFeatureTogglesFromLocationSearch('?enabled-features=e2e-pdf-preview')
          .isFeatureToggleEnabled,
        mainViewModel: {content: {repositories: {asset: repository}}} as MainViewModel,
      }),
    );
    const message = mockContentMessage('report.pdf');
    const asset = message.getFirstAsset() as FileAsset;
    asset.file_type = 'application/pdf';
    asset.status(AssetTransferState.UPLOADED);
    asset.original_resource(
      new AssetRemoteData({
        assetKey: 'original',
        assetDomain: 'wire.test',
        otrKey: new Uint8Array(32),
        sha256: new Uint8Array(32),
      }),
    );
    asset.preview_resource(
      new AssetRemoteData({
        assetKey: 'preview',
        assetDomain: 'wire.test',
        otrKey: new Uint8Array(32),
        sha256: new Uint8Array(32),
      }),
    );
    const load = jest.spyOn(repository, 'load').mockImplementation(resource => {
      return Promise.resolve(resource.urlData.assetKey === 'preview' ? png : pdf);
    });
    const download = jest.spyOn(repository, 'downloadFile');
    render(<FileAssetComponent message={message} teamState={teamState} />, {wrapper: previewWrapper});

    const trigger = screen.getByRole('button', {name: 'cells.options.label'});
    expect(trigger.closest('[role="button"]')).toBeNull();
    await user.click(trigger);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(load).not.toHaveBeenCalled();
    expect(download).not.toHaveBeenCalled();
    await user.click(screen.getByRole('menuitem', {name: 'cells.options.open'}));

    const dialog = await screen.findByRole('dialog', {name: 'report.pdf'});
    await waitFor(() => {
      expect(dialog).toHaveAttribute('data-status', 'success');
    });
    expect(dialog).toHaveAttribute('data-context', 'chat');
    expect(dialog).toHaveAttribute('data-preview-type', 'pdf');
    expect(download).not.toHaveBeenCalled();
    expect(load).toHaveBeenCalledTimes(2);

    await user.click(screen.getByRole('button', {name: 'Close PDF preview'}));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
    });

    load.mockRestore();
    download.mockRestore();
  });

  it('downloads through the existing encrypted asset path from the action menu', async () => {
    const user = userEvent.setup();
    const repository = container.resolve(AssetRepository);
    const previewWrapper = createRootProviderWrapperForTest(
      createRootContextValueForTest({
        translate: translateForTest,
        isFeatureToggleEnabled: createStartupFeatureTogglesFromLocationSearch('?enabled-features=e2e-pdf-preview')
          .isFeatureToggleEnabled,
        mainViewModel: {content: {repositories: {asset: repository}}} as MainViewModel,
      }),
    );
    const message = mockContentMessage('report.pdf');
    const asset = message.getFirstAsset() as FileAsset;
    asset.file_type = 'application/pdf';
    asset.status(AssetTransferState.UPLOADED);
    asset.original_resource(
      new AssetRemoteData({
        assetKey: 'original',
        assetDomain: 'wire.test',
        otrKey: new Uint8Array(32),
        sha256: new Uint8Array(32),
      }),
    );
    asset.preview_resource(
      new AssetRemoteData({
        assetKey: 'preview',
        assetDomain: 'wire.test',
        otrKey: new Uint8Array(32),
        sha256: new Uint8Array(32),
      }),
    );
    const load = jest.spyOn(repository, 'load');
    const download = jest.spyOn(repository, 'downloadFile').mockResolvedValue(undefined);
    render(<FileAssetComponent message={message} teamState={teamState} />, {wrapper: previewWrapper});

    await user.click(screen.getByRole('button', {name: 'cells.options.label'}));
    await user.click(screen.getByRole('menuitem', {name: 'cells.options.download'}));

    await waitFor(() => {
      expect(download).toHaveBeenCalledTimes(1);
    });
    expect(download).toHaveBeenCalledWith(asset);
    expect(load).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    load.mockRestore();
    download.mockRestore();
  });

  it('keeps file download behavior for PDFs without a preview thumbnail', async () => {
    const repository = container.resolve(AssetRepository);
    const download = jest.spyOn(repository, 'downloadFile').mockResolvedValue(undefined);
    const message = mockContentMessage('older-report.pdf');
    const asset = message.getFirstAsset() as FileAsset;
    asset.file_type = 'application/pdf';
    asset.status(AssetTransferState.UPLOADED);

    render(<FileAssetComponent message={message} teamState={teamState} />, {wrapper: rootProviderWrapper});
    fireEvent.click(screen.getByRole('button', {name: 'conversationContextMenuDownload older-report.pdf'}));

    await waitFor(() => {
      expect(download).toHaveBeenCalledWith(asset);
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    download.mockRestore();
  });

  it('shows the file size in MB', () => {
    const {queryByText} = render(<FileAssetComponent message={mockContentMessage()} teamState={teamState} />, {
      wrapper: rootProviderWrapper,
    });
    expect(queryByText('10 MB')).not.toBeNull();
  });

  const protocolSize = ProtobufAsset.Original.decode(
    ProtobufAsset.Original.encode({mimeType: 'application/pdf', size: 1_048_576}).finish(),
  ).size;

  it.each([
    ['protocol Long', protocolSize],
    ['structured-cloned Long', structuredClone(protocolSize)],
  ] as const)('shows a size from a %s', (_description, fileSize) => {
    const message = mockContentMessage('report.pdf');
    const asset = message.getFirstAsset() as FileAsset;
    asset.file_size = fileSize as unknown as number;

    render(<FileAssetComponent message={message} teamState={teamState} />, {wrapper: rootProviderWrapper});

    expect(screen.getByTestId('file-size')).toHaveTextContent('1 MB');
  });

  it.each([
    [0, '0 B'],
    [1_048_576, '1 MB'],
    ['0', '0 B'],
    ['1048576', '1 MB'],
  ] as const)('shows valid file size %p', (fileSize, expectedSize) => {
    const message = mockContentMessage('report.pdf');
    const asset = message.getFirstAsset() as FileAsset;
    asset.file_size = fileSize as unknown as number;

    render(<FileAssetComponent message={message} teamState={teamState} />, {wrapper: rootProviderWrapper});

    expect(screen.getByTestId('file-size')).toHaveTextContent(expectedSize);
  });

  it('shows large valid unsigned Long sizes', () => {
    const message = mockContentMessage('report.pdf');
    const asset = message.getFirstAsset() as FileAsset;
    asset.file_size = Long.MAX_UNSIGNED_VALUE as unknown as number;

    render(<FileAssetComponent message={message} teamState={teamState} />, {wrapper: rootProviderWrapper});

    expect(screen.getByTestId('file-size')).toHaveTextContent('16 EB');
  });

  it.each([
    ['missing', undefined],
    ['null', null],
    ['blank', ''],
    ['whitespace', ' '],
    ['unrecognized object', {}],
    ['spoofed Long marker', {__isLong__: true}],
    ['NaN', Number.NaN],
    ['infinite', Number.POSITIVE_INFINITY],
    ['negative', -1],
    ['fractional', 0.5],
    ['invalid text', 'not-a-size'],
    ['outside the protocol range', '1e30'],
    ['malformed Long', {low: 'invalid', high: 0, unsigned: true}],
  ] as const)('does not render a malformed file size (%s)', (_description, fileSize) => {
    const message = mockContentMessage('report.pdf');
    const asset = message.getFirstAsset() as FileAsset;
    asset.file_size = fileSize as unknown as number;

    render(<FileAssetComponent message={message} teamState={teamState} />, {wrapper: rootProviderWrapper});

    expect(screen.queryByTestId('file-size')).not.toBeInTheDocument();
    expect(screen.getByTestId('file-type')).toHaveTextContent('pdf');
  });
});
