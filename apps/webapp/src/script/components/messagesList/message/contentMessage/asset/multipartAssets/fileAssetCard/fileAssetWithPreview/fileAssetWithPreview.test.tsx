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

import {fireEvent, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {container} from 'tsyringe';

import {FileAssetWithPreview} from './fileAssetWithPreview';

import {withThemeAndRootContext} from '../../../../../../../../auth/util/test/testUtil';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from '../../../../../../../../page/testSupport/rootContextTestSupport';
import {CellsRepository} from '../../../../../../../../repositories/cells/cellsRepository';
import {translateForTest} from '../../../../../../../../util/test/translateForTest';

describe('Cells FileAssetWithPreview', () => {
  const props = {
    id: 'pdf-preview',
    src: 'https://example.com/report.pdf',
    extension: 'pdf',
    name: 'report',
    size: '1 MB',
    imagePreviewUrl: 'https://example.com/thumbnail.png',
    isLoading: true,
    isError: false,
    senderName: 'Sender',
    timestamp: 1700000000000,
  };
  const wrapper = createRootProviderWrapperForTest(createRootContextValueForTest({translate: translateForTest}));

  beforeEach(() => {
    container.registerInstance(CellsRepository, {} as CellsRepository);
  });

  afterEach(() => {
    container.reset();
  });

  it('opens the existing preview dialog while the original file is loading', async () => {
    render(withThemeAndRootContext(<FileAssetWithPreview {...props} src={undefined} />, wrapper));
    const button = screen.getByRole('button', {name: 'cells.options.open'});
    const image = screen.getByRole('presentation', {hidden: true});
    expect(image).not.toBeVisible();
    fireEvent.load(image);
    expect(image).toBeVisible();

    await userEvent.click(button);

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(button).toHaveAttribute('aria-haspopup', 'dialog');
  });

  it('keeps the unavailable-file fallback and disables opening an unavailable asset', () => {
    render(withThemeAndRootContext(<FileAssetWithPreview {...props} isError />, wrapper));

    expect(screen.getByRole('button', {name: 'cells.options.open'})).toBeDisabled();
    expect(screen.queryByText('cells.unavailableFilePreview')).not.toBeInTheDocument();
    expect(screen.getAllByText('cells.unavailableFile').length).toBeGreaterThan(0);
  });

  it('keeps the unavailable-preview message when the file has no thumbnail', () => {
    render(
      withThemeAndRootContext(
        <FileAssetWithPreview {...props} imagePreviewUrl={undefined} isLoading={false} />,
        wrapper,
      ),
    );

    expect(screen.getByText('cells.unavailableFilePreview')).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'cells.options.open'})).toBeEnabled();
  });
});
