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

import {MouseEvent as ReactMouseEvent} from 'react';

import {parseQualifiedId} from '@wireapp/core/lib/util/qualifiedIdUtil';
import {useSidebarStore, SidebarTabs} from 'src/script/page/LeftSidebar/panels/Conversations/useSidebarStore';
import {generateConversationUrl} from 'src/script/router/routeGenerator';
import {createNavigate} from 'src/script/router/routerBindings';

export const openFolder = ({path, event}: {path: string; event?: ReactMouseEvent<HTMLButtonElement>}) => {
  const [idWithDomain, ...filePathParts] = path.split('/');
  const {id, domain} = parseQualifiedId(idWithDomain);
  const filePath = `files/${filePathParts.join('/')}`;

  const store = useSidebarStore.getState();

  store.setCurrentTab(SidebarTabs.RECENT);
  createNavigate(
    generateConversationUrl({
      id,
      domain,
      filePath,
    }),
  )(event);
};
