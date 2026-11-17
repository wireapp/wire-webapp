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

import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {container} from 'tsyringe';

import {withThemeAndRootContext} from '../../../../../auth/util/test/testUtil';
import {
  createExecutingFireAndForgetInvokerForTest,
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from '../../../../../page/testSupport/rootContextTestSupport';
import {CellsRepository} from '../../../../../repositories/cells/cellsRepository';
import {translateForTest} from '../../../../../util/test/translateForTest';
import * as fileUtils from '../../../../../util/util';
import {
  CELLS_SELF_USER_DRIVE_ROLE,
  CellsSelfUserDriveRoleProvider,
} from '../../../../conversation/conversationCells/common/cellsSelfUserDriveRole/cellsSelfUserDriveRoleContext';

import {MultipartAssetPreview} from './multipartAssetPreview';

const assetUuid = '7c9e6679-7425-40de-944b-e07fc1f90ae7';

const createCellsRepositoryFake = (): CellsRepository => {
  const getNode = jest.fn().mockResolvedValue({
    PreSignedGET: {Url: 'https://example.com/full.png'},
    Previews: [{ContentType: 'image/png', PreSignedGET: {Url: 'https://example.com/preview.png'}}],
  });

  return {getNode} as unknown as CellsRepository;
};

const renderPreview = (): void => {
  const rootProviderWrapper = createRootProviderWrapperForTest(
    createRootContextValueForTest({
      fireAndForgetInvoker: createExecutingFireAndForgetInvokerForTest(),
      translate: translateForTest,
    }),
  );

  render(
    withThemeAndRootContext(
      <CellsSelfUserDriveRoleProvider selfUserDriveRole={CELLS_SELF_USER_DRIVE_ROLE.EDITOR}>
        <MultipartAssetPreview
          cellAssets={[{uuid: assetUuid, initialName: 'photo.png', contentType: 'image/png'}]}
          conversationId="conversation-id"
          attachmentsCountCopy="1 file"
          senderName="Alice"
          timestamp={1}
          translate={translateForTest}
        />
      </CellsSelfUserDriveRoleProvider>,
      rootProviderWrapper,
    ),
  );
};

type DownloadTestFunction = (downloadFile: jest.SpyInstance) => void | Promise<void>;
type IsolatedDownloadTestFunction = () => Promise<void>;

function withStubbedFileDownload(testFunction: DownloadTestFunction): IsolatedDownloadTestFunction {
  return async function runWithStubbedFileDownload(): Promise<void> {
    const downloadFile = jest.spyOn(fileUtils, 'forcedDownloadFile').mockResolvedValue(undefined);

    try {
      await testFunction(downloadFile);
    } finally {
      downloadFile.mockRestore();
      container.reset();
    }
  };
}

describe('MultipartAssetPreview', () => {
  it(
    'downloads from the fullscreen preview by looking up the Drive node with the raw asset uuid',
    withStubbedFileDownload(async downloadFile => {
      const cellsRepository = createCellsRepositoryFake();
      container.registerInstance(CellsRepository, cellsRepository);
      renderPreview();

      await userEvent.click(await screen.findByRole('button', {name: 'cells.filePreviewButton.ariaLabel'}));
      await userEvent.click(await screen.findByRole('button', {name: 'cells.imageFullScreenModal.downloadButton'}));

      expect(cellsRepository.getNode).toHaveBeenLastCalledWith({uuid: assetUuid});
      expect(cellsRepository.getNode).not.toHaveBeenCalledWith({uuid: expect.stringContaining('multipart-preview')});
      expect(downloadFile).toHaveBeenCalledWith({url: 'https://example.com/full.png', name: 'photo.png'});
    }),
  );
});
