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

import {wrapperStyles, countStyles, listStyles, listItemStyles} from './BadgesWithTooltip.styles';

import {Tooltip} from '../../Form/Tooltip';
import {Badge} from '../Badge';

export const BadgesWithTooltip = ({items}: {items: string[]}) => {
  if (items.length === 1) {
    return <BadgeWithCount item={items[0]} count={items.length} />;
  }

  return (
    <Tooltip body={<BadgeList items={items} />}>
      <BadgeWithCount item={items[0]} count={items.length} />
    </Tooltip>
  );
};

const BadgeWithCount = ({item, count}: {item: string; count: number}) => {
  return (
    <div css={wrapperStyles}>
      <Badge>{item}</Badge>
      {count > 1 && <div css={countStyles}>+{count - 1}</div>}
    </div>
  );
};

const BadgeList = ({items}: {items: string[]}) => {
  return (
    <ul css={listStyles}>
      {items.map(item => (
        <li css={listItemStyles} key={item}>
          <Badge>{item}</Badge>
        </li>
      ))}
    </ul>
  );
};
