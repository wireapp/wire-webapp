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

import * as Icon from 'Components/Icon';
import {Participant} from 'Repositories/calling/Participant';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';

import {
  callStatusIcons,
  cameraIcon,
  micOffIcon,
  micOffWrapper,
  screenShareIcon,
} from './CallParticipantsListItem.styles';

import {ParticipantMicOnIcon} from '../ParticipantMicOnIcon';

interface CallParticipantStatusIconsProps {
  callParticipant: Participant;
}

const DEFAULT_VISIBLE_ICONS = 1;

export const CallParticipantStatusIcons = ({callParticipant}: CallParticipantStatusIconsProps) => {
  const {sharesCamera, sharesScreen, isActivelySpeaking, isMuted} = useKoSubscribableChildren(callParticipant, [
    'sharesCamera',
    'sharesScreen',
    'isActivelySpeaking',
    'isMuted',
  ]);

  const activeIconsCount = [sharesCamera, sharesScreen].filter(Boolean).length;

  return (
    <div css={callStatusIcons(activeIconsCount + DEFAULT_VISIBLE_ICONS)}>
      {sharesScreen && <Icon.ScreenshareIcon css={screenShareIcon} data-uie-name="status-screenshare" />}

      {sharesCamera && <Icon.CameraIcon css={cameraIcon} data-uie-name="status-video" />}

      {isMuted ? (
        <span css={micOffWrapper}>
          <Icon.MicOffIcon css={micOffIcon} data-uie-name="status-audio-off" />
        </span>
      ) : (
        <ParticipantMicOnIcon
          className="participant-mic-on-icon"
          isActive={isActivelySpeaking}
          data-uie-name={isActivelySpeaking ? 'status-active-speaking' : 'status-audio-on'}
        />
      )}
    </div>
  );
};
