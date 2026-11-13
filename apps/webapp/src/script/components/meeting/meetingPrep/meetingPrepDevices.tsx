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
  type Dispatch,
  type ReactElement,
  type ReactNode,
  type SetStateAction,
  useCallback,
  useRef,
  useState,
} from 'react';

import {Maybe, maybe} from 'true-myth';

import {
  meetingPrepCalloutStatusStyles,
  meetingPrepCalloutSuccessStyles,
  meetingPrepCalloutWarningStyles,
  meetingPrepDeviceRowsStyles,
  meetingPrepRowActionStyles,
  meetingPrepRowLabelStyles,
  meetingPrepRowMenuStyles,
  meetingPrepRowMeterStyles,
  meetingPrepRowStaticStyles,
  meetingPrepRowStyles,
  meetingPrepRowTextStyles,
  meetingPrepRowTriggerStyles,
  meetingPrepRowValueStyles,
} from './meetingPrepDevices.styles';
import type {CameraHealth, MeetingPrepSetupCallout, MicrophoneHealth} from './meetingPrepSetup';
import type {PlayMeetingPrepSpeakerTest} from './meetingPrepTypes';

import {useCloseOnEscapeOrOutsidePress} from '../../../hooks/useCloseOnEscapeOrOutsidePress';
import {InputLevel} from '../../../page/mainContent/panels/preferences/avPreferences/inputLevel';
import {useApplicationContext} from '../../../page/rootProvider';
import {AlertIcon} from '../../../uiKit/dataDisplay/icon/alertIcon';
import {CameraIcon} from '../../../uiKit/dataDisplay/icon/cameraIcon';
import {CheckRoundIcon} from '../../../uiKit/dataDisplay/icon/checkRoundIcon';
import {ChevronDownIcon} from '../../../uiKit/dataDisplay/icon/chevronDownIcon';
import {SpeakerIcon} from '../../../uiKit/dataDisplay/icon/speakerIcon';
import {VideoControlsSelect} from '../../calling/VideoControls/VideoControlsSelect/VideoControlsSelect';
import {MicOnIcon} from '../../icon';

type DeviceKind = 'microphone' | 'speaker' | 'camera';

export interface MeetingPrepDeviceList {
  readonly devices: readonly MediaDeviceInfo[];
  readonly selectedId: string;
  readonly onSelect: (deviceId: string) => void;
  /** False where the browser cannot switch this device (speaker output in some browsers). */
  readonly isSelectable: boolean;
}

interface MeetingPrepDevicesProps {
  readonly callout: Maybe<MeetingPrepSetupCallout>;
  readonly microphone: MeetingPrepDeviceList;
  readonly speaker: MeetingPrepDeviceList;
  readonly camera: MeetingPrepDeviceList;
  readonly microphoneHealth: MicrophoneHealth;
  readonly cameraHealth: CameraHealth;
  /** The live microphone stream; present only while the microphone works. */
  readonly microphoneStream: Maybe<MediaStream>;
  readonly playSpeakerTest: PlayMeetingPrepSpeakerTest;
}

/** The selected device's name, or the generic name before the browser shares device labels. */
const deviceLabel = (device: MediaDeviceInfo, fallback: string): string => {
  return device.label.length > 0 ? device.label : fallback;
};

const selectedLabel = ({devices, selectedId}: MeetingPrepDeviceList, fallback: string): string => {
  return maybe
    .find(device => {
      return device.deviceId === selectedId;
    }, devices)
    .mapOr(fallback, device => {
      return deviceLabel(device, fallback);
    });
};

interface DeviceRowProps {
  readonly kind: DeviceKind;
  readonly icon: ReactNode;
  readonly label: string;
  readonly value: string;
  /** The name for a device the browser has not labelled yet. */
  readonly fallbackName: string;
  readonly list: MeetingPrepDeviceList;
  readonly openMenu: Maybe<DeviceKind>;
  readonly setOpenMenu: Dispatch<SetStateAction<Maybe<DeviceKind>>>;
  readonly detail?: ReactNode;
  readonly action?: ReactNode;
}

