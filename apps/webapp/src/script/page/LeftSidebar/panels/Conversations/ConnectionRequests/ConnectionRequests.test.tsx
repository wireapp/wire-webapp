/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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
import {createUuid} from 'Util/uuid';

import {ConnectionRequests} from './ConnectionRequests';

import {generateUser} from '../../../../../../../test/helper/UserGenerator';

const mockOnConnectionRequestClick = jest.fn();

describe('ConnectionRequests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  const user = generateUser({id: createUuid(), domain: 'test.wire.test'});

  it('should display the correct text for one connection request', () => {
    render(<ConnectionRequests connectionRequests={[user]} onConnectionRequestClick={mockOnConnectionRequestClick} />);
    expect(screen.getByText('conversationsConnectionRequestOne')).not.toBeNull();
  });

  it('should display the correct text for multiple connection requests', () => {
    const user2 = generateUser({id: createUuid(), domain: 'test.wire.test'});

    render(
      <ConnectionRequests connectionRequests={[user, user2]} onConnectionRequestClick={mockOnConnectionRequestClick} />,
    );
    expect(screen.getByText('conversationsConnectionRequestMany')).not.toBeNull();
  });
});
