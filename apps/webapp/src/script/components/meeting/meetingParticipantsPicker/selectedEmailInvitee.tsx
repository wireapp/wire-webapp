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

import type {FunctionComponent} from 'react';

import {selectedEmailContentStyles} from './meetingParticipantsPicker.styles';

import {useApplicationContext} from '../../../page/rootProvider';
import {Checkbox, CheckboxLabel} from '../../../uiKit/inputs/checkbox/checkbox';
import {listWrapper} from '../../participantItemContent/participantItem.styles';

interface SelectedEmailInviteeProps {
  email: string;
  noUnderline: boolean;
  onRemove: (email: string) => void;
}

export const SelectedEmailInvitee: FunctionComponent<SelectedEmailInviteeProps> = ({email, noUnderline, onRemove}) => {
  const {translate} = useApplicationContext();

  return (
    <li css={listWrapper({noUnderline})} data-uie-name="selected-email-invitee">
      <Checkbox
        checked
        onChange={() => {
          onRemove(email);
        }}
        labelBeforeCheckbox
        aligncenter={false}
        outlineOffset="0"
        aria-label={translate('meetings.scheduleModal.emailUnselect', {email})}
      >
        <CheckboxLabel>
          <div css={selectedEmailContentStyles}>{email}</div>
        </CheckboxLabel>
      </Checkbox>
    </li>
  );
};
