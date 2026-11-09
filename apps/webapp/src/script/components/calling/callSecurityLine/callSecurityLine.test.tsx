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
import {STATE as CALL_STATE, VIDEO_STATE} from '@wireapp/avs';

import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from '../../../page/testSupport/rootContextTestSupport';
import {setStrings, translate, type Translate} from '../../../util/localizerUtil';
import {translateForTest} from '../../../util/test/translateForTest';

import {
  CALL_SECURITY_ANNOUNCEMENT_INTERVAL_IN_MILLISECONDS,
  CALL_SECURITY_INTRO_ABSORB_IN_MILLISECONDS,
  CALL_SECURITY_INTRO_DURATION_IN_MILLISECONDS,
  CallSecurityLine,
} from './callSecurityLine';
import {KEY_UPDATE_HOLD_IN_MILLISECONDS} from './keyUpdateQueue';

import {Participant} from '../../../repositories/calling/Participant';
import {User} from '../../../repositories/entity/User';

const startOfCallInMilliseconds = 1_000_000;

const createParticipant = (id: string, name: string, isMe = false): Participant => {
  const user = new User(id, 'wire.test', translateForTest);
  user.name(name);
  user.isMe = isMe;
  return new Participant(user, `${id}-device`);
};

type LineProps = Parameters<typeof CallSecurityLine>[0];

