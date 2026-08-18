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

import {isUndefined} from '@sindresorhus/is';
import type {QualifiedId} from '@wireapp/api-client/lib/user';

import {Tooltip} from '@wireapp/react-ui-kit';

import {Avatar, AVATAR_SIZE} from 'Components/avatar';
import type {User} from 'Repositories/entity/User';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {matchQualifiedIds} from 'Util/qualifiedId';

import {avatarItemStyles} from './stackedAvatars.styles';

interface ParticipantAvatarTooltipProps {
  participant: User;
  organizer?: QualifiedId;
  index?: number;
  avatarSize: AVATAR_SIZE;
  avatarRingColor?: string;
}

export const ParticipantAvatarTooltip = ({
  participant,
  organizer,
  index = 0,
  avatarSize,
  avatarRingColor,
}: ParticipantAvatarTooltipProps) => {
  const {translate} = useApplicationContext();
  const isOrganizer = !isUndefined(organizer) && matchQualifiedIds(participant.qualifiedId, organizer);
  const organizerLabel = translate('meetings.participant.organizer');
  const label = `${participant.name()}${isOrganizer ? ` (${organizerLabel})` : ''}`;

  return (
    <Tooltip body={label}>
      <div css={avatarRingColor ? avatarItemStyles(index, avatarRingColor) : undefined}>
        <Avatar
          participant={participant}
          aria-label={label}
          title={undefined}
          avatarSize={avatarSize}
          hideAvailabilityStatus
          noBadge
          className="cursor-default"
        />
      </div>
    </Tooltip>
  );
};
