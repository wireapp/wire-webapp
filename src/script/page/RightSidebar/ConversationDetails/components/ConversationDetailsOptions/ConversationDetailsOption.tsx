/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {FC, ReactElement} from 'react';

import * as Icon from 'Components/Icon';

interface ConversationDetailsOptionProps {
  className: string;
  onClick?: () => void;
  title: string;
  icon: ReactElement;
  statusText: string;
  dataUieName: string;
  statusUieName: string;
  iconClassName?: string;
  disabled?: boolean;
}

const ConversationDetailsOption: FC<ConversationDetailsOptionProps> = ({
  className,
  onClick,
  title,
  icon,
  statusText,
  dataUieName,
  statusUieName,
  disabled = false,
}) => (
  <li className={className}>
    <button
      className="panel__action-item"
      onClick={onClick}
      data-uie-name={dataUieName}
      type="button"
      disabled={disabled}
    >
      <span className="panel__action-item__icon">{icon}</span>

      <span className="panel__action-item__summary">
        <span className="panel__action-item__text">
          <p>{title}</p>
        </span>

        <p className="panel__action-item__status" data-uie-name={statusUieName}>
          {statusText}
        </p>
      </span>

      {!disabled && <Icon.ChevronRight className="chevron-right-icon" />}
    </button>
  </li>
);

export {ConversationDetailsOption};
