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

import {contentStyles} from './meeting.styles';
import {meetingsContentWrapperStyles} from './MeetingCallingView/meetingCallingView.styles';

describe('meeting layout styles', () => {
  it('sizes the meeting list from the available parent height', () => {
    expect(contentStyles).toMatchObject({
      flex: 1,
      minHeight: 0,
      overflowY: 'auto',
    });
    expect(JSON.stringify(contentStyles)).not.toContain('100vh');
  });

  it('allows the meetings wrapper to shrink within the main content column', () => {
    expect(meetingsContentWrapperStyles).toMatchObject({
      flex: 1,
      minHeight: 0,
      height: '100%',
    });
  });
});
