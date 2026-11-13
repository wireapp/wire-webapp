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

import {createDeterministicClock} from '@enormora/clock/deterministic-clock';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {Maybe} from 'true-myth';

import {MeetingPrepPanel} from './meetingPrepPanel';

import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from '../../../page/testSupport/rootContextTestSupport';
import {User} from '../../../repositories/entity/User';
import {ThemeProvider} from '../../../uiKit/identity/theme/theme';
import type {Translate} from '../../../util/localizerUtil';
import {translateForTest} from '../../../util/test/translateForTest';

const meetingStartTime = '2026-06-01T09:00:00.000Z';

// Shows the minutes, so a test can see the countdown change.
const translateWithMinutes: Translate = (key, substitutions) => {
  return key === 'meetings.prep.startsIn' ? `Starts in ${String(substitutions?.minutes)} min` : key;
};
const startInMilliseconds = Date.parse(meetingStartTime);

const createUser = (id: string, name: string): User => {
  const user = new User(id, 'wire.test', translateForTest);
  user.name(name);
  return user;
};

type PanelProps = Parameters<typeof MeetingPrepPanel>[0];

const defaultProps: PanelProps = {
  titleId: 'meeting-prep-title',
  meetingTitle: 'Design review',
  meetingStartTime,
  meetingEndTime: Maybe.just('2026-06-01T09:30:00.000Z'),
  isCallInProgress: false,
  invitees: [createUser('ada', 'Ada'), createUser('bo', 'Bo'), createUser('cy', 'Cy')],
  brandName: 'Wire',
  supportUrl: 'https://support.wire.test/encryption',
  onTestConnection: Maybe.nothing(),
  joinSentence: 'You join muted, with your camera off.',
  isJoining: false,
  onJoin: jest.fn(),
};

const renderPanel = (
  nowInMilliseconds: number,
  props: Partial<PanelProps> = {},
): {clock: ReturnType<typeof createDeterministicClock>; update: (next: Partial<PanelProps>) => void} => {
  const clock = createDeterministicClock({initialUnixEpochMicroseconds: BigInt(nowInMilliseconds) * 1_000n});
  const wrapper = createRootProviderWrapperForTest(
    createRootContextValueForTest({translate: translateWithMinutes, clock}),
  );
  let currentProps: PanelProps = {...defaultProps, ...props};
  const result = render(
    <ThemeProvider>
      <MeetingPrepPanel {...currentProps} />
    </ThemeProvider>,
    {wrapper},
  );
  const update = (next: Partial<PanelProps>): void => {
    currentProps = {...currentProps, ...next};
    result.rerender(
      <ThemeProvider>
        <MeetingPrepPanel {...currentProps} />
      </ThemeProvider>,
    );
  };
  return {clock, update};
};

const status = (): HTMLElement | null => {
  return screen.queryByTestId('meeting-prep-status');
};

