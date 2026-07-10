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

import {User} from 'Repositories/entity/User';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {translateForTest} from 'Util/test/translateForTest';

import {StackedAvatars} from './stackedAvatars';

const createUser = (id: string, name: string) => {
  const user = new User(id, 'example.com', translateForTest);
  user.name(name);
  return user;
};

const renderStackedAvatars = (participants: User[]) => {
  const rootProviderWrapper = createRootProviderWrapperForTest(
    createRootContextValueForTest({translate: translateForTest}),
  );

  return render(<StackedAvatars participants={participants} />, {wrapper: rootProviderWrapper});
};

describe('StackedAvatars', () => {
  it('renders stacked avatars without overflow for four participants', () => {
    const participants = [
      createUser('1', 'Alice Anderson'),
      createUser('2', 'Bob Baker'),
      createUser('3', 'Charlie Clark'),
      createUser('4', 'Dana Davis'),
    ];

    renderStackedAvatars(participants);

    expect(screen.getByTestId('stacked-avatars')).toBeInTheDocument();
    expect(screen.queryByText('+1')).not.toBeInTheDocument();
  });

  it('renders four avatars and overflow count when more than four participants are provided', () => {
    const participants = Array.from({length: 17}, (_, index) => createUser(`${index + 1}`, `User ${index + 1}`));

    renderStackedAvatars(participants);

    expect(screen.getByText('+13')).toBeInTheDocument();
  });

  it('renders +1 overflow for exactly five participants', () => {
    const participants = Array.from({length: 5}, (_, index) => createUser(`${index + 1}`, `User ${index + 1}`));

    renderStackedAvatars(participants);

    expect(screen.getByText('+1')).toBeInTheDocument();
  });
});
