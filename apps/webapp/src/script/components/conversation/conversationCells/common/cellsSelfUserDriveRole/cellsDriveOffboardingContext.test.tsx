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

import {CellsDriveOffboardingProvider} from './cellsDriveOffboardingContext';
import {
  CELLS_ACTION,
  CellsSelfUserDriveRoleProvider,
  useCellsActionPermissions,
  useCellsSelfUserDriveRole,
} from './cellsSelfUserDriveRoleContext';

describe('Drive offboarding permissions', () => {
  it('preserves editor identity while blocking file actions and restores actions when enabled', () => {
    let isOffboarding = true;
    const {result, rerender} = renderHook(
      () => {
        return {
          role: useCellsSelfUserDriveRole(),
          canPerform: useCellsActionPermissions(),
        };
      },
      {
        wrapper: ({children}) => {
          return (
            <CellsDriveOffboardingProvider value={isOffboarding}>
              <CellsSelfUserDriveRoleProvider selfUserDriveRole="editor">{children}</CellsSelfUserDriveRoleProvider>
            </CellsDriveOffboardingProvider>
          );
        },
      },
    );

    expect(result.current.role).toBe('editor');
    for (const action of Object.values(CELLS_ACTION)) {
      expect(result.current.canPerform(action)).toBe(false);
    }

    isOffboarding = false;
    rerender();
    expect(result.current.role).toBe('editor');
    for (const action of Object.values(CELLS_ACTION)) {
      expect(result.current.canPerform(action)).toBe(true);
    }
  });
});
