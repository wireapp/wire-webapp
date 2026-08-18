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

import {fireEvent, render, screen} from '@testing-library/react';
import {ThemeProvider} from '@wireapp/react-ui-kit';

import {AVATAR_SIZE} from 'Components/avatar';
import {User} from 'Repositories/entity/User';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {translateForTest} from 'Util/test/translateForTest';

import {ParticipantAvatarTooltip} from './participantAvatarTooltip';

const createUser = (id: string, name: string) => {
  const user = new User(id, 'example.com', translateForTest);
  user.name(name);
  return user;
};

const renderParticipantAvatarTooltip = (participant: User, organizer?: User) => {
  const rootProviderWrapper = createRootProviderWrapperForTest(
    createRootContextValueForTest({translate: translateForTest}),
  );
  const result = render(
    <ThemeProvider>
      <ParticipantAvatarTooltip
        participant={participant}
        organizer={organizer?.qualifiedId}
        index={0}
        avatarSize={AVATAR_SIZE.X_SMALL}
        avatarRingColor="black"
      />
    </ThemeProvider>,
    {wrapper: rootProviderWrapper},
  );

  result.container.id = 'wire-app';
  return result;
};

describe('ParticipantAvatarTooltip', () => {
  it('shows and dismisses the participant name on hover', () => {
    const participant = createUser('participant', 'Alice Anderson');
    const {container} = renderParticipantAvatarTooltip(participant);
    const tooltipWrapper = screen.getByRole('presentation');

    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Alice Anderson');
    expect(screen.getByRole('button')).not.toHaveAttribute('title');
    expect(screen.queryByText('Alice Anderson')).not.toBeInTheDocument();

    fireEvent.mouseEnter(tooltipWrapper);
    expect(screen.getByText('Alice Anderson')).toBeInTheDocument();

    fireEvent.mouseLeave(tooltipWrapper);
    expect(screen.queryByText('Alice Anderson')).not.toBeInTheDocument();
    container.removeAttribute('id');
  });

  it('adds the localized organizer label', () => {
    const organizer = createUser('organizer', 'Kim Organizer');

    renderParticipantAvatarTooltip(organizer, organizer);

    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Kim Organizer (meetings.participant.organizer)');
  });
});
