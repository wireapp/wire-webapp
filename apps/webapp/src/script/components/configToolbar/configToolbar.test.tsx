/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import {act, render, screen} from '@testing-library/react';

import userEvent from '@testing-library/user-event';

import {withTheme, withThemeAndRootContext} from 'src/script/auth/util/test/testUtil';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {translateForTest} from 'Util/test/translateForTest';

import {sendCallLogsFeatureToggleName} from 'src/script/featureToggles/startupFeatureToggleNames';

import {ConfigToolbar} from './configToolbar';
import {openDebugToolbar} from './debugToolbarEvents';

const rootProviderWrapper = createRootProviderWrapperForTest(
  createRootContextValueForTest({translate: translateForTest}),
);

describe('ConfigToolbar', () => {
  it('opens the developer menu when requested', () => {
    render(withTheme(<ConfigToolbar />), {wrapper: rootProviderWrapper});

    expect(screen.queryByRole('heading', {name: 'Developer Menu'})).not.toBeInTheDocument();

    act(() => {
      return openDebugToolbar();
    });

    expect(screen.getByRole('heading', {name: 'Developer Menu'})).toBeInTheDocument();
  });

  it.each([false, true])('toggles sending call logs from enabled=%s', async enabled => {
    const navigateTo = jest.fn();
    const rootContextValue = createRootContextValueForTest({
      translate: translateForTest,
      isFeatureToggleEnabled: () => {
        return enabled;
      },
    });
    const wrapper = createRootProviderWrapperForTest({
      ...rootContextValue,
      applicationNavigation: {
        currentPathname: '/app',
        currentSearch: enabled ? '?enabled-features=send-call-logs' : '',
        currentHash: '#preferences',
        navigateTo,
      },
    });
    render(withThemeAndRootContext(<ConfigToolbar />, wrapper));
    act(() => {
      openDebugToolbar();
    });
    await userEvent.click(screen.getByRole('checkbox', {name: sendCallLogsFeatureToggleName}));
    expect(navigateTo).toHaveBeenCalledWith(
      enabled ? '/app#preferences' : '/app?enabled-features=send-call-logs#preferences',
    );
  });
});
