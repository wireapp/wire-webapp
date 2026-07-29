/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {SidebarTabs} from 'src/script/page/leftSidebar/panels/conversations/useSidebarStore';

import {ConversationTab} from './conversationTab';

describe('ConversationTab', () => {
  it('exposes the Alt modifier to alternate tab actions', async () => {
    const user = userEvent.setup();
    const onChangeTab = jest.fn();
    const onMouseEnter = jest.fn();

    render(
      <ConversationTab
        title="Settings"
        type={SidebarTabs.PREFERENCES}
        conversationTabIndex={1}
        onChangeTab={onChangeTab}
        Icon={<span />}
        dataUieName="go-preferences"
        onMouseEnter={onMouseEnter}
      />,
    );

    await user.keyboard('{Alt>}');
    await user.hover(screen.getByRole('tab', {name: 'Settings'}));
    await user.click(screen.getByRole('tab', {name: 'Settings'}));
    await user.keyboard('{/Alt}');

    expect(onMouseEnter).toHaveBeenCalledTimes(1);
    expect(onChangeTab).toHaveBeenCalledWith(SidebarTabs.PREFERENCES, expect.objectContaining({altKey: true}));
  });
});
