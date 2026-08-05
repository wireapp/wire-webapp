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

import {SidebarTabs} from 'src/script/page/leftSidebar/panels/conversations/useSidebarStore';

type ConversationTabActionProps =
  | {
      onChangeTab: (tab: SidebarTabs) => void;
      onClick?: never;
    }
  | {
      onChangeTab?: never;
      onClick: React.MouseEventHandler<HTMLButtonElement>;
    };

type ConversationTabProps = {
  title: string;
  label?: string;
  type: SidebarTabs;
  conversationTabIndex: number;
  Icon: JSX.Element;
  unreadConversations?: number;
  dataUieName: string;
  isActive?: boolean;
  showNotificationsBadge?: boolean;
  onMouseEnter?: React.MouseEventHandler<HTMLButtonElement>;
  onMouseLeave?: React.MouseEventHandler<HTMLButtonElement>;
  onFocus?: React.FocusEventHandler<HTMLButtonElement>;
  onBlur?: React.FocusEventHandler<HTMLButtonElement>;
} & ConversationTabActionProps;

export const ConversationTab = ({
  title,
  label,
  type,
  conversationTabIndex,
  onChangeTab,
  onClick,
  Icon,
  unreadConversations = 0,
  dataUieName,
  isActive = false,
  showNotificationsBadge = false,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
}: ConversationTabProps) => {
  return (
    <button
      id={`tab-${conversationTabIndex}`}
      type="button"
      role="tab"
      className={cx(`conversations-sidebar-btn`, {active: isActive})}
      onClick={event => {
        if (onClick) {
          onClick(event);
          return;
        }

        onChangeTab(type);
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onFocus={onFocus}
      onBlur={onBlur}
      title={title}
      data-uie-name={dataUieName}
      data-uie-status={isActive ? 'active' : 'inactive'}
      aria-selected={isActive}
    >
      <span className="conversations-sidebar-btn--text-wrapper">
        {Icon}
        {(unreadConversations > 0 || showNotificationsBadge) && (
          <span
            className={cx('conversations-sidebar-btn--badge', {active: isActive})}
            data-uie-name={showNotificationsBadge ? 'notification-badge' : 'unread-badge'}
          />
        )}
        <span className="conversations-sidebar-btn--text">{label || title}</span>
      </span>
    </button>
  );
};
