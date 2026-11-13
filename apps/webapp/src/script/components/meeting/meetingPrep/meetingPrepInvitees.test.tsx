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

import {act, fireEvent, render, screen} from '@testing-library/react';
import {Maybe} from 'true-myth';

import {MeetingPrepInvitees} from './meetingPrepInvitees';

import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from '../../../page/testSupport/rootContextTestSupport';
import {User} from '../../../repositories/entity/User';
import {translateForTest} from '../../../util/test/translateForTest';

const createUser = (id: string, name: string): User => {
  const user = new User(id, 'wire.test', translateForTest);
  user.name(name);
  return user;
};

const invitees = [createUser('self', 'Kim'), createUser('ada', 'Ada'), createUser('bo', 'Bo')];

const renderInvitees = (organizerId = Maybe.just({id: 'ada', domain: 'wire.test'})): {onModalKeyDown: jest.Mock} => {
  const onModalKeyDown = jest.fn();
  render(
    <div onKeyDown={onModalKeyDown}>
      <MeetingPrepInvitees invitees={invitees} organizerId={organizerId} />
      <button type="button">outside</button>
    </div>,
    {wrapper: createRootProviderWrapperForTest(createRootContextValueForTest({translate: translateForTest}))},
  );
  return {onModalKeyDown};
};

const trigger = (): HTMLElement => {
  return screen.getByTestId('meeting-prep-invitees');
};

describe('MeetingPrepInvitees', () => {
  it('opens the list of invitees with the organizer marked', () => {
    renderInvitees();
    fireEvent.click(trigger());

    const list = screen.getByRole('region', {name: 'meetings.prep.inviteesTitle'});
    expect(trigger()).toHaveAttribute('aria-expanded', 'true');
    expect(list).toHaveTextContent('Kim');
    expect(list).toHaveTextContent('Ada');
    expect(screen.getAllByText('meetings.participant.organizer')).toHaveLength(1);
  });

  it('marks nobody when the organizer is unknown', () => {
    renderInvitees(Maybe.nothing());
    fireEvent.click(trigger());

    expect(screen.queryByText('meetings.participant.organizer')).not.toBeInTheDocument();
  });

  it('closes on Escape without reaching the modal, and gives focus back to the row', () => {
    const {onModalKeyDown} = renderInvitees();
    fireEvent.click(trigger());
    fireEvent.keyDown(screen.getByRole('button', {name: 'meetings.prep.closeInvitees'}), {key: 'Escape'});

    expect(screen.queryByRole('region')).not.toBeInTheDocument();
    expect(onModalKeyDown).not.toHaveBeenCalled();
    expect(trigger()).toHaveFocus();
  });

  it('closes from its close button and on a press outside', () => {
    renderInvitees();
    fireEvent.click(trigger());
    fireEvent.click(screen.getByRole('button', {name: 'meetings.prep.closeInvitees'}));
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
    expect(trigger()).toHaveFocus();

    fireEvent.click(trigger());
    fireEvent.mouseDown(screen.getByRole('button', {name: 'outside'}));
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });

  it('keeps Escape on the list after a click on a name', () => {
    const {onModalKeyDown} = renderInvitees();
    fireEvent.click(trigger());
    const name = screen.getByText('Ada');
    fireEvent.mouseDown(name);
    // A browser moves focus to the nearest focusable ancestor of a clicked name: the list root.
    act(() => {
      trigger().parentElement?.focus();
    });
    fireEvent.keyDown(name, {key: 'Escape'});

    expect(screen.queryByRole('region')).not.toBeInTheDocument();
    expect(onModalKeyDown).not.toHaveBeenCalled();
  });

  it('closes when keyboard focus leaves the list', () => {
    renderInvitees();
    fireEvent.click(trigger());
    act(() => {
      screen.getByRole('button', {name: 'outside'}).focus();
    });

    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });
});
