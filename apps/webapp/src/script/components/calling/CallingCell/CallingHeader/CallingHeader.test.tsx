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

import {fireEvent, render} from '@testing-library/react';

import {User} from 'Repositories/entity/User';
import * as Router from 'src/script/router/Router';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {translateForTest} from 'Util/test/translateForTest';

import {CallingHeader} from './CallingHeader';

const navigateSpy = jest.spyOn(Router, 'navigate');

const conversationUrl = '/conversation/1';
const clearShowAlert = jest.fn();
const rootProviderWrapper = createRootProviderWrapperForTest(
  createRootContextValueForTest({translate: translateForTest}),
);

const createProps = (overrides: Partial<React.ComponentProps<typeof CallingHeader>> = {}) => ({
  isMeeting: false,
  isOngoing: false,
  isGroupCall: false,
  isChannel: false,
  showAlert: false,
  isVideoCall: false,
  clearShowAlert,
  conversationUrl,
  callStartedAlert: 'Call started',
  ongoingCallAlert: 'Ongoing call',
  isTemporaryUser: false,
  conversationParticipants: [] as User[],
  conversationName: 'Conversation',
  currentCallStatus: null,
  isCbrEnabled: false,
  toggleDetachedWindow: jest.fn(),
  isDetachedWindow: false,
  conversationID: 'conversation-id',
  ...overrides,
});

const renderHeader = (overrides: Partial<React.ComponentProps<typeof CallingHeader>> = {}) =>
  render(<CallingHeader {...createProps(overrides)} />, {wrapper: rootProviderWrapper});

describe('CallingHeader', () => {
  beforeEach(() => {
    navigateSpy.mockClear();
    clearShowAlert.mockClear();
  });

  it.each([
    ['click', (header: HTMLElement) => fireEvent.click(header)],
    ['Enter', (header: HTMLElement) => fireEvent.keyDown(header, {key: 'Enter'})],
    ['Space', (header: HTMLElement) => fireEvent.keyDown(header, {key: ' '})],
  ])('navigates regular calls on %s', (_interaction, interact) => {
    const {getByRole} = renderHeader();

    interact(getByRole('button'));

    expect(navigateSpy).toHaveBeenCalledWith(conversationUrl);
  });

  it.each([
    ['click', (header: HTMLElement) => fireEvent.click(header)],
    ['Enter', (header: HTMLElement) => fireEvent.keyDown(header, {key: 'Enter'})],
    ['Space', (header: HTMLElement) => fireEvent.keyDown(header, {key: ' '})],
  ])('does not navigate meeting calls on %s', (_interaction, interact) => {
    const {getByRole} = renderHeader({isMeeting: true});

    interact(getByRole('button'));

    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('keeps meeting headers rendered and focusable', () => {
    const {getByRole} = renderHeader({isMeeting: true});

    expect(getByRole('button')).toHaveAttribute('tabindex', '0');
  });
});
