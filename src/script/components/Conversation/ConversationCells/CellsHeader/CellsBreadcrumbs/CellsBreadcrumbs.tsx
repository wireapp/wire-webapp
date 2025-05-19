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

import {BreadcrumbIcon} from './BreadcrumbIcon/BreadcrumbIcon';
import {BreadcrumbItem} from './BreadcrumbItem/BreadcrumbItem';
import {BreadcrumbLeaf} from './BreadcrumbLeaf/BreadcrumbLeaf';
import {listStyles} from './CellsBreadcrumbs.styles';
import {CombainedBreadcrumbs} from './CombainedBreadcrumbs/CombainedBreadcrumbs';
import {getBreadcrumbsFromUrl} from './getBreadcrumbsFromUrl/getBreadcrumbsFromUrl';

interface CellsBreadcrumbsProps {
  conversationQualifiedId: QualifiedId;
  conversationName: string;
}

const MAX_VISIBLE_BREADCRUMBS = 4;

export const CellsBreadcrumbs = ({conversationQualifiedId, conversationName}: CellsBreadcrumbsProps) => {
  const breadcrumbs = getBreadcrumbsFromUrl({baseCrumb: `${conversationName} files`});

  if (breadcrumbs.length <= MAX_VISIBLE_BREADCRUMBS) {
    return (
      <ol css={listStyles}>
        {breadcrumbs.map((crumb, index) => (
          <>
            {index > 0 && <BreadcrumbLeaf />}
            <BreadcrumbItem
              key={crumb.path}
              name={crumb.name}
              path={crumb.path}
              isActive={index === breadcrumbs.length - 1}
              conversationQualifiedId={conversationQualifiedId}
              icon={<BreadcrumbIcon name={crumb.path} />}
            />
          </>
        ))}
      </ol>
    );
  }

  const firstCrumb = breadcrumbs[0];

  // eslint-disable-next-line no-magic-numbers
  const lastTwoCrumbs = breadcrumbs.slice(-2);
  // eslint-disable-next-line no-magic-numbers
  const middleCrumbs = breadcrumbs.slice(1, -2);

  const dotsPath = middleCrumbs[middleCrumbs.length - 1]?.path || '';

  return (
    <ol css={listStyles}>
      <BreadcrumbItem
        name={firstCrumb.name}
        path={firstCrumb.path}
        isActive={false}
        conversationQualifiedId={conversationQualifiedId}
      />
      <BreadcrumbLeaf />
      <CombainedBreadcrumbs path={dotsPath} conversationQualifiedId={conversationQualifiedId} items={middleCrumbs} />
      <BreadcrumbLeaf />
      {lastTwoCrumbs.map((crumb, index) => (
        <>
          {index > 0 && <BreadcrumbLeaf />}
          <BreadcrumbItem
            key={crumb.path}
            name={crumb.name}
            path={crumb.path}
            isActive={index === lastTwoCrumbs.length - 1}
            conversationQualifiedId={conversationQualifiedId}
            icon={<BreadcrumbIcon name={crumb.path} />}
          />
        </>
      ))}
    </ol>
  );
};
