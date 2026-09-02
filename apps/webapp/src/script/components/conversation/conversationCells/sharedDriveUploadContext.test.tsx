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

import {renderHook} from '@testing-library/react';

import type {SharedDriveUploadController} from './sharedDriveUploadController';
import {SharedDriveUploadProvider, useSharedDriveUploadController} from './sharedDriveUploadContext';

const controller = {} as SharedDriveUploadController;

describe('useSharedDriveUploadController', () => {
  it('returns the controller supplied by the nearest provider', () => {
    const {result} = renderHook(() => useSharedDriveUploadController(), {
      wrapper: ({children}) => (
        <SharedDriveUploadProvider controller={controller}>{children}</SharedDriveUploadProvider>
      ),
    });

    expect(result.current).toBe(controller);
  });

  it('fails when used outside a provider', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(() => renderHook(() => useSharedDriveUploadController())).toThrow(
      'useSharedDriveUploadController must be used within a SharedDriveUploadProvider',
    );

    consoleError.mockRestore();
  });
});
