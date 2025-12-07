/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import {act, renderHook} from '@testing-library/react';
import * as checkFileSharingPermissionModule from 'Components/Conversation/utils/checkFileSharingPermission';
import * as LocalizerUtil from 'Util/LocalizerUtil';
import * as TimeUtil from 'Util/TimeUtil';

import {useFilePaste} from './useFilePaste';

jest.mock('Components/Conversation/utils/checkFileSharingPermission', () => ({
  checkFileSharingPermission: jest.fn(callback => callback),
}));

jest.mock('Util/LocalizerUtil', () => ({
  t: jest.fn(),
}));

jest.mock('Util/TimeUtil', () => ({
  formatLocale: jest.fn(),
}));

describe('useFilePaste', () => {
  const mockOnFilePasted = jest.fn();
  const mockDate = new Date('2024-01-01');
  const mockFormattedDate = '1 Jan 2024, 12:00';

  beforeEach(() => {
    jest.clearAllMocks();
    (LocalizerUtil.t as jest.Mock).mockImplementation((key, params) => {
      if (key === 'conversationSendPastedFile' && params?.date) {
        return `Pasted file from ${params.date}`;
      }
      return key;
    });
    (TimeUtil.formatLocale as jest.Mock).mockReturnValue(mockFormattedDate);
  });

  it('handles file paste event', () => {
    renderHook(() => useFilePaste({onFilePasted: mockOnFilePasted}));

    const file = new File(['test content'], 'test.txt', {type: 'text/plain', lastModified: mockDate.getTime()});
    const clipboardEvent = new MockClipboardEvent([file]);

    act(() => {
      document.dispatchEvent(clipboardEvent);
    });

    expect(mockOnFilePasted).toHaveBeenCalled();
    const calledWithFile = mockOnFilePasted.mock.calls[0][0];
    expect(calledWithFile instanceof File).toBe(true);
    expect(calledWithFile.name).toBe(`Pasted file from ${mockFormattedDate}.txt`);
    expect(checkFileSharingPermissionModule.checkFileSharingPermission).toHaveBeenCalled();
  });

  it('ignores paste events with text/plain content', () => {
    renderHook(() => useFilePaste({onFilePasted: mockOnFilePasted}));

    const clipboardEvent = new MockClipboardEvent([], ['text/plain']);

    act(() => {
      document.dispatchEvent(clipboardEvent);
    });

    expect(mockOnFilePasted).not.toHaveBeenCalled();
    expect(checkFileSharingPermissionModule.checkFileSharingPermission).not.toHaveBeenCalled();
  });

  it('does nothing when no files are pasted', () => {
    renderHook(() => useFilePaste({onFilePasted: mockOnFilePasted}));

    const clipboardEvent = new MockClipboardEvent([]);

    act(() => {
      document.dispatchEvent(clipboardEvent);
    });

    expect(mockOnFilePasted).not.toHaveBeenCalled();
  });
});

/**
 * Mock implementation of the browser's DataTransfer API
 *
 * Why do we need this?
 * 1. DataTransfer is a browser API not available in Jest's test environment
 * 2. When files are pasted in a real browser, they come as a ClipboardEvent
 *    containing a DataTransfer object with:
 *    - files: List of pasted files
 *    - types: Content types being pasted (e.g., 'text/plain', 'Files')
 * 3. Our hook checks these properties to:
 *    - Filter out text-only pastes
 *    - Handle pasted files
 *
 * This mock allows us to simulate file paste events as they would occur in a real browser.
 */
class MockDataTransfer implements Partial<DataTransfer> {
  readonly files: FileList;
  readonly types: string[];
  readonly items: DataTransferItemList;
  readonly dropEffect: 'none' = 'none';
  readonly effectAllowed: 'none' = 'none';

  constructor(files: File[] = []) {
    this.files = {
      ...files,
      length: files.length,
      item: (index: number) => files[index] || null,
      [Symbol.iterator]: function* () {
        for (let i = 0; i < files.length; i++) {
          yield files[i];
        }
      },
    } as unknown as FileList;
    this.types = [];
    this.items = {
      length: 0,
      add: jest.fn(),
      clear: jest.fn(),
      remove: jest.fn(),
    } as unknown as DataTransferItemList;
  }

  clearData(): void {}
  getData(): string {
    return '';
  }
  setData(): boolean {
    return false;
  }
  setDragImage(): void {}
}

class MockClipboardEvent extends Event {
  readonly clipboardData: DataTransfer;
  constructor(files: File[] = [], types: string[] = []) {
    super('paste');
    const dataTransfer = new MockDataTransfer(files);
    Object.defineProperty(dataTransfer, 'types', {
      value: types,
      enumerable: true,
    });
    this.clipboardData = dataTransfer;
  }
}

global.DataTransfer = MockDataTransfer as unknown as typeof DataTransfer;
global.ClipboardEvent = MockClipboardEvent as unknown as typeof ClipboardEvent;
