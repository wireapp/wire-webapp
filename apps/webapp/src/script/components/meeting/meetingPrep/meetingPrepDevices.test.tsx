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

import {act, fireEvent, render, screen} from '@testing-library/react';
import {Maybe, task} from 'true-myth';

import {MeetingPrepDevices} from './meetingPrepDevices';
import {getMeetingPrepSetupCallout} from './meetingPrepSetup';
import type {MeetingPrepSpeakerTestError} from './meetingPrepTypes';

import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from '../../../page/testSupport/rootContextTestSupport';
import {ThemeProvider} from '../../../uiKit/identity/theme/theme';
import type {Translate} from '../../../util/localizerUtil';

const translateForDevicesTest: Translate = (key, substitutions) => {
  return key === 'meetings.prep.speakerTestAriaLabel' ? `Test ${String(substitutions?.device)}` : key;
};

const mediaDevice = (deviceId: string, label: string, kind: MediaDeviceKind): MediaDeviceInfo => {
  return {
    deviceId,
    label,
    kind,
    groupId: 'group',
    toJSON: () => {
      return {};
    },
  };
};

type DevicesProps = Parameters<typeof MeetingPrepDevices>[0];

const createProps = (overrides: Partial<DevicesProps> = {}): DevicesProps => {
  return {
    callout: Maybe.nothing(),
    microphone: {
      devices: [mediaDevice('mic-1', 'Mic 1', 'audioinput')],
      selectedId: 'mic-1',
      onSelect: jest.fn(),
      isSelectable: true,
    },
    speaker: {
      devices: [mediaDevice('speaker-1', 'Speaker 1', 'audiooutput')],
      selectedId: 'speaker-1',
      onSelect: jest.fn(),
      isSelectable: true,
    },
    camera: {
      devices: [mediaDevice('camera-1', 'Camera 1', 'videoinput')],
      selectedId: 'camera-1',
      onSelect: jest.fn(),
      isSelectable: true,
    },
    microphoneHealth: 'off',
    cameraHealth: 'off',
    microphoneStream: Maybe.nothing(),
    playSpeakerTest: () => {
      return task.resolve(undefined);
    },
    ...overrides,
  };
};

const renderDevices = (props: DevicesProps, onModalKeyDown: jest.Mock = jest.fn()): void => {
  render(
    <ThemeProvider>
      <div onKeyDown={onModalKeyDown}>
        <MeetingPrepDevices {...props} />
      </div>
    </ThemeProvider>,
    {wrapper: createRootProviderWrapperForTest(createRootContextValueForTest({translate: translateForDevicesTest}))},
  );
};

