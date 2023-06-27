/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {render, fireEvent} from '@testing-library/react';

import {User} from 'src/script/entity/User';
import {ServiceEntity} from 'src/script/integration/ServiceEntity';

import {ConversationDetailsHeader} from './ConversationDetailsHeader';

const participant = new User('id');
const service = new ServiceEntity({id: 'id'});
const getDefaultProps = () => ({
  isActiveGroupParticipant: true,
  canRenameGroup: true,
  displayName: 'Group Chat',
  updateConversationName: jest.fn(),
  isGroup: true,
  userParticipants: new Array(participant),
  serviceParticipants: new Array(service),
  allUsersCount: 0,
  isTeam: false,
});

describe('ConversationDetailsHeader', () => {
  it('renders the display name when not editing', () => {
    const props = getDefaultProps();
    const {getByText} = render(<ConversationDetailsHeader {...props} />);

    const nameElement = getByText(props.displayName);
    expect(nameElement).not.toBe(null);
  });

  it('allows editing the group name', () => {
    const props = getDefaultProps();
    const {getByText, getByTestId} = render(<ConversationDetailsHeader {...props} />);

    const nameElement = getByText(props.displayName);
    fireEvent.click(nameElement);

    const textareaElement = getByTestId('enter-name') as HTMLInputElement;
    expect(textareaElement).not.toBe(null);
  });

  it('calls updateConversationName when pressing Enter to save the renamed conversation', () => {
    const props = getDefaultProps();
    const {getByText, getByTestId} = render(<ConversationDetailsHeader {...props} />);

    const nameElement = getByText(props.displayName);
    fireEvent.click(nameElement);

    const newGroupName = 'Group Name Update';
    const textareaElement = getByTestId('enter-name') as HTMLInputElement;
    fireEvent.change(textareaElement, {target: {value: newGroupName}});
    fireEvent.keyDown(textareaElement, {key: 'Enter', code: 'Enter'});

    expect(props.updateConversationName).toHaveBeenCalledTimes(1);
    expect(props.updateConversationName).toHaveBeenCalledWith(newGroupName);
  });
});
