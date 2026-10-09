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
import {act, fireEvent, render} from '@testing-library/react';
import {STATE as CALL_STATE} from '@wireapp/avs';

import {Participant} from 'Repositories/calling/Participant';
import {User} from 'Repositories/entity/User';

import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {translateForTest} from 'Util/test/translateForTest';

import {
  CALL_SECURITY_ANNOUNCEMENT_INTERVAL_IN_MILLISECONDS,
  CALL_SECURITY_INTRO_DURATION_IN_MILLISECONDS,
  CallSecurityLine,
} from './CallSecurityLine';
import {KEY_UPDATE_HOLD_IN_MILLISECONDS} from './keyUpdateQueue';

const startOfCallInMilliseconds = 1_000_000;

const createParticipant = (id: string, name: string, isMe = false) => {
  const user = new User(id, 'wire.test', translateForTest);
  user.name(name);
  user.isMe = isMe;
  return new Participant(user, `${id}-device`);
};

const renderLine = (
  callConnectionState: CALL_STATE,
  startedAt: number | undefined,
  nowInMilliseconds: number,
  participants: Participant[] = [],
) => {
  const clock = createDeterministicClock({initialUnixEpochMicroseconds: BigInt(nowInMilliseconds) * 1000n});
  const wrapper = createRootProviderWrapperForTest(createRootContextValueForTest({translate: translateForTest, clock}));
  const result = render(
    <CallSecurityLine callConnectionState={callConnectionState} participants={participants} startedAt={startedAt} />,
    {wrapper},
  );

  return {...result, clock};
};

