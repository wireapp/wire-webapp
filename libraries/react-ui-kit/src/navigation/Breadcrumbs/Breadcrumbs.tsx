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

import {ReactNode} from 'react';

import {BreadcrumbItem} from './BreadcrumbItem/BreadcrumbItem';
import {BreadcrumbLeaf} from './BreadcrumbLeaf/BreadcrumbLeaf';
import {listStyles} from './Breadcrumbs.styles';
import {CombainedBreadcrumbs} from './CombainedBreadcrumbs/CombainedBreadcrumbs';

const DEFAULT_MAX_VISIBLE_BREADCRUMBS = 4;

interface BreadcrumbsProps {
  /**
   * Maximum number of items to display before combining middle items into a dropdown.
   * @default 4
   */
  maxNotCombinedItems?: number;

  items: Array<{name: string; icon?: ReactNode}>;

  onItemClick: (item: {name: string}) => void;
}

/**
 * A navigation component that displays a hierarchical path of items, allowing users to navigate through different levels.
 * When the number of items exceeds the maximum visible limit, it combines middle items into a dropdown menu
 * while keeping the first and last two items visible.
 *
 * Example:
 * ```tsx
 * <Breadcrumbs items={[{name: 'Home'}, {name: 'Folder'}, {name: 'Subfolder'}]} onItemClick={() => {}} />
 * ```
 */
export const Breadcrumbs = ({
  maxNotCombinedItems = DEFAULT_MAX_VISIBLE_BREADCRUMBS,
  items,
  onItemClick,
}: BreadcrumbsProps) => {
  if (items.length <= maxNotCombinedItems) {
    return (
      <ol css={listStyles}>
        {items.map((crumb, index) => (
          <>
            {index > 0 && <BreadcrumbLeaf />}
            <BreadcrumbItem
              key={crumb.name}
              name={crumb.name}
              icon={crumb.icon}
              isActive={index === items.length - 1}
              onClick={() => onItemClick(crumb)}
              isFirst={index === 0}
            />
          </>
        ))}
      </ol>
    );
  }

  const firstCrumb = items[0];

  // eslint-disable-next-line no-magic-numbers
  const lastTwoCrumbs = items.slice(-2);
  // eslint-disable-next-line no-magic-numbers
  const middleCrumbs = items.slice(1, -2);

  return (
    <ol css={listStyles}>
      <BreadcrumbItem
        name={firstCrumb.name}
        icon={firstCrumb.icon}
        isActive={false}
        onClick={() => onItemClick(firstCrumb)}
        isFirst={true}
      />
      <BreadcrumbLeaf />
      <CombainedBreadcrumbs items={middleCrumbs} onItemClick={onItemClick} />
      <BreadcrumbLeaf />
      {lastTwoCrumbs.map((crumb, index) => (
        <>
          {index > 0 && <BreadcrumbLeaf />}
          <BreadcrumbItem
            key={crumb.name}
            name={crumb.name}
            icon={crumb.icon}
            isActive={index === lastTwoCrumbs.length - 1}
            onClick={() => onItemClick(crumb)}
            isFirst={false}
          />
        </>
      ))}
    </ol>
  );
};
