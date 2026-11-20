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

import {container} from 'tsyringe';

import {actionsStyles, headingStyles, wrapperStyles} from './meetingHeader.styles';

import {useApplicationContext} from '../../../page/rootProvider';
import {useAppMainState, ViewType} from '../../../page/state';
import {UserState} from '../../../repositories/user/userState';
import {IconButton, IconButtonVariant} from '../../../uiKit/inputs/iconButton/iconButton';
import {useMatchMedia} from '../../../uiKit/layout/matchMedia/matchMedia';
import {QUERY} from '../../../uiKit/utils/mediaQueries';
import {MeetingMultiActionButton} from '../meetingMultiActionButton/meetingMultiActionButton';

export const MeetingHeader: FunctionComponent<{showActions?: boolean; isLinkedMeeting?: boolean}> = ({
  showActions = true,
  isLinkedMeeting = false,
}) => {
  const {translate} = useApplicationContext();
  const isMobileView = useMatchMedia(QUERY.tabletSMDown);
  const isTemporaryGuest = container.resolve(UserState).self()?.isTemporaryGuest();
  const setCurrentView = useAppMainState(state => {
    return state.responsiveView.setCurrentView;
  });

  return (
    <header css={wrapperStyles}>
      {isLinkedMeeting && isTemporaryGuest && isMobileView && (
        <IconButton
          variant={IconButtonVariant.SECONDARY}
          className="icon-back"
          aria-label={translate('index.goBack')}
          onClick={() => {
            setCurrentView(ViewType.MOBILE_LEFT_SIDEBAR);
          }}
          data-uie-name="go-to-guest-panel"
        />
      )}
      <h2 css={headingStyles}>{translate('meetings.navigation.title')}</h2>
      {showActions && (
        <div css={actionsStyles}>
          <MeetingMultiActionButton />
        </div>
      )}
    </header>
  );
};