const DeviceRow = ({
  kind,
  icon,
  label,
  value,
  fallbackName,
  list,
  openMenu,
  setOpenMenu,
  detail,
  action,
}: DeviceRowProps): ReactElement => {
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = `meeting-prep-${kind}-devices`;
  // A row that can no longer switch devices drops its menu, so nothing stays open without a trigger.
  const isMenuOpen =
    list.isSelectable &&
    openMenu.mapOr(false, open => {
      return open === kind;
    });

  const closeMenu = useCallback((): void => {
    setOpenMenu(Maybe.nothing());
    triggerRef.current?.focus();
  }, [setOpenMenu]);
  const dismissMenu = useCallback((): void => {
    setOpenMenu(Maybe.nothing());
  }, [setOpenMenu]);

  // Inside the green room modal: with focus in the row, Escape closes the menu only.
  useCloseOnEscapeOrOutsidePress(rootRef, isMenuOpen, closeMenu, dismissMenu, {
    captureEscapeWhenFocused: true,
    closeOnFocusOut: true,
  });

  const options = list.devices.map(device => {
    return {label: deviceLabel(device, fallbackName), value: device.deviceId};
  });
  const text = (
    <span css={meetingPrepRowTextStyles}>
      <span css={meetingPrepRowLabelStyles}>{label}</span>
      <span css={meetingPrepRowValueStyles}>{value}</span>
    </span>
  );

  // tabIndex -1: a click on the row's padding keeps focus in the row, so Escape still closes only the menu.
  return (
    <div ref={rootRef} tabIndex={-1} css={meetingPrepRowStyles} data-uie-name={`meeting-prep-${kind}-row`}>
      {list.isSelectable ? (
        <button
          ref={triggerRef}
          type="button"
          css={meetingPrepRowTriggerStyles}
          aria-haspopup="listbox"
          aria-expanded={isMenuOpen}
          onClick={() => {
            triggerRef.current?.focus();
            setOpenMenu(isMenuOpen ? Maybe.nothing() : Maybe.just(kind));
          }}
        >
          {icon}
          {text}
          <ChevronDownIcon width={12} height={12} color="currentColor" aria-hidden="true" />
        </button>
      ) : (
        <div css={meetingPrepRowStaticStyles}>
          {icon}
          {text}
        </div>
      )}
      {detail}
      {action}
      {isMenuOpen && (
        <div css={meetingPrepRowMenuStyles}>
          <VideoControlsSelect
            id={menuId}
            dataUieName={menuId}
            value={options.find(option => {
              return option.value === list.selectedId;
            })}
            options={options}
            menuIsOpen
            overlayMenu={false}
            onChange={option => {
              list.onSelect(String(option?.value));
              closeMenu();
            }}
          />
        </div>
      )}
    </div>
  );
};

/**
 * The device part of the green room: a setup callout, then one row per device. Each row shows the
 * selected device and opens the call device menu; the microphone row shows the input level and the
 * speaker row plays a test sound.
 */
