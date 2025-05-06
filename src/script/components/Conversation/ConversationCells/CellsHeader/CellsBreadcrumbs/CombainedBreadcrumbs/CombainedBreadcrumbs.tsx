/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {KeyboardEvent, MouseEvent as ReactMouseEvent} from 'react';

import {QualifiedId} from '@wireapp/api-client/lib/user/';

import {showContextMenu} from 'src/script/ui/ContextMenu';
import {isSpaceOrEnterKey} from 'Util/KeyboardUtil';
import {setContextMenuPosition} from 'Util/util';

import {buttonStyles} from './CombainedBreadcrumbs.styles';

import {openBreadcrumb} from '../openBreadcrumb/openBreadcrumb';

interface CombainedBreadcrumbsProps {
  path: string;
  conversationQualifiedId: QualifiedId;
  items: Array<{name: string; path: string}>;
}

export const CombainedBreadcrumbs = ({path, conversationQualifiedId, items}: CombainedBreadcrumbsProps) => {
  const showOptionsMenu = (event: ReactMouseEvent<HTMLButtonElement> | MouseEvent) => {
    showContextMenu({
      event,
      entries: items.map(crumb => ({
        label: crumb.name,
        click: () => openBreadcrumb({conversationQualifiedId, path: crumb.path}),
      })),
      identifier: 'conversation-cells-combained-breadcrumbs',
    });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (isSpaceOrEnterKey(event.key)) {
      const newEvent = setContextMenuPosition(event);
      showOptionsMenu(newEvent);
    }
  };

  return (
    <li>
      <button type="button" css={buttonStyles} onKeyDown={handleKeyDown} onClick={showOptionsMenu}>
        ...
      </button>
    </li>
  );
};