describe('MeetingPrepDevices', () => {
  it('shows a success callout and a warning callout in the same format', () => {
    renderDevices(createProps({callout: getMeetingPrepSetupCallout({microphone: 'working', camera: 'working'})}));
    expect(screen.getByTestId('meeting-prep-setup-callout')).toHaveAttribute('data-uie-value', 'success');
    expect(screen.getByRole('status')).toHaveTextContent('meetings.prep.setupMicrophoneAndCameraWorking');
  });

  it('adds the fix to a warning', () => {
    renderDevices(createProps({callout: getMeetingPrepSetupCallout({microphone: 'blocked', camera: 'off'})}));
    const callout = screen.getByTestId('meeting-prep-setup-callout');

    expect(callout).toHaveAttribute('data-uie-value', 'warning');
    expect(callout).toHaveTextContent('meetings.prep.setupMicrophoneBlocked meetings.prep.setupMicrophoneBlockedHint');
  });

  it('names the selected devices, or why one is missing', () => {
    renderDevices(createProps({microphoneHealth: 'blocked', cameraHealth: 'unavailable'}));

    expect(screen.getByRole('button', {name: /meetings.prep.deviceMicrophone/})).toHaveTextContent(
      'meetings.prep.deviceBlocked',
    );
    expect(screen.getByRole('button', {name: /meetings.prep.deviceSpeaker/})).toHaveTextContent('Speaker 1');
    expect(screen.getByRole('button', {name: /meetings.prep.deviceCamera/})).toHaveTextContent(
      'meetings.prep.deviceNotAvailable',
    );
  });

  it('plays the speaker test once at a time, then offers it again', async () => {
    let finish: () => void = () => {
      return undefined;
    };
    const playSpeakerTest = jest.fn(() => {
      return task.fromPromise<void, MeetingPrepSpeakerTestError>(
        new Promise<void>(resolve => {
          finish = resolve;
        }),
        () => {
          return 'playbackFailed';
        },
      );
    });
    renderDevices(createProps({playSpeakerTest}));
    const testButton = screen.getByTestId('meeting-prep-speaker-test');
    expect(testButton).toHaveAccessibleName('Test Speaker 1');

    fireEvent.click(testButton);
    fireEvent.click(testButton);
    expect(playSpeakerTest).toHaveBeenCalledTimes(1);
    expect(testButton).toHaveAttribute('aria-disabled', 'true');
    expect(testButton).toHaveAccessibleName('meetings.prep.speakerTestPlaying');
    // Still focusable, so keyboard focus does not drop to the page while it plays.
    expect(testButton).toHaveFocus();

    await act(async () => {
      finish();
    });
    expect(testButton).toHaveAttribute('aria-disabled', 'false');
  });

  it('selects a device and closes its menu', () => {
    const props = createProps({
      speaker: {
        devices: [
          mediaDevice('speaker-1', 'Speaker 1', 'audiooutput'),
          mediaDevice('speaker-2', 'Speaker 2', 'audiooutput'),
        ],
        selectedId: 'speaker-1',
        onSelect: jest.fn(),
        isSelectable: true,
      },
    });
    renderDevices(props);

    fireEvent.click(screen.getByRole('button', {name: /meetings.prep.deviceSpeaker/}));
    fireEvent.click(screen.getByRole('option', {name: 'Speaker 2'}));

    expect(props.speaker.onSelect).toHaveBeenCalledWith('speaker-2');
    expect(screen.queryByRole('option', {name: 'Speaker 2'})).not.toBeInTheDocument();
  });

  it('keeps Escape inside an open menu away from the modal', () => {
    const onModalKeyDown = jest.fn();
    renderDevices(createProps(), onModalKeyDown);
    const microphoneRow = screen.getByRole('button', {name: /meetings.prep.deviceMicrophone/});

    fireEvent.click(microphoneRow);
    fireEvent.keyDown(screen.getByRole('option', {name: 'Mic 1'}), {key: 'Escape'});

    expect(screen.queryByRole('option', {name: 'Mic 1'})).not.toBeInTheDocument();
    expect(onModalKeyDown).not.toHaveBeenCalled();
    expect(microphoneRow).toHaveFocus();
  });

  it('shows a speaker the browser cannot switch without a menu', () => {
    renderDevices(
      createProps({
        speaker: {
          devices: [mediaDevice('speaker-1', 'Speaker 1', 'audiooutput')],
          selectedId: 'speaker-1',
          onSelect: jest.fn(),
          isSelectable: false,
        },
      }),
    );

    expect(screen.queryByRole('button', {name: /meetings.prep.deviceSpeaker/})).not.toBeInTheDocument();
    expect(screen.getByTestId('meeting-prep-speaker-row')).toHaveTextContent('Speaker 1');
  });

  it('falls back to the generic device name before the browser shares labels', () => {
    renderDevices(
      createProps({microphone: {devices: [], selectedId: 'default', onSelect: jest.fn(), isSelectable: true}}),
    );

    expect(screen.getByRole('button', {name: /meetings.prep.deviceMicrophone/})).toHaveTextContent(
      'preferencesAVMicrophone',
    );
  });

  it('keeps Escape on the open menu after a click on the row itself', () => {
    const onModalKeyDown = jest.fn();
    renderDevices(createProps(), onModalKeyDown);
    const row = screen.getByTestId('meeting-prep-camera-row');

    fireEvent.click(screen.getByRole('button', {name: /meetings.prep.deviceCamera/}));
    act(() => {
      row.focus();
    });
    fireEvent.keyDown(row, {key: 'Escape'});

    expect(screen.queryByRole('option', {name: 'Camera 1'})).not.toBeInTheDocument();
    expect(onModalKeyDown).not.toHaveBeenCalled();
  });

  it('closes an open menu when keyboard focus moves to another row', () => {
    renderDevices(createProps());

    fireEvent.click(screen.getByRole('button', {name: /meetings.prep.deviceMicrophone/}));
    act(() => {
      screen.getByRole('button', {name: /meetings.prep.deviceCamera/}).focus();
    });

    expect(screen.queryByRole('option', {name: 'Mic 1'})).not.toBeInTheDocument();
  });

  it('names unlabelled devices in the menu too', () => {
    renderDevices(
      createProps({
        camera: {
          devices: [mediaDevice('camera-1', '', 'videoinput')],
          selectedId: 'camera-1',
          onSelect: jest.fn(),
          isSelectable: true,
        },
      }),
    );
    fireEvent.click(screen.getByRole('button', {name: /meetings.prep.deviceCamera/}));

    expect(screen.getByRole('option', {name: 'preferencesAVCamera'})).toBeInTheDocument();
  });

  it('drops an open menu when its device can no longer be switched', () => {
    const props = createProps();
    const {rerender} = render(
      <ThemeProvider>
        <MeetingPrepDevices {...props} />
      </ThemeProvider>,
      {wrapper: createRootProviderWrapperForTest(createRootContextValueForTest({translate: translateForDevicesTest}))},
    );
    fireEvent.click(screen.getByRole('button', {name: /meetings.prep.deviceSpeaker/}));
    expect(screen.getByRole('option', {name: 'Speaker 1'})).toBeInTheDocument();

    rerender(
      <ThemeProvider>
        <MeetingPrepDevices {...props} speaker={{...props.speaker, isSelectable: false}} />
      </ThemeProvider>,
    );

    expect(screen.queryByRole('option', {name: 'Speaker 1'})).not.toBeInTheDocument();
  });
});