describe('MeetingPrepPanel', () => {
  it('counts down to the start and drops the chip at the start', () => {
    const {clock} = renderPanel(startInMilliseconds - 2 * 60_000);
    expect(status()).toHaveTextContent('Starts in 2 min');
    expect(status()).toHaveAttribute('data-uie-value', 'starts-in');

    act(() => {
      clock.advanceByMilliseconds(2 * 60_000);
    });

    expect(status()).toBeNull();
  });

  it('shows in progress as soon as a call runs, and the countdown again when it ends', () => {
    const {update} = renderPanel(startInMilliseconds - 60_000);
    update({isCallInProgress: true});
    expect(status()).toHaveAttribute('data-uie-value', 'in-progress');

    update({isCallInProgress: false});
    expect(status()).toHaveAttribute('data-uie-value', 'starts-in');
  });

  it('drops the minute count exactly when it changes, not on a fixed tick', () => {
    const {clock} = renderPanel(startInMilliseconds - 4 * 60_000 - 14_900);
    expect(status()).toHaveTextContent('Starts in 5 min');

    act(() => {
      clock.advanceByMilliseconds(14_899);
    });
    expect(status()).toHaveTextContent('Starts in 5 min');

    act(() => {
      clock.advanceByMilliseconds(1);
    });
    expect(status()).toHaveTextContent('Starts in 4 min');
  });

  it('starts counting down when the hour before the start begins', () => {
    const {clock} = renderPanel(startInMilliseconds - 60 * 60_000 - 1);
    expect(status()).toBeNull();

    act(() => {
      clock.advanceByMilliseconds(1);
    });
    expect(status()).toHaveAttribute('data-uie-value', 'starts-in');
  });

  it('shows the time range, or the start alone when the meeting has no end', () => {
    const {update} = renderPanel(startInMilliseconds);
    expect(screen.getByTestId('meeting-prep-time')).toHaveTextContent('meetings.prep.timeRange');

    update({meetingEndTime: Maybe.nothing()});
    expect(screen.getByTestId('meeting-prep-time')).toHaveTextContent('meetings.prep.time');
  });

  it('opens the encryption explainer with the meeting wording', () => {
    renderPanel(startInMilliseconds);
    fireEvent.click(screen.getByTestId('encrypted-badge'));

    expect(screen.getByTestId('call-security-explainer')).toHaveTextContent('meetings.prep.encryptionExplainerTitle');
    expect(screen.getByTestId('call-security-explainer-link')).toHaveAttribute(
      'href',
      'https://support.wire.test/encryption',
    );
  });

  const renderInsideModal = (): {onModalKeyDown: jest.Mock} => {
    const onModalKeyDown = jest.fn();
    const clock = createDeterministicClock({initialUnixEpochMicroseconds: 0n});
    const wrapper = createRootProviderWrapperForTest(
      createRootContextValueForTest({translate: translateForTest, clock}),
    );
    render(
      <ThemeProvider>
        <div onKeyDown={onModalKeyDown}>
          <MeetingPrepPanel {...defaultProps} />
        </div>
      </ThemeProvider>,
      {wrapper},
    );
    return {onModalKeyDown};
  };

  it('closes the explainer on Escape without letting the key reach the modal', () => {
    const {onModalKeyDown} = renderInsideModal();
    const badge = screen.getByTestId('encrypted-badge');
    // No manual focus: Safari and Firefox on macOS do not focus a clicked button, the badge does it.
    fireEvent.click(badge);
    fireEvent.keyDown(badge, {key: 'Escape'});

    expect(screen.queryByTestId('call-security-explainer')).toBeNull();
    expect(onModalKeyDown).not.toHaveBeenCalled();
    expect(badge).toHaveFocus();
  });

  it('leaves Escape to the rest of the page when focus is elsewhere', () => {
    const {onModalKeyDown} = renderInsideModal();
    fireEvent.click(screen.getByTestId('encrypted-badge'));
    const joinButton = screen.getByTestId('meeting-prep-join');
    joinButton.focus();
    fireEvent.keyDown(joinButton, {key: 'Escape'});

    expect(onModalKeyDown).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('call-security-explainer')).toBeInTheDocument();
  });

  it('hides the explainer link when no support URL is configured', () => {
    renderPanel(startInMilliseconds, {supportUrl: undefined});
    fireEvent.click(screen.getByTestId('encrypted-badge'));

    expect(screen.queryByTestId('call-security-explainer-link')).toBeNull();
  });

  it('shows the invitees only when someone else is invited', () => {
    const {update} = renderPanel(startInMilliseconds);
    expect(screen.getByTestId('meeting-prep-invitees')).toHaveTextContent('meetings.prep.invited');

    update({invitees: [createUser('ada', 'Ada')]});
    expect(screen.queryByTestId('meeting-prep-invitees')).toBeNull();

    update({invitees: []});
    expect(screen.queryByTestId('meeting-prep-invitees')).toBeNull();
  });

  it('offers the connection test only when the container provides it', () => {
    const onTestConnection = jest.fn();
    const {update} = renderPanel(startInMilliseconds);
    expect(screen.queryByTestId('meeting-prep-test-connection')).toBeNull();

    update({onTestConnection: Maybe.just(onTestConnection)});
    fireEvent.click(screen.getByTestId('meeting-prep-test-connection'));
    expect(onTestConnection).toHaveBeenCalledTimes(1);
  });

  it('joins from the button and disables it while joining', () => {
    const onJoin = jest.fn();
    const {update} = renderPanel(startInMilliseconds, {onJoin});
    fireEvent.click(screen.getByTestId('meeting-prep-join'));
    expect(onJoin).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('meeting-prep-join-sentence')).toHaveTextContent('You join muted, with your camera off.');

    update({isJoining: true, onTestConnection: Maybe.just(jest.fn())});
    expect(screen.getByTestId('meeting-prep-join')).toBeDisabled();
    expect(screen.getByTestId('meeting-prep-test-connection')).toBeDisabled();
  });
});
