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

import type {ReactElement, ReactNode} from 'react';

import {act, renderHook} from '@testing-library/react';
import {maybe, type Maybe} from 'true-myth';

import {SharedDriveUploadStatusProvider, useSharedDriveUploadStatus} from './sharedDriveUploadStatusContext';
import type {SharedDriveMoveStatus} from './sharedDriveUploadStatusContext';
import {useBulkActionStatusReporter, type BulkActionStatusReporter} from './useBulkActionStatusReporter';

const items = [
  {id: 'file-1', name: 'a.txt', isFolder: false},
  {id: 'folder-1', name: 'Reports', isFolder: true},
];

interface ReporterView {
  readonly reporter: BulkActionStatusReporter;
  readonly shown: Maybe<SharedDriveMoveStatus>;
}

const renderReporter = (): ReturnType<typeof renderHook<ReporterView, unknown>> => {
  const wrapper = ({children}: {children: ReactNode}): ReactElement => {
    return <SharedDriveUploadStatusProvider>{children}</SharedDriveUploadStatusProvider>;
  };
  return renderHook(
    (): ReporterView => {
      return {
        reporter: useBulkActionStatusReporter('restore'),
        shown: useSharedDriveUploadStatus().moveStatus,
      };
    },
    {wrapper},
  );
};

describe('useBulkActionStatusReporter', () => {
  it('shows nothing until an action starts', () => {
    const {result} = renderReporter();

    expect(maybe.isNothing(result.current.shown)).toBe(true);
  });

  it('starts a processing status for the action with the captured items and no destination path', () => {
    const {result} = renderReporter();

    act(() => {
      result.current.reporter.start(items);
    });

    expect(maybe.isJust(result.current.shown) && result.current.shown.value).toMatchObject({
      action: 'restore',
      kind: 'processing',
      items,
      destinationPath: '',
    });
  });

  it('updates the same status id when the outcome is reported', () => {
    const {result} = renderReporter();
    act(() => {
      result.current.reporter.start(items);
    });
    const startedId = maybe.isJust(result.current.shown) ? result.current.shown.value.id : undefined;

    act(() => {
      result.current.reporter.report('completed');
    });

    expect(maybe.isJust(result.current.shown) && result.current.shown.value).toMatchObject({
      id: startedId,
      kind: 'completed',
      items,
    });
  });

  it('ignores reports when no action was started', () => {
    const {result} = renderReporter();

    act(() => {
      result.current.reporter.report('failed');
    });

    expect(maybe.isNothing(result.current.shown)).toBe(true);
  });

  it('knows whether the action it started is still processing', () => {
    const {result} = renderReporter();
    expect(result.current.reporter.isProcessing()).toBe(false);

    act(() => {
      result.current.reporter.start(items);
    });
    expect(result.current.reporter.isProcessing()).toBe(true);

    act(() => {
      result.current.reporter.report('completed');
    });
    expect(result.current.reporter.isProcessing()).toBe(false);
  });

  it('clears the status it started', () => {
    const {result} = renderReporter();
    act(() => {
      result.current.reporter.start(items);
    });

    act(() => {
      result.current.reporter.clear();
    });

    expect(maybe.isNothing(result.current.shown)).toBe(true);
  });
});
