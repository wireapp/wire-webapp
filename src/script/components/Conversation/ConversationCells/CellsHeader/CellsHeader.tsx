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

import {CellsBreadcrumbs} from './CellsBreadcrumbs/CellsBreadcrumbs';
import {contentStyles, wrapperStyles} from './CellsHeader.styles';
import {CellsRefresh} from './CellsRefresh/CellsRefresh';

interface CellsHeaderProps {
  onRefresh: () => void;
  conversationName: string;
  conversationQualifiedId: QualifiedId;
}

export const CellsHeader = ({onRefresh, conversationQualifiedId, conversationName}: CellsHeaderProps) => {
  return (
    <div css={wrapperStyles}>
      <div css={contentStyles}>
        <CellsBreadcrumbs conversationQualifiedId={conversationQualifiedId} conversationName={conversationName} />
        <CellsRefresh onRefresh={onRefresh} />
      </div>
    </div>
  );
};