export const MeetingPrepDevices = ({
  callout,
  microphone,
  speaker,
  camera,
  microphoneHealth,
  cameraHealth,
  microphoneStream,
  playSpeakerTest,
}: MeetingPrepDevicesProps): ReactElement => {
  const {translate} = useApplicationContext();
  const [openMenu, setOpenMenu] = useState<Maybe<DeviceKind>>(Maybe.nothing());
  const [isSpeakerTestPlaying, setIsSpeakerTestPlaying] = useState(false);
  const speakerTestRef = useRef<HTMLButtonElement>(null);

  const testSpeaker = (): void => {
    // Safari and Firefox on macOS do not focus a clicked button; Escape is scoped to focus in the row.
    speakerTestRef.current?.focus();
    if (isSpeakerTestPlaying) {
      return;
    }
    setIsSpeakerTestPlaying(true);
    void playSpeakerTest(speaker.selectedId).then(() => {
      setIsSpeakerTestPlaying(false);
    });
  };

  const microphoneFallback = translate('preferencesAVMicrophone');
  const speakerFallback = translate('preferencesAVSpeakers');
  const cameraFallback = translate('preferencesAVCamera');
  const speakerName = selectedLabel(speaker, speakerFallback);
  const microphoneValue =
    microphoneHealth === 'blocked'
      ? translate('meetings.prep.deviceBlocked')
      : selectedLabel(microphone, microphoneFallback);
  const cameraValue =
    cameraHealth === 'unavailable'
      ? translate('meetings.prep.deviceNotAvailable')
      : selectedLabel(camera, cameraFallback);
  const speakerTestText = isSpeakerTestPlaying
    ? translate('meetings.prep.speakerTestPlaying')
    : translate('meetings.prep.speakerTest');

  return (
    <div>
      {/* Always mounted, so screen readers announce the callout when its content changes. */}
      <div role="status">
        {maybe.isJust(callout) && (
          <div
            css={callout.value.tone === 'success' ? meetingPrepCalloutSuccessStyles : meetingPrepCalloutWarningStyles}
            data-uie-name="meeting-prep-setup-callout"
            data-uie-value={callout.value.tone}
          >
            {callout.value.tone === 'success' ? (
              <CheckRoundIcon width={16} height={16} color="currentColor" aria-hidden="true" />
            ) : (
              <AlertIcon width={16} height={16} color="currentColor" aria-hidden="true" />
            )}
            <span>
              <span css={meetingPrepCalloutStatusStyles}>{translate(callout.value.status)}</span>
              {callout.value.hint.mapOr(null, hint => {
                return <span> {translate(hint)}</span>;
              })}
            </span>
          </div>
        )}
      </div>

      <div css={meetingPrepDeviceRowsStyles}>
        <DeviceRow
          kind="microphone"
          icon={<MicOnIcon />}
          label={translate('meetings.prep.deviceMicrophone')}
          value={microphoneValue}
          fallbackName={microphoneFallback}
          list={microphone}
          openMenu={openMenu}
          setOpenMenu={setOpenMenu}
          detail={microphoneStream.mapOr(undefined, stream => {
            return (
              <div css={meetingPrepRowMeterStyles} aria-hidden="true">
                <InputLevel disabled={false} mediaStream={stream} />
              </div>
            );
          })}
        />
        <DeviceRow
          kind="speaker"
          icon={<SpeakerIcon width={16} height={16} color="currentColor" aria-hidden="true" />}
          label={translate('meetings.prep.deviceSpeaker')}
          value={speakerName}
          fallbackName={speakerFallback}
          list={speaker}
          openMenu={openMenu}
          setOpenMenu={setOpenMenu}
          action={
            // aria-disabled, not disabled: a disabled button drops keyboard focus to the page.
            <button
              ref={speakerTestRef}
              type="button"
              css={meetingPrepRowActionStyles}
              aria-disabled={isSpeakerTestPlaying}
              aria-label={
                isSpeakerTestPlaying
                  ? speakerTestText
                  : translate('meetings.prep.speakerTestAriaLabel', {device: speakerName})
              }
              onClick={testSpeaker}
              data-uie-name="meeting-prep-speaker-test"
            >
              {speakerTestText}
            </button>
          }
        />
        <DeviceRow
          kind="camera"
          icon={<CameraIcon width={16} height={16} color="currentColor" aria-hidden="true" />}
          label={translate('meetings.prep.deviceCamera')}
          value={cameraValue}
          fallbackName={cameraFallback}
          list={camera}
          openMenu={openMenu}
          setOpenMenu={setOpenMenu}
        />
      </div>
    </div>
  );
};
