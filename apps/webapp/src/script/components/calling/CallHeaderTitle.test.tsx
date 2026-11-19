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

import {type ReactElement, useState} from 'react';
import {createPortal} from 'react-dom';

import {act, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {createStore, type StoreApi} from 'zustand/vanilla';
import {createDeterministicClock} from '@enormora/clock/deterministic-clock';
import {STATE as CALL_STATE} from '@wireapp/avs';

import {withThemeAndRootContext} from '../../auth/util/test/testUtil';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from '../../page/testSupport/rootContextTestSupport';
import {translateForTest} from '../../util/test/translateForTest';
import * as clipboardUtil from '../../util/clipboardUtil';
import type {MeetingStoreState} from '../meeting/meetingStore/createMeetingStore';
import {MeetingStoreProvider} from '../meeting/meetingStore/meetingStoreProvider';
import type {MeetingSeries} from '../meeting/types/meetingSeries';

import {CallHeaderTitle} from './CallHeaderTitle';
import {CallSecurityLine} from './callSecurityLine/callSecurityLine';

const conversationId = {id: 'call', domain: 'example.com'};
const series = (id: string, link?: string, hasPassword = false): MeetingSeries => {
  return {
    qualified_id: {id: `meeting-${id}`, domain: 'example.com'},
    qualified_conversation: {id, domain: 'example.com'},
    qualified_creator: {id: 'creator', domain: 'example.com'},
    conversation_id: id,
    title: 'Meeting',
    link,
    has_password: hasPassword,
    series_start_date: '',
    series_end_date: '',
    duration_ms: 0,
    recurrence: 'doesNotRepeat',
    tzid: 'Europe/Berlin',
  };
};

const wrapper = createRootProviderWrapperForTest(createRootContextValueForTest({translate: translateForTest}));

const renderTitle = (
  meetings: MeetingSeries[],
  detachedDocument?: Document,
): ReturnType<typeof render> & {store: StoreApi<MeetingStoreState>; onOpen: jest.Mock} => {
  const store = createStore<MeetingStoreState>(() => {
    return {meetingSeries: meetings} as MeetingStoreState;
  });
  const onOpen = jest.fn();
  const title = <CallHeaderTitle conversationId={conversationId} title="Call title" closeSignal={0} onOpen={onOpen} />;
  const view = detachedDocument ? createPortal(title, detachedDocument.body) : title;
  const result = render(
    withThemeAndRootContext(<MeetingStoreProvider store={store}>{view}</MeetingStoreProvider>, wrapper),
  );
  return {store, onOpen, ...result};
};

describe('CallHeaderTitle', () => {
  it('shows a plain title without a matching meeting link', () => {
    const {store} = renderTitle([series('other', 'https://other.example'), series('call')]);
    expect(screen.queryByTestId('call-meeting-link-trigger')).toBeNull();
    expect(screen.getByText('Call title')).toBeInTheDocument();
    act(() => {
      store.setState({meetingSeries: [series('call', 'https://call.example')]});
    });
    fireEvent.click(screen.getByTestId('call-meeting-link-trigger'));
    act(() => {
      store.setState({meetingSeries: [series('call')]});
    });
    expect(screen.queryByTestId('call-meeting-link-trigger')).toBeNull();
    act(() => {
      store.setState({meetingSeries: [series('call', 'https://call.example')]});
    });
    expect(screen.getByTestId('call-meeting-link-trigger')).toHaveAttribute('aria-expanded', 'false');
  });

  it('shows the matching live link and password details, then falls back if the link disappears', async () => {
    const copy = jest.spyOn(clipboardUtil, 'copyText').mockResolvedValue();
    const {store, onOpen} = renderTitle([
      series('other', 'https://other.example'),
      series('call', 'https://call.example'),
    ]);
    const trigger = screen.getByTestId('call-meeting-link-trigger');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger.querySelector('path')).toHaveAttribute('transform', 'rotate(0 4 4)');
    fireEvent.click(trigger);
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(trigger.querySelector('path')).toHaveAttribute('transform', 'rotate(180 4 4)');
    expect(screen.getByRole('textbox', {name: 'meetings.meetingLink.title'})).toHaveTextContent('https://call.example');
    expect(screen.getByRole('note')).toHaveTextContent('meetings.meetingLink.passwordUnprotected');
    expect(screen.queryByRole('button', {name: 'meetings.meetingLink.cancel'})).toBeNull();
    expect(screen.getByRole('button', {name: 'meetings.meetingLink.copyLink'})).toBeInTheDocument();
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    act(() => {
      store.setState({meetingSeries: [series('call', 'https://new.example', true)]});
    });
    expect(screen.getByRole('textbox', {name: 'meetings.meetingLink.title'})).toHaveTextContent('https://new.example');
    expect(screen.getByRole('note')).toHaveTextContent('meetings.meetingLink.passwordProtected');
    fireEvent.click(screen.getByRole('button', {name: 'meetings.meetingLink.copyLink'}));
    await waitFor(() => {
      return expect(copy).toHaveBeenCalledWith('https://new.example');
    });
    fireEvent.click(screen.getByTestId('call-meeting-link-close'));
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveFocus();

    act(() => {
      store.setState({meetingSeries: [series('call')]});
    });
    expect(screen.queryByTestId('call-meeting-link-trigger')).toBeNull();
    copy.mockRestore();
  });

  it.each([false, true])('dismisses on Escape and outside click in %s view', detached => {
    const frame = detached ? document.createElement('iframe') : undefined;
    if (frame) {
      document.body.append(frame);
    }
    const detachedDocument = frame?.contentDocument ?? undefined;
    const {container, unmount} = renderTitle([series('call', 'https://call.example')], detachedDocument);
    const ownerDocument = detachedDocument ?? document;
    const trigger = ownerDocument.querySelector('[data-uie-name="call-meeting-link-trigger"]') as HTMLButtonElement;
    fireEvent.click(trigger);
    fireEvent.keyDown(ownerDocument, {key: 'Escape'});
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(trigger);
    fireEvent.mouseDown(detachedDocument?.body ?? container);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    unmount();
    frame?.remove();
  });

  it('keeps the link popover and encryption explainer mutually exclusive', () => {
    const store = createStore<MeetingStoreState>(() => {
      return {meetingSeries: [series('call', 'https://call.example')]} as MeetingStoreState;
    });
    const clock = createDeterministicClock({initialUnixEpochMicroseconds: 2_000_000_000n});
    const rootWrapper = createRootProviderWrapperForTest(
      createRootContextValueForTest({translate: translateForTest, clock}),
    );
    const Header = (): ReactElement => {
      const [closeLink, setCloseLink] = useState(0);
      const [closeSecurity, setCloseSecurity] = useState(0);
      return (
        <MeetingStoreProvider store={store}>
          <CallHeaderTitle
            conversationId={conversationId}
            title="Call title"
            closeSignal={closeLink}
            onOpen={() => {
              setCloseSecurity(value => {
                return value + 1;
              });
            }}
          />
          <CallSecurityLine
            callConnectionState={CALL_STATE.MEDIA_ESTAB}
            startedAt={1_000_000}
            participants={[]}
            brandName="Wire"
            closeSignal={closeSecurity}
            onExplainerOpen={() => {
              setCloseLink(value => {
                return value + 1;
              });
            }}
          />
        </MeetingStoreProvider>
      );
    };
    render(withThemeAndRootContext(<Header />, rootWrapper));
    fireEvent.click(screen.getByTestId('call-meeting-link-trigger'));
    expect(screen.getByTestId('call-meeting-link-popover')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('call-security-line'));
    expect(screen.queryByTestId('call-meeting-link-popover')).toBeNull();
    expect(screen.getByTestId('call-security-explainer')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('call-meeting-link-trigger'));
    expect(screen.getByTestId('call-meeting-link-popover')).toBeInTheDocument();
    expect(screen.queryByTestId('call-security-explainer')).toBeNull();
  });
});
