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

import {Badge, Tooltip} from '@wireapp/react-ui-kit';

import {tagCountStyles, tagListItemStyles, tagListStyles, tagWrapperStyles} from './CellsTagsColumn.styles';

interface CellsTagsColumnProps {
  tags: string[];
}

export const CellsTagsColumn = ({tags}: CellsTagsColumnProps) => {
  if (tags.length === 0) {
    return null;
  }

  if (tags.length === 1) {
    return <TagWithCount tag={tags[0]} count={tags.length} />;
  }

  return (
    <Tooltip body={<TagsList tags={tags} />}>
      <TagWithCount tag={tags[0]} count={tags.length} />
    </Tooltip>
  );
};

const TagWithCount = ({tag, count}: {tag: string; count: number}) => {
  return (
    <div css={tagWrapperStyles}>
      <Badge>{tag}</Badge>
      {count > 1 && <div css={tagCountStyles}>+{count - 1}</div>}
    </div>
  );
};

const TagsList = ({tags}: {tags: string[]}) => {
  return (
    <ul css={tagListStyles}>
      {tags.map(tag => (
        <li css={tagListItemStyles} key={tag}>
          <Badge>{tag}</Badge>
        </li>
      ))}
    </ul>
  );
};
