/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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
import {LegalHoldDot} from 'Components/LegalHoldDot';

describe('LegalHoldDot', () => {
  it('shows a pending icon', () => {
    const {getByTestId} = render(<LegalHoldDot isPending />);
    expect(getByTestId('legal-hold-dot-pending-icon')).not.toBeNull();
  });

  it('is not interactive dot', async () => {
    const interactiveUieData = 'legal-hold-dot';
    const {getByTestId} = await render(<LegalHoldDot dataUieName={interactiveUieData} />);

    const button = getByTestId(interactiveUieData);
    expect(button.getAttribute('disabled')).toBeDefined();
  });

  it('is interactive dot', async () => {
    const interactiveUieData = 'legal-hold-dot';
    const {getByTestId} = await render(<LegalHoldDot isInteractive dataUieName={interactiveUieData} />);

    const button = getByTestId(interactiveUieData);
    expect(button.getAttribute('disabled')).toBeNull();
  });
});
