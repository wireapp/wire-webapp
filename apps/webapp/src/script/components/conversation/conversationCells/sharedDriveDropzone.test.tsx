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

import {fireEvent, render, screen, waitFor} from '@testing-library/react';

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

const renderDropzone = ({
  isEnabled = true,
  isFileDropAllowed = true,
  onDragStateReset,
  onDropFiles = jest.fn(),
  onDropReadError = jest.fn(),
}: {
  isEnabled?: boolean;
  isFileDropAllowed?: boolean;
  onDragStateReset?: () => void;
  onDropFiles?: jest.Mock;
  onDropReadError?: jest.Mock;
} = {}) => {
  const result = render(
    <StyledApp themeId={THEME_ID.DEFAULT}>
      <SharedDriveDropzone
        isEnabled={isEnabled}
        isFileDropAllowed={isFileDropAllowed}
        onDragStateReset={onDragStateReset}
        onDropFiles={onDropFiles}
        onDropReadError={onDropReadError}
      >
        <div>Shared Drive content</div>
      </SharedDriveDropzone>
    </StyledApp>,
    {wrapper: rootProviderWrapper},
  );

  const dropzone = result.container.querySelector('[data-uie-name="shared-drive-dropzone"]');

  if (!dropzone) {
    throw new Error('Shared Drive dropzone was not rendered');
  }

  return {dropzone, onDropFiles, onDropReadError};
};

describe('SharedDriveDropzone', () => {
  it('shows the Shared Drive upload overlay while files are dragged over the tab', () => {
    const {dropzone} = renderDropzone();

    fireEvent.dragEnter(dropzone, {dataTransfer: createDataTransfer([])});

    expect(screen.getByRole('status')).toHaveAttribute('aria-hidden', 'false');
    expect(screen.getByText('sharedDriveDropOverlayTitle')).toBeInTheDocument();
    expect(screen.getByText('sharedDriveDropOverlayDescription')).toBeInTheDocument();
  });

  it('dispatches dropped files without using the conversation attachment composer', async () => {
    const file = new File(['content'], 'document.txt', {type: 'text/plain'});
    const onDropFiles = jest.fn();
    const {dropzone} = renderDropzone({onDropFiles});

    fireEvent.drop(dropzone, {dataTransfer: createDataTransfer([file])});

    await waitFor(() => expect(onDropFiles).toHaveBeenCalledWith([file]));
  });

  it('dispatches all dropped files for Shared Drive multi-file upload', async () => {
    const files = [
      new File(['first'], 'first.txt', {type: 'text/plain'}),
      new File(['second'], 'second.png', {type: 'image/png'}),
      new File(['third'], 'third.pdf', {type: 'application/pdf'}),
    ];
    const onDropFiles = jest.fn();
    const {dropzone} = renderDropzone({onDropFiles});

    fireEvent.drop(dropzone, {dataTransfer: createDataTransfer(files)});

    await waitFor(() => expect(onDropFiles).toHaveBeenCalledTimes(1));
    expect(onDropFiles).toHaveBeenCalledWith(files);
  });

  it('reports folder discovery failure without dispatching a partial upload', async () => {
    const onDropFiles = jest.fn();
    const onDropReadError = jest.fn();
    const {dropzone} = renderDropzone({onDropFiles, onDropReadError});
    const failedDirectory = {
      isDirectory: true,
      isFile: false,
      name: 'Marketing',
      fullPath: '/Marketing',
      createReader: () => ({
        readEntries: (_success: unknown, failure: (error: DOMException) => void) =>
          failure(new DOMException('Directory unavailable', 'NotFoundError')),
      }),
    };
    const dataTransfer = {
      files: [],
      items: [{webkitGetAsEntry: () => failedDirectory}],
      types: ['Files'],
      dropEffect: 'move',
    };

    fireEvent.drop(dropzone, {dataTransfer});

    await waitFor(() => expect(onDropReadError).toHaveBeenCalledTimes(1));
    expect(onDropFiles).not.toHaveBeenCalled();
  });

  it('clears the overlay after leaving the dropzone', () => {
    const {dropzone} = renderDropzone();

    fireEvent.dragEnter(dropzone, {dataTransfer: createDataTransfer([])});
    fireEvent.dragLeave(dropzone, {dataTransfer: createDataTransfer([])});

    expect(screen.getByRole('status', {hidden: true})).toHaveAttribute('aria-hidden', 'true');
  });

  it('clears the overlay when the file is released outside the dropzone', () => {
    const onDragStateReset = jest.fn();
    const {dropzone} = renderDropzone({onDragStateReset});

    fireEvent.dragEnter(dropzone, {dataTransfer: createDataTransfer([])});
    const overlayStatus = screen.getByRole('status');

    expect(overlayStatus).toHaveAttribute('aria-hidden', 'false');

    fireEvent.drop(window, {dataTransfer: createDataTransfer([])});

    expect(overlayStatus).toHaveAttribute('aria-hidden', 'true');
    expect(onDragStateReset).toHaveBeenCalledTimes(1);
  });

  it('does not show the upload affordance while the Shared Drive target is disabled', () => {
    const {dropzone} = renderDropzone({isEnabled: false});

    fireEvent.dragEnter(dropzone, {dataTransfer: createDataTransfer([])});

    expect(screen.getByRole('status', {hidden: true})).toHaveAttribute('aria-hidden', 'true');
  });

  it('does not dispatch dropped files while direct upload is disabled', () => {
    const file = new File(['content'], 'document.txt', {type: 'text/plain'});
    const onDropFiles = jest.fn();
    const {dropzone} = renderDropzone({isEnabled: false, onDropFiles});

    fireEvent.drop(dropzone, {dataTransfer: createDataTransfer([file])});

    expect(onDropFiles).not.toHaveBeenCalled();
  });

  it('shows the restricted overlay while a viewer drags files over Shared Drive', () => {
    const {dropzone} = renderDropzone({isFileDropAllowed: false});

    fireEvent.dragEnter(dropzone, {dataTransfer: createDataTransfer([])});

    expect(screen.getByText('conversationFileUploadRestrictedOverlayTitle').closest('[aria-hidden]')).toHaveAttribute(
      'aria-hidden',
      'false',
    );
    expect(screen.getByText('conversationFileUploadRestrictedOverlayDescription')).toBeInTheDocument();
  });

  it('does not dispatch dropped files for viewers', () => {
    const file = new File(['content'], 'document.txt', {type: 'text/plain'});
    const onDropFiles = jest.fn();
    const {dropzone} = renderDropzone({isFileDropAllowed: false, onDropFiles});

    fireEvent.drop(dropzone, {dataTransfer: createDataTransfer([file])});

    expect(onDropFiles).not.toHaveBeenCalled();
  });
});
