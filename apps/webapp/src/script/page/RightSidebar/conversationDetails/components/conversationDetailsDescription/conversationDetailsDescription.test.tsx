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

import {ConversationDetailsDescription} from './conversationDetailsDescription';

describe('ConversationDetailsDescription', () => {
  it('renders the description heading and text', () => {
    const description = 'This is the channel description';

    render(<ConversationDetailsDescription description={description} />);

    expect(screen.getByText('conversationDetailsDescription')).not.toBeNull();
    expect(screen.getByText(description)).not.toBeNull();
  });

  it('does not render when description is empty', () => {
    const {container} = render(<ConversationDetailsDescription description="" />);

    expect(container.firstChild).toBeNull();
  });

  it('does not render when description is undefined', () => {
    const {container} = render(<ConversationDetailsDescription />);

    expect(container.firstChild).toBeNull();
  });
});