const renderLine = (
  callConnectionState: CALL_STATE,
  startedAt: number | undefined,
  nowInMilliseconds: number,
  participants: Participant[] = [],
  translate: Translate = translateForTest,
): ReturnType<typeof render> & {
  clock: ReturnType<typeof createDeterministicClock>;
  update: (nextProps?: Partial<LineProps>) => void;
} => {
  const clock = createDeterministicClock({initialUnixEpochMicroseconds: BigInt(nowInMilliseconds) * 1000n});
  const wrapper = createRootProviderWrapperForTest(createRootContextValueForTest({translate, clock}));
  let currentProps: LineProps = {callConnectionState, participants, startedAt, brandName: 'Wire', supportUrl: ''};
  const result = render(<CallSecurityLine {...currentProps} />, {wrapper});
  const update = (nextProps: Partial<LineProps> = {}): void => {
    currentProps = {...currentProps, ...nextProps};
    result.rerender(<CallSecurityLine {...currentProps} />);
  };

  return {...result, clock, update};
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
    const renderRestingLine = (): ReturnType<typeof renderLine> => {
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

    it('closes on Escape and returns focus to the line', () => {
      const {getByTestId, queryByTestId} = renderRestingLine();
      const trigger = getByTestId('call-security-line');

      fireEvent.click(trigger);
      fireEvent.keyDown(document, {key: 'Escape'});

      expect(queryByTestId('call-security-explainer')).toBe(null);
      expect(document.activeElement).toBe(trigger);
    });

    it('closes on a click outside, but not on a click inside', () => {
      const {getByTestId, queryByTestId} = renderRestingLine();

      fireEvent.click(getByTestId('call-security-line'));
      fireEvent.mouseDown(getByTestId('call-security-explainer'));

      expect(queryByTestId('call-security-explainer')).not.toBe(null);

      fireEvent.mouseDown(document.body);

      expect(queryByTestId('call-security-explainer')).toBe(null);
    });

    it('stays closed after the connection is interrupted and restored', () => {
      const {getByTestId, queryByTestId, update} = renderRestingLine();

      fireEvent.click(getByTestId('call-security-line'));
      expect(queryByTestId('call-security-explainer')).not.toBe(null);

      update({callConnectionState: CALL_STATE.ANSWERED});
      update({callConnectionState: CALL_STATE.MEDIA_ESTAB});

      expect(queryByTestId('call-security-explainer')).toBe(null);
      expect(getByTestId('call-security-line').getAttribute('aria-expanded')).toBe('false');
    });

    it('shows the support link only when a URL is configured', () => {
      const {getByTestId, queryByTestId, update} = renderRestingLine();
      fireEvent.click(getByTestId('call-security-line'));
      expect(queryByTestId('call-security-explainer-link')).toBe(null);

      update({supportUrl: 'https://support.wire.com/encryption'});

      const link = getByTestId('call-security-explainer-link');
      expect(link.getAttribute('href')).toBe('https://support.wire.com/encryption');
      expect(link.getAttribute('target')).toBe('_blank');
      expect(link.getAttribute('rel')).toContain('noopener');
    });
  });

  it('absorbs changes during the intro and the 2 s after it', () => {
    const participants = [createParticipant('me', 'Me', true)];
    const {getByTestId, update, clock} = renderLine(
      CALL_STATE.MEDIA_ESTAB,
      startOfCallInMilliseconds,
      startOfCallInMilliseconds,
      participants,
    );
    const join = (id: string): void => {
      participants.push(createParticipant(id, id));
      update();
    };

    const absorbEndInMilliseconds =
      CALL_SECURITY_INTRO_DURATION_IN_MILLISECONDS + CALL_SECURITY_INTRO_ABSORB_IN_MILLISECONDS;

    act(() => {
      clock.advanceByMilliseconds(absorbEndInMilliseconds - 1);
    });
    join('alice');
    expect(getByTestId('call-security-line').getAttribute('data-uie-value')).toBe('resting');

    act(() => {
      clock.advanceByMilliseconds(1);
    });
    join('bob');
    expect(getByTestId('call-security-line').getAttribute('data-uie-value')).toBe('updating');
  });

  it('restarts the intro absorb window after reconnecting', () => {
    const participants = [createParticipant('me', 'Me', true)];
    const reconnectAt = startOfCallInMilliseconds + 60_000;
    const {getByTestId, update, clock} = renderLine(
      CALL_STATE.MEDIA_ESTAB,
      startOfCallInMilliseconds,
      reconnectAt,
      participants,
    );
    update({callConnectionState: CALL_STATE.ANSWERED});
    expect(getByTestId('call-security-line').getAttribute('data-uie-value')).toBe('connecting');

    update({callConnectionState: CALL_STATE.MEDIA_ESTAB, startedAt: reconnectAt});
    expect(getByTestId('call-security-line').getAttribute('data-uie-value')).toBe('intro');

    act(() => {
      clock.advanceByMilliseconds(
        CALL_SECURITY_INTRO_DURATION_IN_MILLISECONDS + CALL_SECURITY_INTRO_ABSORB_IN_MILLISECONDS - 1,
      );
    });
    participants.push(createParticipant('alice', 'Alice'));
    update();
    expect(getByTestId('call-security-line').getAttribute('data-uie-value')).toBe('resting');

    act(() => {
      clock.advanceByMilliseconds(1);
    });
    participants.push(createParticipant('bob', 'Bob'));
    update();
    expect(getByTestId('call-security-line').getAttribute('data-uie-value')).toBe('updating');
  });

  it('shows a leave and ignores media-only participant changes', () => {
    const me = createParticipant('me', 'Me', true);
    const alice = createParticipant('alice', 'Alice');
    const participants = [me, alice];
    const translatedLeaveNames: string[] = [];
    const translate: Translate = (key, substitutions) => {
      if (key === 'callSecurityLeft') {
        translatedLeaveNames.push(String(substitutions?.name));
      }
      return key;
    };
    const {getByTestId, update} = renderLine(
      CALL_STATE.MEDIA_ESTAB,
      startOfCallInMilliseconds,
      startOfCallInMilliseconds + 60_000,
      participants,
      translate,
    );
    alice.videoState(VIDEO_STATE.STARTED);
    alice.videoState(VIDEO_STATE.SCREENSHARE);
    alice.isMuted(true);
    alice.isActivelySpeaking(true);
    update();
    expect(getByTestId('call-security-line').getAttribute('data-uie-value')).toBe('resting');

    participants.pop();
    update();
    expect(getByTestId('call-security-line').getAttribute('data-uie-value')).toBe('updating');
    expect(getByTestId('call-security-line').getAttribute('aria-label')).toBe(
      'callSecurityUpdatingKeys. callSecurityLeft. callSecurityShowDetails',
    );
    expect(translatedLeaveNames).toContain('Alice');
  });

  it('shows the key update when someone joins, then goes back to resting', () => {
    const me = createParticipant('me', 'Me', true);
    const participants = [me];
    const {getByTestId, getByText, update, clock} = renderLine(
      CALL_STATE.MEDIA_ESTAB,
      startOfCallInMilliseconds,
      startOfCallInMilliseconds + 60_000,
      participants,
    );

    // The calling layer pushes into the same array; the line must still notice.
    participants.push(createParticipant('alice', 'Alice'));
    update();

    expect(getByTestId('call-security-line').getAttribute('data-uie-value')).toBe('updating');
    expect(getByText('callSecurityUpdatingKeys')).not.toBe(null);

    act(() => {
      clock.advanceByMilliseconds(KEY_UPDATE_HOLD_IN_MILLISECONDS);
    });

    expect(getByTestId('call-security-line').getAttribute('data-uie-value')).toBe('resting');
  });

  it('renders special characters in joined and left participant names', () => {
    setStrings({en: {callSecurityJoined: '{name} joined', callSecurityLeft: '{name} left'}});

    try {
      const name = 'R&D <Admin> "Ace"';
      const me = createParticipant('me', 'Me', true);
      const participant = createParticipant('participant', name);
      const participants = [me];
      const {getByTestId, getByText, update, clock} = renderLine(
        CALL_STATE.MEDIA_ESTAB,
        startOfCallInMilliseconds,
        startOfCallInMilliseconds + 60_000,
        participants,
        translate,
      );

      participants.push(participant);
      update();
      expect(getByText(`${name} joined`)).not.toBe(null);
      expect(getByTestId('call-security-line').getAttribute('aria-label')).toContain(`${name} joined`);
      expect(getByTestId('call-security-announcement').textContent).toContain(`${name} joined`);
      expect(getByTestId('call-security-line').querySelector('admin')).toBe(null);

      act(() => {
        clock.advanceByMilliseconds(KEY_UPDATE_HOLD_IN_MILLISECONDS);
      });
      participants.pop();
      update();
      expect(getByText(`${name} left`)).not.toBe(null);
      expect(getByTestId('call-security-line').getAttribute('aria-label')).toContain(`${name} left`);
    } finally {
      setStrings({});
    }
  });

  it('does not show the people already in the call when it connects', () => {
    const participants = [createParticipant('me', 'Me', true), createParticipant('alice', 'Alice')];
    const {getByTestId, update, clock} = renderLine(CALL_STATE.ANSWERED, undefined, startOfCallInMilliseconds);

    update({participants});
    update({callConnectionState: CALL_STATE.MEDIA_ESTAB, startedAt: startOfCallInMilliseconds});

    act(() => {
      clock.advanceByMilliseconds(CALL_SECURITY_INTRO_DURATION_IN_MILLISECONDS);
    });

    expect(getByTestId('call-security-line').getAttribute('data-uie-value')).toBe('resting');
  });

  it('does not queue a leave when the connection and participant list change together', () => {
    const me = createParticipant('me', 'Me', true);
    const alice = createParticipant('alice', 'Alice');
    const {getByTestId, update} = renderLine(
      CALL_STATE.MEDIA_ESTAB,
      startOfCallInMilliseconds,
      startOfCallInMilliseconds + 60_000,
      [me, alice],
    );

    update({callConnectionState: CALL_STATE.ANSWERED, participants: [me]});
    update({callConnectionState: CALL_STATE.MEDIA_ESTAB});

    expect(getByTestId('call-security-line').getAttribute('data-uie-value')).toBe('resting');
  });

  it('includes a rate-limited update in the button accessible name', () => {
    const participants = [createParticipant('me', 'Me', true)];
    const {getByTestId, update, clock} = renderLine(
      CALL_STATE.MEDIA_ESTAB,
      startOfCallInMilliseconds,
      startOfCallInMilliseconds + 60_000,
      participants,
    );

    participants.push(createParticipant('alice', 'Alice'));
    update();
    act(() => {
      clock.advanceByMilliseconds(KEY_UPDATE_HOLD_IN_MILLISECONDS);
    });

    participants.push(createParticipant('bob', 'Bob'));
    update();

    expect(getByTestId('call-security-announcement').textContent).toBe('');
    expect(getByTestId('call-security-line').getAttribute('aria-label')).toBe(
      'callSecurityUpdatingKeys. callSecurityJoined. callSecurityShowDetails',
    );
  });

  it('announces a key update to screen readers at most once per 30 s', () => {
    const participants = [createParticipant('me', 'Me', true)];
    const {getByTestId, update, clock} = renderLine(
      CALL_STATE.MEDIA_ESTAB,
      startOfCallInMilliseconds,
      startOfCallInMilliseconds + 60_000,
      participants,
    );
    const join = (id: string): void => {
      participants.push(createParticipant(id, id));
      update();
    };
    const announcement = (): string | null => {
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

  it('uses elapsed time for announcement throttling when wall time changes', () => {
    const participants = [createParticipant('me', 'Me', true)];
    const {getByTestId, update, clock} = renderLine(
      CALL_STATE.MEDIA_ESTAB,
      startOfCallInMilliseconds,
      startOfCallInMilliseconds + 60_000,
      participants,
    );
    const join = (id: string): void => {
      participants.push(createParticipant(id, id));
      update();
    };
    const announcement = (): string | null => {
      return getByTestId('call-security-announcement').textContent;
    };

    join('alice');
    expect(announcement()).toBe('callSecurityUpdatingKeys. callSecurityJoined');

    act(() => {
      clock.advanceByMilliseconds(KEY_UPDATE_HOLD_IN_MILLISECONDS);
      clock.setCurrentUnixEpochMicroseconds(BigInt(startOfCallInMilliseconds + 3_600_000) * 1_000n);
    });
    join('bob');
    expect(announcement()).toBe('');

    act(() => {
      clock.advanceByMilliseconds(KEY_UPDATE_HOLD_IN_MILLISECONDS);
      clock.advanceByMilliseconds(CALL_SECURITY_ANNOUNCEMENT_INTERVAL_IN_MILLISECONDS);
      clock.setCurrentUnixEpochMicroseconds(BigInt(startOfCallInMilliseconds + 60_000) * 1_000n);
    });
    join('carol');
    expect(announcement()).toBe('callSecurityUpdatingKeys. callSecurityJoined');
  });
});
