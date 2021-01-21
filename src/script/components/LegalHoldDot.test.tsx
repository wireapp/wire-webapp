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

import ko from 'knockout';
import TestPage from 'Util/test/TestPage';
import LegalHoldDot, {LegalHoldDotProps} from 'Components/LegalHoldDot';
import {LegalHoldModalViewModel} from '../view_model/content/LegalHoldModalViewModel';

class LegalHoldDotPage extends TestPage<LegalHoldDotProps> {
  constructor(props?: LegalHoldDotProps) {
    super(LegalHoldDot, props);
  }

  getPendingIcon = () => this.get('svg[data-uie-name="legal-hold-dot-pending-icon"]');
}

describe('LegalHoldDot', () => {
  it('shows a pending icon', () => {
    const legalHoldModal = {
      showRequestModal: () => Promise.resolve(),
      showUsers: () => Promise.resolve(),
    } as LegalHoldModalViewModel;

    const legalHoldDotPage = new LegalHoldDotPage({
      isPending: true,
      legalHoldModal,
    });

    const isPending = legalHoldDotPage.getPendingIcon().exists();
    expect(isPending).toBe(true);
  });
});
