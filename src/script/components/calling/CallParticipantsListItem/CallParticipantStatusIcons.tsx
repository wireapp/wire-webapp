/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {Icon} from 'Components/Icon';

import {ParticipantMicOnIcon} from '../ParticipantMicOnIcon';

interface CallParticipantStatusIconsProps {
  sharesScreen: boolean;
  sharesCamera: boolean;
  isMuted: boolean;
  isActivelySpeaking: boolean;
}

export const CallParticipantStatusIcons = ({
  sharesScreen,
  sharesCamera,
  isMuted,
  isActivelySpeaking,
}: CallParticipantStatusIconsProps) => (
  <>
    {sharesScreen && <Icon.Screenshare className="screenshare-icon" data-uie-name="status-screenshare" />}

    {sharesCamera && <Icon.Camera className="camera-icon" data-uie-name="status-video" />}

    {isMuted ? (
      <Icon.MicOff className="mic-off-icon" data-uie-name="status-audio-off" style={{height: 12, width: 12}} />
    ) : (
      <ParticipantMicOnIcon
        className="participant-mic-on-icon"
        isActive={isActivelySpeaking}
        data-uie-name={isActivelySpeaking ? 'status-active-speaking' : 'status-audio-on'}
      />
    )}
  </>
);