describe('CallSecurityLine', () => {
  it('says the call is connecting securely until media is established', () => {
    const {getByTestId, getByText} = renderLine(CALL_STATE.ANSWERED, undefined, startOfCallInMilliseconds);

    expect(getByTestId('call-security-line').getAttribute('data-uie-value')).toBe('connecting');
    expect(getByText('callSecurityConnecting')).not.toBe(null);
  });

  it('shows the intro sentence for 3 s after the call is established, then settles', () => {
    const {getByTestId, getByText, queryByText, clock} = renderLine(
      CALL_STATE.MEDIA_ESTAB,
      startOfCallInMilliseconds,
      startOfCallInMilliseconds,
    );

    expect(getByTestId('call-security-line').getAttribute('data-uie-value')).toBe('intro');
    expect(getByText('callSecurityIntro')).not.toBe(null);

    act(() => {
      clock.advanceByMilliseconds(CALL_SECURITY_INTRO_DURATION_IN_MILLISECONDS);
    });

    expect(getByTestId('call-security-line').getAttribute('data-uie-value')).toBe('resting');
    expect(getByText('callSecurityEncrypted')).not.toBe(null);
    expect(queryByText('callSecurityIntro')).toBe(null);
  });

  it('does not replay the intro when the call view opens on an ongoing call', () => {
    const {getByTestId} = renderLine(
      CALL_STATE.MEDIA_ESTAB,
      startOfCallInMilliseconds,
      startOfCallInMilliseconds + CALL_SECURITY_INTRO_DURATION_IN_MILLISECONDS + 1,
    );

    expect(getByTestId('call-security-line').getAttribute('data-uie-value')).toBe('resting');
  });

  describe('explainer', () => {
    const renderRestingLine = () => {
      return renderLine(
        CALL_STATE.MEDIA_ESTAB,
        startOfCallInMilliseconds,
        startOfCallInMilliseconds + CALL_SECURITY_INTRO_DURATION_IN_MILLISECONDS + 1,
      );
    };

    it('opens when the line is clicked and closes with the close button', () => {
      const {getByTestId, queryByTestId} = renderRestingLine();
      const trigger = getByTestId('call-security-line');

      expect(trigger.getAttribute('aria-expanded')).toBe('false');
      expect(queryByTestId('call-security-explainer')).toBe(null);

      fireEvent.click(trigger);

      expect(trigger.getAttribute('aria-expanded')).toBe('true');
      expect(getByTestId('call-security-explainer').textContent).toContain('callSecurityExplainerBody');

      fireEvent.click(getByTestId('call-security-explainer-close'));

      expect(queryByTestId('call-security-explainer')).toBe(null);
      expect(document.activeElement).toBe(trigger);
    });

    it('closes on Escape', () => {
      const {getByTestId, queryByTestId} = renderRestingLine();

      fireEvent.click(getByTestId('call-security-line'));
      fireEvent.keyDown(document, {key: 'Escape'});

      expect(queryByTestId('call-security-explainer')).toBe(null);
    });

    it('closes on a click outside, but not on a click inside', () => {
      const {getByTestId, queryByTestId} = renderRestingLine();

      fireEvent.click(getByTestId('call-security-line'));
      fireEvent.mouseDown(getByTestId('call-security-explainer'));

      expect(queryByTestId('call-security-explainer')).not.toBe(null);

      fireEvent.mouseDown(document.body);

      expect(queryByTestId('call-security-explainer')).toBe(null);
    });
  });

  it('shows the key update when someone joins, then goes back to resting', () => {
    const me = createParticipant('me', 'Me', true);
    const participants = [me];
    const {getByTestId, getByText, rerender, clock} = renderLine(
      CALL_STATE.MEDIA_ESTAB,
      startOfCallInMilliseconds,
      startOfCallInMilliseconds + 60_000,
      participants,
    );

    // The calling layer pushes into the same array; the line must still notice.
    participants.push(createParticipant('alice', 'Alice'));
    rerender(
      <CallSecurityLine
        callConnectionState={CALL_STATE.MEDIA_ESTAB}
        participants={participants}
        startedAt={startOfCallInMilliseconds}
      />,
    );

    expect(getByTestId('call-security-line').getAttribute('data-uie-value')).toBe('updating');
    expect(getByText('callSecurityUpdatingKeys')).not.toBe(null);

    act(() => {
      clock.advanceByMilliseconds(KEY_UPDATE_HOLD_IN_MILLISECONDS);
    });

    expect(getByTestId('call-security-line').getAttribute('data-uie-value')).toBe('resting');
  });

  it('does not show the people already in the call when it connects', () => {
    const participants = [createParticipant('me', 'Me', true), createParticipant('alice', 'Alice')];
    const {getByTestId, rerender, clock} = renderLine(CALL_STATE.ANSWERED, undefined, startOfCallInMilliseconds);

    rerender(
      <CallSecurityLine callConnectionState={CALL_STATE.ANSWERED} participants={participants} startedAt={undefined} />,
    );
    rerender(
      <CallSecurityLine
        callConnectionState={CALL_STATE.MEDIA_ESTAB}
        participants={participants}
        startedAt={startOfCallInMilliseconds}
      />,
    );

    act(() => {
      clock.advanceByMilliseconds(CALL_SECURITY_INTRO_DURATION_IN_MILLISECONDS);
    });

    expect(getByTestId('call-security-line').getAttribute('data-uie-value')).toBe('resting');
  });

  it('announces a key update to screen readers at most once per 30 s', () => {
    const participants = [createParticipant('me', 'Me', true)];
    const {getByTestId, rerender, clock} = renderLine(
      CALL_STATE.MEDIA_ESTAB,
      startOfCallInMilliseconds,
      startOfCallInMilliseconds + 60_000,
      participants,
    );
    const join = (id: string) => {
      participants.push(createParticipant(id, id));
      rerender(
        <CallSecurityLine
          callConnectionState={CALL_STATE.MEDIA_ESTAB}
          participants={participants}
          startedAt={startOfCallInMilliseconds}
        />,
      );
    };
    const announcement = () => {
      return getByTestId('call-security-announcement').textContent;
    };

    join('alice');
    expect(announcement()).toBe('callSecurityUpdatingKeys. callSecurityJoined');

    act(() => {
      clock.advanceByMilliseconds(KEY_UPDATE_HOLD_IN_MILLISECONDS);
    });
    expect(announcement()).toBe('');

    join('bob');
    expect(announcement()).toBe('');

    act(() => {
      clock.advanceByMilliseconds(KEY_UPDATE_HOLD_IN_MILLISECONDS);
    });
    act(() => {
      clock.advanceByMilliseconds(CALL_SECURITY_ANNOUNCEMENT_INTERVAL_IN_MILLISECONDS);
    });

    join('carol');
    expect(announcement()).toBe('callSecurityUpdatingKeys. callSecurityJoined');
  });
});
