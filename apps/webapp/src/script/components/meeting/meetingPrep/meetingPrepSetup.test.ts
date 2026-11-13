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

import {
  type CameraHealth,
  getCameraHealth,
  getMeetingPrepSetupCallout,
  getMicrophoneHealth,
  type MicrophoneHealth,
} from './meetingPrepSetup';

const statusOf = (microphone: MicrophoneHealth, camera: CameraHealth): string => {
  return getMeetingPrepSetupCallout({microphone, camera}).mapOr('none', callout => {
    return `${callout.tone}:${callout.status}`;
  });
};

describe('getMeetingPrepSetupCallout', () => {
  it('names only the devices that work', () => {
    expect(statusOf('working', 'working')).toBe('success:meetings.prep.setupMicrophoneAndCameraWorking');
    expect(statusOf('working', 'off')).toBe('success:meetings.prep.setupMicrophoneWorking');
    expect(statusOf('working', 'starting')).toBe('success:meetings.prep.setupMicrophoneWorking');
    expect(statusOf('off', 'working')).toBe('success:meetings.prep.setupCameraWorking');
  });

  it('shows nothing when both devices are off or still starting', () => {
    expect(statusOf('off', 'off')).toBe('none');
    expect(statusOf('starting', 'starting')).toBe('none');
    expect(statusOf('starting', 'off')).toBe('none');
  });

  it('warns about a blocked microphone first, with how to fix it', () => {
    const callout = getMeetingPrepSetupCallout({microphone: 'blocked', camera: 'unavailable'});

    expect(callout.isJust && callout.value.status).toBe('meetings.prep.setupMicrophoneBlocked');
    expect(callout.isJust && callout.value.hint.unwrapOr('')).toBe('meetings.prep.setupMicrophoneBlockedHint');
  });

  it('warns about an unavailable camera even when the microphone works', () => {
    expect(statusOf('working', 'unavailable')).toBe('warning:meetings.prep.setupCameraUnavailable');
  });
});

describe('device health', () => {
  it('keeps a refused microphone blocked, even switched off', () => {
    expect(getMicrophoneHealth({isBlocked: true, isEnabled: false, hasStream: false})).toBe('blocked');
    expect(getMicrophoneHealth({isBlocked: false, isEnabled: false, hasStream: false})).toBe('off');
    expect(getMicrophoneHealth({isBlocked: false, isEnabled: true, hasStream: false})).toBe('starting');
    expect(getMicrophoneHealth({isBlocked: false, isEnabled: true, hasStream: true})).toBe('working');
  });

  it('keeps a failed camera unavailable, even switched off', () => {
    expect(getCameraHealth({isUnavailable: true, isEnabled: false, hasStream: false})).toBe('unavailable');
    expect(getCameraHealth({isUnavailable: false, isEnabled: false, hasStream: false})).toBe('off');
    expect(getCameraHealth({isUnavailable: false, isEnabled: true, hasStream: false})).toBe('starting');
    expect(getCameraHealth({isUnavailable: false, isEnabled: true, hasStream: true})).toBe('working');
  });
});
