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

import {QualifiedId} from '@wireapp/api-client/lib/user/';

import {generateConversationUrl} from 'src/script/router/routeGenerator';
import {createNavigate} from 'src/script/router/routerBindings';

interface CellsBreadcrumbsProps {
  conversationQualifiedId: QualifiedId;
}

export const CellsBreadcrumbs = ({conversationQualifiedId}: CellsBreadcrumbsProps) => {
  // Get current path from URL hash
  const hash = window.location.hash.replace('#', '');
  const parts = hash.split('/files/');
  const currentPath = parts.length < 2 ? '' : decodeURIComponent(parts[1]);

  // Split path into segments
  const segments = currentPath.split('/').filter(Boolean);

  // Generate breadcrumbs items
  const breadcrumbs = [
    {
      name: 'Base',
      path: '',
    },
    ...segments.map((segment, index) => ({
      name: segment,
      path: segments.slice(0, index + 1).join('/'),
    })),
  ];

  return (
    <div style={{display: 'flex', gap: '8px', padding: '8px 16px', alignItems: 'center'}}>
      {breadcrumbs.map((crumb, index) => (
        <div key={crumb.path} style={{display: 'flex', alignItems: 'center'}}>
          {index > 0 && <span style={{margin: '0 8px'}}>/</span>}
          <button
            type="button"
            onClick={event => {
              createNavigate(
                generateConversationUrl({
                  id: conversationQualifiedId.id,
                  domain: conversationQualifiedId.domain,
                  filePath: crumb.path ? `files/${encodeURIComponent(crumb.path)}` : 'files',
                }),
              )(event);
            }}
            style={{
              background: 'none',
              border: 'none',
              padding: '4px 8px',
              cursor: 'pointer',
              color: '#0078D4',
              textDecoration: 'underline',
            }}
          >
            {crumb.name}
          </button>
        </div>
      ))}
    </div>
  );
};
