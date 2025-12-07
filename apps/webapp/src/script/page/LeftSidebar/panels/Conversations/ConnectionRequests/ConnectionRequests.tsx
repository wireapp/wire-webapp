/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import cx from 'classnames';
import {Avatar, AVATAR_SIZE, GroupAvatar} from 'Components/Avatar';
import {User} from 'Repositories/entity/User';
import {handleKeyDown, KEY} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';

import {TabIndex} from '@wireapp/react-ui-kit';

import {ContentState, useAppState} from '../../../../useAppState';

interface ConnectionRequestsProps {
  connectionRequests: User[];
  onConnectionRequestClick: () => void;
}

export const ConnectionRequests = ({connectionRequests, onConnectionRequestClick}: ConnectionRequestsProps) => {
  const contentState = useAppState(state => state.contentState);
  const isShowingConnectionRequests = contentState === ContentState.CONNECTION_REQUESTS;
  const connectionRequestsCount = connectionRequests.length;

  if (connectionRequestsCount === 0) {
    return null;
  }

  const connectionText =
    connectionRequestsCount > 1
      ? t('conversationsConnectionRequestMany', {number: connectionRequestsCount})
      : t('conversationsConnectionRequestOne');

  return (
    <ul css={{margin: 0, paddingLeft: 0}} data-uie-name="connection-requests">
      <li tabIndex={TabIndex.UNFOCUSABLE} data-uie-name="connection-request">
        <div
          role="button"
          tabIndex={TabIndex.FOCUSABLE}
          className={cx('conversation-list-cell', {
            'conversation-list-cell--active': isShowingConnectionRequests,
          })}
          onClick={onConnectionRequestClick}
          onKeyDown={event =>
            handleKeyDown({
              event,
              callback: onConnectionRequestClick,
              keys: [KEY.ENTER, KEY.SPACE],
            })
          }
        >
          <div className="conversation-list-cell-left">
            {connectionRequestsCount === 1 ? (
              <Avatar participant={connectionRequests[0]} avatarSize={AVATAR_SIZE.SMALL} />
            ) : (
              <GroupAvatar />
            )}
          </div>

          <div className="conversation-list-cell-center">
            <span
              className={cx('conversation-list-cell-name', {
                'conversation-list-cell-name--active': isShowingConnectionRequests,
              })}
              data-uie-name="item-pending-requests"
            >
              {connectionText}
            </span>
          </div>

          <div className="conversation-list-cell-right">
            <span
              className="conversation-list-cell-badge cell-badge-dark icon-pending"
              data-uie-name="status-pending"
            />
          </div>
        </div>
      </li>
    </ul>
  );
};
