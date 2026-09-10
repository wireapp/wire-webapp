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
import {Maybe} from 'true-myth';

import {withTheme} from 'src/script/auth/util/test/testUtil';
import {MLSStatuses} from 'src/script/e2eIdentity';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';

import {VerificationBadges, getUserVerificationBadgeLabel} from './verificationBadges';
import {translateForTest} from 'Util/test/translateForTest';

const rootContextValue = createRootContextValueForTest({translate: translateForTest});
const rootProviderWrapper = createRootProviderWrapperForTest(rootContextValue);

describe('VerificationBadges', () => {
  it('is mls verified', async () => {
    const {getByTestId} = render(
      withTheme(<VerificationBadges context="conversation" MLSStatus={MLSStatuses.VALID} />),
      {wrapper: rootProviderWrapper},
    );

    const E2EIdentityStatus = getByTestId('mls-conversation-status');
    expect(E2EIdentityStatus.getAttribute('data-uie-value')).toEqual(MLSStatuses.VALID);
  });

  it('is proteus verified', async () => {
    const {getByTestId} = render(withTheme(<VerificationBadges context="conversation" isProteusVerified />), {
      wrapper: rootProviderWrapper,
    });

    const E2EIdentityStatus = getByTestId('proteus-verified');
    expect(E2EIdentityStatus).not.toBeNull();
  });

  it('is not downloaded', async () => {
    const {getByTestId} = render(
      withTheme(<VerificationBadges context="conversation" MLSStatus={MLSStatuses.NOT_ACTIVATED} />),
      {wrapper: rootProviderWrapper},
    );

    const E2EIdentityStatus = getByTestId('mls-conversation-status');
    expect(E2EIdentityStatus.getAttribute('data-uie-value')).toEqual(MLSStatuses.NOT_ACTIVATED);
  });

  it('is expired', async () => {
    const {getByTestId} = render(
      withTheme(<VerificationBadges context="conversation" MLSStatus={MLSStatuses.EXPIRED} />),
      {wrapper: rootProviderWrapper},
    );

    const E2EIdentityStatus = getByTestId('mls-conversation-status');
    expect(E2EIdentityStatus.getAttribute('data-uie-value')).toEqual(MLSStatuses.EXPIRED);
  });

  it('is revoked', async () => {
    const {getByTestId} = render(
      withTheme(<VerificationBadges context="conversation" MLSStatus={MLSStatuses.REVOKED} />),
      {wrapper: rootProviderWrapper},
    );

    const E2EIdentityStatus = getByTestId('mls-conversation-status');
    expect(E2EIdentityStatus.getAttribute('data-uie-value')).toEqual(MLSStatuses.REVOKED);
  });

  it('is expiring soon', async () => {
    const {getByTestId} = render(
      withTheme(<VerificationBadges context="conversation" MLSStatus={MLSStatuses.EXPIRES_SOON} />),
      {wrapper: rootProviderWrapper},
    );

    const E2EIdentityStatus = getByTestId('mls-conversation-status');
    expect(E2EIdentityStatus.getAttribute('data-uie-value')).toEqual(MLSStatuses.EXPIRES_SOON);
  });
});

describe('getUserVerificationBadgeLabel', () => {
  it('returns MLS verified label for VALID status', () => {
    const label = getUserVerificationBadgeLabel(translateForTest, {
      mlsStatus: Maybe.just(MLSStatuses.VALID),
      isProteusVerified: false,
    });
    expect(label).toBe(translateForTest('E2EI.userDevicesVerified'));
  });

  it('returns Proteus device verified label when isProteusVerified is true', () => {
    const label = getUserVerificationBadgeLabel(translateForTest, {
      mlsStatus: Maybe.nothing(),
      isProteusVerified: true,
    });
    expect(label).toBe(translateForTest('proteusDeviceVerified'));
  });

  it('returns composed labels when both MLS and Proteus are verified', () => {
    const label = getUserVerificationBadgeLabel(translateForTest, {
      mlsStatus: Maybe.just(MLSStatuses.VALID),
      isProteusVerified: true,
    });
    expect(label).toBe(`${translateForTest('E2EI.userDevicesVerified')}, ${translateForTest('proteusDeviceVerified')}`);
  });

  it('returns undefined when neither MLS nor Proteus is verified', () => {
    const label = getUserVerificationBadgeLabel(translateForTest, {
      mlsStatus: Maybe.nothing(),
      isProteusVerified: false,
    });
    expect(label).toBeUndefined();
  });
});
