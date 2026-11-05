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

import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {ThemeProvider} from '@wireapp/react-ui-kit';

import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from '../../../page/testSupport/rootContextTestSupport';
import {translateForTest} from '../../../util/test/translateForTest';

import {ConversationViewerPermissionBanner} from './conversationViewerPermissionBanner';

const renderBanner = (): void => {
  render(
    <ThemeProvider>
      <ConversationViewerPermissionBanner conversationId="conversation-1" />
    </ThemeProvider>,
    {
      wrapper: createRootProviderWrapperForTest(createRootContextValueForTest({translate: translateForTest})),
    },
  );
};

describe('ConversationViewerPermissionBanner', () => {
  it('stays visible and can be dismissed when session storage is unavailable', async () => {
    const sessionStorageGetter = jest.spyOn(window, 'sessionStorage', 'get').mockImplementation(() => {
      throw new Error('storage blocked');
    });

    try {
      renderBanner();

      expect(screen.getByRole('status')).toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', {name: 'accessibility.rightPanel.close'}));

      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    } finally {
      sessionStorageGetter.mockRestore();
    }
  });
});
