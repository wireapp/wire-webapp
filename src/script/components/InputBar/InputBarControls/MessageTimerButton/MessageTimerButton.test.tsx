/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import {fireEvent, render} from '@testing-library/react';
import ko from 'knockout';

import type {Conversation} from 'Repositories/entity/Conversation';
import {TeamState} from 'Repositories/team/TeamState';
import * as Context from 'src/script/ui/ContextMenu';
import {TIME_IN_MILLIS} from 'Util/TimeUtil';

import {MessageTimerButton} from './MessageTimerButton';

describe('MessageTimerButton', () => {
  it('hides the timer button when the feature is disabled', () => {
    const conversation: Partial<Conversation> = {
      hasGlobalMessageTimer: ko.pureComputed(() => false),
      messageTimer: ko.pureComputed(() => 0),
    };

    const mockTeamState: Partial<TeamState> = {
      isSelfDeletingMessagesEnabled: ko.pureComputed(() => false),
    };

    const props = {
      conversation: conversation as Conversation,
      teamState: mockTeamState as TeamState,
    };

    const {queryByTestId} = render(<MessageTimerButton {...props} />);

    expect(queryByTestId('message-timer-button')).toBeNull();
    expect(queryByTestId('message-timer-icon')).toBeNull();
  });

  it('shows the inactive message timer button', () => {
    const conversation: Partial<Conversation> = {
      hasGlobalMessageTimer: ko.pureComputed(() => false),
      messageTimer: ko.pureComputed(() => 0),
    };

    const mockTeamState: Partial<TeamState> = {
      isSelfDeletingMessagesEnabled: ko.pureComputed(() => true),
    };

    const props = {
      conversation: conversation as Conversation,
      teamState: mockTeamState as TeamState,
    };

    const {queryByTestId} = render(<MessageTimerButton {...props} />);

    expect(queryByTestId('message-timer-button')).toBeNull();
    expect(queryByTestId('message-timer-icon')).not.toBeNull();
  });

  it('activates the context menu', () => {
    jest.spyOn(Context, 'showContextMenu').mockClear();

    const conversation: Partial<Conversation> = {
      hasGlobalMessageTimer: ko.pureComputed(() => false),
      messageTimer: ko.pureComputed(() => 0),
    };

    const mockTeamState: Partial<TeamState> = {
      isSelfDeletingMessagesEnabled: ko.pureComputed(() => true),
    };

    const props = {
      conversation: conversation as Conversation,
      teamState: mockTeamState as TeamState,
    };

    const {getByTestId} = render(<MessageTimerButton {...props} />);

    const messageTimerElement = getByTestId('do-set-ephemeral-timer');
    expect(messageTimerElement.getAttribute('data-uie-value')).toBe('enabled');

    expect(Context.showContextMenu).toHaveBeenCalledTimes(0);

    fireEvent.click(messageTimerElement);

    expect(Context.showContextMenu).toHaveBeenCalledTimes(1);
  });

  it('shows the active message timer button', () => {
    const minutes = 5;
    const duration = TIME_IN_MILLIS.MINUTE * minutes;

    const conversation: Partial<Conversation> = {
      hasGlobalMessageTimer: ko.pureComputed(() => false),
      messageTimer: ko.pureComputed(() => duration),
    };

    const mockTeamState: Partial<TeamState> = {
      isSelfDeletingMessagesEnabled: ko.pureComputed(() => true),
    };

    const props = {
      conversation: conversation as Conversation,
      teamState: mockTeamState as TeamState,
    };

    const {queryByTestId, getByText, getByTestId} = render(<MessageTimerButton {...props} />);

    expect(queryByTestId('message-timer-button')).not.toBeNull();
    expect(queryByTestId('message-timer-icon')).toBeNull();

    expect(getByText(minutes.toString())).not.toBeNull();
    expect(getByText('m')).not.toBeNull();
    expect(getByTestId('do-set-ephemeral-timer').getAttribute('data-uie-value')).toBe('enabled');
  });

  it('shows the disabled message timer button when conversation message timer is set', () => {
    const minutes = 10;
    const duration = TIME_IN_MILLIS.MINUTE * minutes;

    const conversation: Partial<Conversation> = {
      hasGlobalMessageTimer: ko.pureComputed(() => true),
      messageTimer: ko.pureComputed(() => duration),
    };

    const mockTeamState: Partial<TeamState> = {
      isSelfDeletingMessagesEnabled: ko.pureComputed(() => true),
    };

    const props = {
      conversation: conversation as Conversation,
      teamState: mockTeamState as TeamState,
    };

    const {queryByTestId, getByText, getByTestId} = render(<MessageTimerButton {...props} />);

    expect(queryByTestId('message-timer-button')).not.toBeNull();
    expect(queryByTestId('message-timer-icon')).toBeNull();
    expect(getByText(minutes.toString())).not.toBeNull();
    expect(getByText('m')).not.toBeNull();
    expect(getByTestId('do-set-ephemeral-timer').getAttribute('data-uie-value')).toBe('disabled');
  });

  it('shows the disabled message timer button when team message timer is enforced', () => {
    const minutes = 10;
    const duration = TIME_IN_MILLIS.MINUTE * minutes;

    const conversation: Partial<Conversation> = {
      hasGlobalMessageTimer: ko.pureComputed(() => false),
      messageTimer: ko.pureComputed(() => duration),
    };

    const mockTeamState: Partial<TeamState> = {
      isSelfDeletingMessagesEnabled: ko.pureComputed(() => true),
      isSelfDeletingMessagesEnforced: ko.pureComputed(() => true),
    };

    const props = {
      conversation: conversation as Conversation,
      teamState: mockTeamState as TeamState,
    };

    const {queryByTestId, getByText, getByTestId} = render(<MessageTimerButton {...props} />);

    expect(queryByTestId('message-timer-button')).not.toBeNull();
    expect(queryByTestId('message-timer-icon')).toBeNull();
    expect(getByText(minutes.toString())).not.toBeNull();
    expect(getByText('m')).not.toBeNull();
    expect(getByTestId('do-set-ephemeral-timer').getAttribute('data-uie-value')).toBe('disabled');
  });

  it(`doesn't activate the context menu on a disabled message timer button`, () => {
    jest.spyOn(Context, 'showContextMenu').mockClear();
    const minutes = 10;
    const duration = TIME_IN_MILLIS.MINUTE * minutes;

    const conversation: Partial<Conversation> = {
      hasGlobalMessageTimer: ko.pureComputed(() => true),
      messageTimer: ko.pureComputed(() => duration),
    };

    const mockTeamState: Partial<TeamState> = {
      isSelfDeletingMessagesEnabled: ko.pureComputed(() => true),
    };

    const props = {
      conversation: conversation as Conversation,
      teamState: mockTeamState as TeamState,
    };

    const {getByTestId} = render(<MessageTimerButton {...props} />);

    const messageTimerElement = getByTestId('do-set-ephemeral-timer');
    expect(messageTimerElement.getAttribute('data-uie-value')).toBe('disabled');

    expect(Context.showContextMenu).toHaveBeenCalledTimes(0);

    fireEvent.click(messageTimerElement);
    expect(Context.showContextMenu).toHaveBeenCalledTimes(0);
  });
});
