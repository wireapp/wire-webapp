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

import {StyledApp, THEME_ID} from '@wireapp/react-ui-kit';

import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {translateForTest} from 'Util/test/translateForTest';

import {SharedDriveDropzone} from './sharedDriveDropzone';

const rootProviderWrapper = createRootProviderWrapperForTest(
  createRootContextValueForTest({translate: translateForTest}),
);

const createDataTransfer = (files: File[]) => ({
  files,
  types: ['Files'],
  dropEffect: 'move',
});

const renderDropzone = ({isEnabled = true, onDropFiles = jest.fn()} = {}) => {
  const result = render(
    <StyledApp themeId={THEME_ID.DEFAULT}>
      <SharedDriveDropzone isEnabled={isEnabled} onDropFiles={onDropFiles}>
        <div>Shared Drive content</div>
      </SharedDriveDropzone>
    </StyledApp>,
    {wrapper: rootProviderWrapper},
  );

  const dropzone = result.container.querySelector('[data-uie-name="shared-drive-dropzone"]');

  if (!dropzone) {
    throw new Error('Shared Drive dropzone was not rendered');
  }

  return {dropzone, onDropFiles};
};

describe('SharedDriveDropzone', () => {
  it('shows the Shared Drive upload overlay while files are dragged over the tab', () => {
    const {dropzone} = renderDropzone();

    fireEvent.dragEnter(dropzone, {dataTransfer: createDataTransfer([])});

    expect(screen.getByRole('status')).toHaveAttribute('aria-hidden', 'false');
    expect(screen.getByText('sharedDriveDropOverlayTitle')).toBeInTheDocument();
    expect(screen.getByText('sharedDriveDropOverlayDescription')).toBeInTheDocument();
  });

  it('dispatches dropped files without using the conversation attachment composer', () => {
    const file = new File(['content'], 'document.txt', {type: 'text/plain'});
    const onDropFiles = jest.fn();
    const {dropzone} = renderDropzone({onDropFiles});

    fireEvent.drop(dropzone, {dataTransfer: createDataTransfer([file])});

    expect(onDropFiles).toHaveBeenCalledWith([file]);
  });

  it('clears the overlay after leaving the dropzone', () => {
    const {dropzone} = renderDropzone();

    fireEvent.dragEnter(dropzone, {dataTransfer: createDataTransfer([])});
    fireEvent.dragLeave(dropzone, {dataTransfer: createDataTransfer([])});

    expect(screen.getByRole('status', {hidden: true})).toHaveAttribute('aria-hidden', 'true');
  });

  it('does not show the upload affordance while the Shared Drive target is disabled', () => {
    const {dropzone} = renderDropzone({isEnabled: false});

    fireEvent.dragEnter(dropzone, {dataTransfer: createDataTransfer([])});

    expect(screen.getByRole('status', {hidden: true})).toHaveAttribute('aria-hidden', 'true');
  });
});
