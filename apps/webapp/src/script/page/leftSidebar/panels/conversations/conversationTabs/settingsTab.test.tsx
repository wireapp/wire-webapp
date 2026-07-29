/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import {fireEvent, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {SettingsTab} from './settingsTab';

function renderSettingsTab({isDebugEnabled = true}: {isDebugEnabled?: boolean} = {}) {
  const onOpenDeveloperMenu = jest.fn();
  const onOpenPreferences = jest.fn();

  render(
    <SettingsTab
      isActive={false}
      isDebugEnabled={isDebugEnabled}
      onOpenDeveloperMenu={onOpenDeveloperMenu}
      onOpenPreferences={onOpenPreferences}
      settingsLabel="Settings"
      showNotificationsBadge={false}
    />,
  );

  return {onOpenDeveloperMenu, onOpenPreferences};
}

describe('SettingsTab', () => {
  it('opens preferences when clicked without Alt', async () => {
    const user = userEvent.setup();
    const {onOpenDeveloperMenu, onOpenPreferences} = renderSettingsTab();

    await user.click(screen.getByRole('tab', {name: 'Settings'}));

    expect(onOpenPreferences).toHaveBeenCalledTimes(1);
    expect(onOpenDeveloperMenu).not.toHaveBeenCalled();
  });

  it('opens the developer menu when Alt is held while hovering', async () => {
    const user = userEvent.setup();
    const {onOpenDeveloperMenu, onOpenPreferences} = renderSettingsTab();
    const settingsTab = screen.getByRole('tab', {name: 'Settings'});

    await user.hover(settingsTab);
    await user.keyboard('{Alt>}');
    await user.click(screen.getByRole('tab', {name: 'Developer Menu'}));
    await user.keyboard('{/Alt}');

    expect(onOpenDeveloperMenu).toHaveBeenCalledTimes(1);
    expect(onOpenPreferences).not.toHaveBeenCalled();
  });

  it('keeps the developer menu action while focused after the pointer leaves', async () => {
    const user = userEvent.setup();
    const {onOpenDeveloperMenu, onOpenPreferences} = renderSettingsTab();
    const settingsTab = screen.getByRole('tab', {name: 'Settings'});

    await user.tab();
    await user.hover(settingsTab);
    await user.keyboard('{Alt>}');
    await user.unhover(settingsTab);

    expect(settingsTab).toHaveFocus();
    expect(screen.getByRole('tab', {name: 'Developer Menu'})).toBeInTheDocument();

    fireEvent.click(settingsTab);
    await user.keyboard('{/Alt}');

    expect(onOpenDeveloperMenu).toHaveBeenCalledTimes(1);
    expect(onOpenPreferences).not.toHaveBeenCalled();
  });

  it('keeps normal Settings behavior when debug mode is disabled', async () => {
    const user = userEvent.setup();
    const {onOpenDeveloperMenu, onOpenPreferences} = renderSettingsTab({isDebugEnabled: false});
    const settingsTab = screen.getByRole('tab', {name: 'Settings'});

    await user.hover(settingsTab);
    await user.keyboard('{Alt>}');
    await user.click(screen.getByRole('tab', {name: 'Settings'}));
    await user.keyboard('{/Alt}');

    expect(onOpenPreferences).toHaveBeenCalledTimes(1);
    expect(onOpenDeveloperMenu).not.toHaveBeenCalled();
  });
});
