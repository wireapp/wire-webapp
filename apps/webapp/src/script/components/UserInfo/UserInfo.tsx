/*
 * Wire
 * Copyright (C) 2020 Wire Swiss GmbH
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

import React from 'react';

import {CSSObject} from '@emotion/react';
import cx from 'classnames';
import {selfIndicator} from 'Components/ParticipantItemContent/ParticipantItem.styles';
import {UserName} from 'Components/UserName';
import {User} from 'Repositories/entity/User';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {KEY} from 'Util/KeyboardUtil';

interface UserInfoProps {
  user: User;
  className?: string;
  dataUieName?: string;
  selfString?: string;
  title?: string;
  onClick?: (event: React.MouseEvent | React.KeyboardEvent) => void;
  isActive?: boolean;
  children?: React.ReactNode;
}

const buttonCommonStyles: CSSObject = {
  background: 'none',
  border: 'none',
  textTransform: 'uppercase',
};

export const UserInfo = ({
  user,
  className,
  dataUieName,
  selfString,
  title,
  isActive = false,
  onClick,
  children,
}: UserInfoProps) => {
  const {name} = useKoSubscribableChildren(user, ['name']);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const {key} = event;
    if (key === KEY.ENTER || key === KEY.SPACE) {
      const {top, left, height} = (event.target as Element).getBoundingClientRect();
      const newEvent = new MouseEvent('MouseEvent', {
        ...event.nativeEvent,
        clientX: left,
        clientY: top + height,
      });

      onClick?.({
        ...event,
        nativeEvent: newEvent,
      } as unknown as React.MouseEvent<Element, MouseEvent>);
    }
  };

  const content = (
    <span data-uie-name={dataUieName} css={{alignItems: 'center', display: 'flex', overflow: 'hidden'}}>
      <span
        className={cx('conversation-list-cell-name', {'conversation-list-cell-name--active': isActive})}
        css={{userSelect: 'none'}}
        data-uie-name="status-label"
        title={title || name}
      >
        <UserName user={user} />
      </span>

      {selfString && <span css={selfIndicator}>{selfString}</span>}

      {children}
    </span>
  );

  const wrappedContent = onClick ? (
    <button
      type="button"
      css={
        isActive
          ? {...buttonCommonStyles, color: 'var(--accent-color)', userSelect: 'none'}
          : {...buttonCommonStyles, userSelect: 'none'}
      }
      data-uie-name="status-label"
      onClick={onClick}
      onKeyDown={handleKeyDown}
    >
      <span>search me</span>
      {content}
    </button>
  ) : (
    content
  );

  if (className) {
    return <span className={className}>{wrappedContent}</span>;
  }

  return wrappedContent;
};
