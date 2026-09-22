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

import {render, screen, waitFor} from '@testing-library/react';

import {Opacity} from './animation';

describe('animation', () => {
  it('applies transition classes to its owned DOM node under React 19', async function (): Promise<void> {
    const {rerender} = render(
      <Opacity in={false}>
        <span>Animated content</span>
      </Opacity>,
    );
    const transitionNode = screen.getByText('Animated content').parentElement;

    expect(transitionNode).not.toBeNull();

    rerender(
      <Opacity in timeout={0}>
        <span>Animated content</span>
      </Opacity>,
    );

    await waitFor(() => expect(transitionNode?.className).toMatch(/-enter-done/));
  });
});
