/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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
import {withTheme} from 'src/script/auth/util/test/TestUtil';
import {MLSStatuses} from 'src/script/E2EIdentity';

import {VerificationBadges} from './VerificationBadges';

describe('VerificationBadges', () => {
  it('is mls verified', async () => {
    const {getByTestId} = render(
      withTheme(<VerificationBadges context="conversation" MLSStatus={MLSStatuses.VALID} />),
    );

    const E2EIdentityStatus = getByTestId('mls-conversation-status');
    expect(E2EIdentityStatus.getAttribute('data-uie-value')).toEqual(MLSStatuses.VALID);
  });

  it('is proteus verified', async () => {
    const {getByTestId} = render(withTheme(<VerificationBadges context="conversation" isProteusVerified />));

    const E2EIdentityStatus = getByTestId('proteus-verified');
    expect(E2EIdentityStatus).not.toBeNull();
  });

  it('is not downloaded', async () => {
    const {getByTestId} = render(
      withTheme(<VerificationBadges context="conversation" MLSStatus={MLSStatuses.NOT_ACTIVATED} />),
    );

    const E2EIdentityStatus = getByTestId('mls-conversation-status');
    expect(E2EIdentityStatus.getAttribute('data-uie-value')).toEqual(MLSStatuses.NOT_ACTIVATED);
  });

  it('is expired', async () => {
    const {getByTestId} = render(
      withTheme(<VerificationBadges context="conversation" MLSStatus={MLSStatuses.EXPIRED} />),
    );

    const E2EIdentityStatus = getByTestId('mls-conversation-status');
    expect(E2EIdentityStatus.getAttribute('data-uie-value')).toEqual(MLSStatuses.EXPIRED);
  });

  it('is revoked', async () => {
    const {getByTestId} = render(
      withTheme(<VerificationBadges context="conversation" MLSStatus={MLSStatuses.REVOKED} />),
    );

    const E2EIdentityStatus = getByTestId('mls-conversation-status');
    expect(E2EIdentityStatus.getAttribute('data-uie-value')).toEqual(MLSStatuses.REVOKED);
  });

  it('is expiring soon', async () => {
    const {getByTestId} = render(
      withTheme(<VerificationBadges context="conversation" MLSStatus={MLSStatuses.EXPIRES_SOON} />),
    );

    const E2EIdentityStatus = getByTestId('mls-conversation-status');
    expect(E2EIdentityStatus.getAttribute('data-uie-value')).toEqual(MLSStatuses.EXPIRES_SOON);
  });
});
