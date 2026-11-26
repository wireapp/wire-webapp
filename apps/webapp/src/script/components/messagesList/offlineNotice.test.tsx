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

import {render} from '@testing-library/react';

import {THEME_ID} from '../../uiKit/identity/theme/theme';
import {StyledApp} from '../../uiKit/layout/styledApp/styledApp';

import {OfflineNotice} from './offlineNotice';

describe.each([THEME_ID.LIGHT, THEME_ID.DARK])('OfflineNotice in the %s', themeId => {
  it('is a status with the offline copy, so that assistive technology announces it', () => {
    const {getByRole} = render(
      <StyledApp themeId={themeId}>
        <OfflineNotice label="outboxOfflineNotice" />
      </StyledApp>,
    );

    expect(getByRole('status')).toHaveTextContent('outboxOfflineNotice');
  });

  it('hides its icon from assistive technology', () => {
    const {getByRole} = render(
      <StyledApp themeId={themeId}>
        <OfflineNotice label="outboxOfflineNotice" />
      </StyledApp>,
    );

    expect(getByRole('status').querySelector('svg')?.closest('[aria-hidden="true"]')).not.toBeNull();
  });
});
