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
 */

import {fireEvent, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {withThemeAndRootContext} from '../../../../../../auth/util/test/testUtil';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from '../../../../../../page/testSupport/rootContextTestSupport';

import {PdfAssetOptions} from './pdfAssetOptions';

const renderPdfAssetOptions = (canDownload = true) => {
  const wrapper = createRootProviderWrapperForTest(
    createRootContextValueForTest({
      translate: key => {
        return key;
      },
    }),
  );
  const onOpen = jest.fn();
  const onDownload = jest.fn();

  render(
    withThemeAndRootContext(
      <PdfAssetOptions canDownload={canDownload} onOpen={onOpen} onDownload={onDownload} />,
      wrapper,
    ),
  );

  return {onOpen, onDownload};
};

describe('PdfAssetOptions', () => {
  it('opens without choosing an action, then calls Open once without downloading', async () => {
    const user = userEvent.setup();
    const {onOpen, onDownload} = renderPdfAssetOptions();
    const trigger = screen.getByRole('button', {name: 'cells.options.label'});

    await user.click(trigger);

    expect(onOpen).not.toHaveBeenCalled();
    expect(onDownload).not.toHaveBeenCalled();
    await user.click(screen.getByRole('menuitem', {name: 'cells.options.open'}));

    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onOpen).toHaveBeenCalledWith(trigger);
    expect(onDownload).not.toHaveBeenCalled();
  });

  it('opens the PDF from the keyboard and provides its trigger for focus restoration', async () => {
    const user = userEvent.setup();
    const {onOpen, onDownload} = renderPdfAssetOptions();
    const trigger = screen.getByRole('button', {name: 'cells.options.label'});

    await user.tab();
    expect(trigger).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('menuitem', {name: 'cells.options.open'})).toHaveFocus();
    await user.keyboard('{Enter}');

    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onOpen).toHaveBeenCalledWith(trigger);
    expect(onDownload).not.toHaveBeenCalled();
  });

  it('calls Download once without opening the PDF', async () => {
    const user = userEvent.setup();
    const {onOpen, onDownload} = renderPdfAssetOptions();

    await user.click(screen.getByRole('button', {name: 'cells.options.label'}));
    await user.click(screen.getByRole('menuitem', {name: 'cells.options.download'}));

    expect(onDownload).toHaveBeenCalledTimes(1);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('keeps unavailable downloads disabled and excludes them from keyboard navigation', async () => {
    const user = userEvent.setup();
    const {onOpen, onDownload} = renderPdfAssetOptions(false);
    const trigger = screen.getByRole('button', {name: 'cells.options.label'});

    await user.tab();
    expect(trigger).toHaveFocus();
    await user.keyboard('{Enter}');

    const openItem = screen.getByRole('menuitem', {name: 'cells.options.open'});
    const downloadItem = screen.getByRole('menuitem', {name: 'cells.options.download'});
    expect(openItem).toHaveFocus();
    expect(downloadItem).toHaveAttribute('aria-disabled', 'true');

    await user.keyboard('{ArrowDown}');
    expect(openItem).toHaveFocus();
    fireEvent.click(downloadItem);

    expect(onDownload).not.toHaveBeenCalled();
    expect(onOpen).not.toHaveBeenCalled();
  });
});
