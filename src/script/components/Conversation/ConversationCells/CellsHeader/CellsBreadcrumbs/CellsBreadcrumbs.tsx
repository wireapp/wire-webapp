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

import {ChevronUpIcon} from '@wireapp/react-ui-kit';

import {activeItemStyles, buttonStyles, iconStyles, listItemStyles, listStyles} from './CellsBreadcrumbs.styles';
import {getBreadcrumbsFromUrl} from './getBreadcrumbsFromUrl/getBreadcrumbsFromUrl';
import {openBreadcrumb} from './openBreadcrumb/openBreadcrumb';

interface CellsBreadcrumbsProps {
  conversationQualifiedId: QualifiedId;
  conversationName: string;
}

export const CellsBreadcrumbs = ({conversationQualifiedId, conversationName}: CellsBreadcrumbsProps) => {
  const breadcrumbs = getBreadcrumbsFromUrl({baseCrumb: `${conversationName} files`});

  return (
    <ol css={listStyles}>
      {breadcrumbs.map((crumb, index) => (
        <li key={crumb.path} css={listItemStyles}>
          {index > 0 && <ChevronUpIcon css={iconStyles} width={12} height={12} />}
          {index === breadcrumbs.length - 1 ? (
            <span aria-current="page" css={activeItemStyles}>
              {crumb.name}
            </span>
          ) : (
            <button
              type="button"
              css={buttonStyles}
              onClick={event => openBreadcrumb({conversationQualifiedId, path: crumb.path, event})}
            >
              {crumb.name}
            </button>
          )}
        </li>
      ))}
    </ol>
  );
};
