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

import {act, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {ThemeProvider} from '@wireapp/react-ui-kit';

import {AVATAR_SIZE} from 'Components/avatar';
import {User} from 'Repositories/entity/User';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {translateForTest} from 'Util/test/translateForTest';
import type {Translate} from 'Util/localizerUtil';

import {ParticipantAvatarTooltip} from './participantAvatarTooltip';

const createUser = (id: string, name: string) => {
  const user = new User(id, 'example.com', translateForTest);
  user.name(name);
  return user;
};

const translateForTooltip: Translate = (key, substitutions) => {
  if (key === 'meetings.participant.nameWithOrganizer' && substitutions) {
    return `${substitutions.name} (${substitutions.organizer})`;
  }

  return translateForTest(key);
};

const renderParticipantAvatarTooltip = (participant: User, organizer?: User, index = 0) => {
  const rootProviderWrapper = createRootProviderWrapperForTest(
    createRootContextValueForTest({translate: translateForTooltip}),
  );
  const result = render(
    <ThemeProvider>
      <ParticipantAvatarTooltip
        participant={participant}
        getLabel={name =>
          participant === organizer ? `${name} (${translateForTest('meetings.participant.organizer')})` : name
        }
        index={index}
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

    const {container} = renderParticipantAvatarTooltip(organizer, organizer);

    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Kim Organizer (meetings.participant.organizer)');
    fireEvent.mouseEnter(screen.getByRole('presentation'));
    expect(screen.getByText('Kim Organizer (meetings.participant.organizer)')).toBeInTheDocument();
    container.removeAttribute('id');
  });

  it('updates the tooltip and aria-label when the participant name changes', async () => {
    const participant = createUser('participant', 'Alice Anderson');

    renderParticipantAvatarTooltip(participant);
    act(() => participant.name('Alex Anderson'));

    await waitFor(() => {
      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Alex Anderson');
    });
  });

  it('uses the unavailable-user label when the participant is unavailable', () => {
    const participant = createUser('', '');

    renderParticipantAvatarTooltip(participant);

    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'unavailableUser');
  });

  it('shows the name belonging to the hovered stacked avatar', () => {
    const firstParticipant = createUser('first', 'First Participant');
    const secondParticipant = createUser('second', 'Second Participant');
    const thirdParticipant = createUser('third', 'Third Participant');
    const rootProviderWrapper = createRootProviderWrapperForTest(
      createRootContextValueForTest({translate: translateForTooltip}),
    );

    const result = render(
      <ThemeProvider>
        <>
          <ParticipantAvatarTooltip participant={firstParticipant} avatarSize={AVATAR_SIZE.X_SMALL} />
          <ParticipantAvatarTooltip participant={secondParticipant} index={1} avatarSize={AVATAR_SIZE.X_SMALL} />
          <ParticipantAvatarTooltip participant={thirdParticipant} index={2} avatarSize={AVATAR_SIZE.X_SMALL} />
        </>
      </ThemeProvider>,
      {wrapper: rootProviderWrapper},
    );
    result.container.id = 'wire-app';

    const tooltipWrappers = screen.getAllByRole('presentation');
    fireEvent.mouseEnter(tooltipWrappers[1]);

    expect(screen.getByText('Second Participant')).toBeInTheDocument();
  });
});
