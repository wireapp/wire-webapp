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

import {render} from '@testing-library/react';

import {Message} from 'Repositories/entity/message/Message';

import {EphemeralTimer} from './EphemeralTimer';

describe('EphemeralTimer', () => {
  it('shows the icon', () => {
    const message = new Message();
    const remaining = 600_000;
    const now = Date.now();
    message.ephemeral_started(now);
    message.ephemeral_expires(now + remaining);
    message.ephemeral_remaining(remaining);

    const {getByTestId} = render(<EphemeralTimer message={message} />);

    const circle = getByTestId('ephemeral-timer-circle');

    const offset = 1;
    const strokewidth = 4;
    const strokelength = strokewidth * Math.PI;
    const expected = strokelength * (1 + offset); // offset === 1 => (1 + offset)

    expect(parseFloat(window.getComputedStyle(circle).getPropertyValue('stroke-dashoffset'))).toBeCloseTo(expected, 5);
  });

  it('hides the icon when no ephemeral timer was started', () => {
    const message = new Message();

    const {getByTestId} = render(<EphemeralTimer message={message} />);

    const circle = getByTestId('ephemeral-timer-circle');

    const offset = 0;
    const strokewidth = 4;
    const strokelength = strokewidth * Math.PI;
    const expected = strokelength * (1 + offset);

    expect(parseFloat(window.getComputedStyle(circle).getPropertyValue('stroke-dashoffset'))).toBeCloseTo(expected, 5);
  });
});
