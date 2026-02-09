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

import {useEffect, useRef} from 'react';

import {QualifiedId} from '@wireapp/api-client/lib/user/';

import {CloseIcon, Input, InputSubmitCombo, SearchIcon} from '@wireapp/react-ui-kit';

import {CellsRepository} from 'Repositories/cells/CellsRepository';
import {t} from 'Util/LocalizerUtil';

import {actionsStyles, contentStyles, searchInputStyles, wrapperStyles} from './CellsHeader.styles';
import {CellsMoreMenu} from './CellsMoreMenu/CellsMoreMenu';
import {CellsNewMenu} from './CellsNewMenu/CellsNewMenu';
import {CellsRefresh} from './CellsRefresh/CellsRefresh';

import {CellsBreadcrumbs} from '../common/CellsBreadcrumbs/CellsBreadcrumbs';
import {getBreadcrumbsFromPath} from '../common/getBreadcrumbsFromPath/getBreadcrumbsFromPath';
import {getCellsFilesPath} from '../common/getCellsFilesPath/getCellsFilesPath';
import {openBreadcrumb} from '../common/openBreadcrumb/openBreadcrumb';

interface CellsHeaderProps {
  onRefresh: () => void;
  conversationName: string;
  conversationQualifiedId: QualifiedId;
  cellsRepository: CellsRepository;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onSearchClear: () => void;
}

export const CellsHeader = ({
  onRefresh,
  conversationQualifiedId,
  conversationName,
  cellsRepository,
  searchValue,
  onSearchChange,
  onSearchClear,
}: CellsHeaderProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const breadcrumbs = getBreadcrumbsFromPath({
    baseCrumb: t('cells.breadcrumb.files', {conversationName}),
    currentPath: getCellsFilesPath(),
  });

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div css={wrapperStyles}>
      <div css={contentStyles}>
        <CellsBreadcrumbs
          items={breadcrumbs}
          onItemClick={item =>
            openBreadcrumb({
              conversationQualifiedId,
              path: breadcrumbs.find(crumb => crumb.name === item.name)?.path ?? '',
            })
          }
        />
        <div css={actionsStyles}>
          <CellsNewMenu
            cellsRepository={cellsRepository}
            conversationQualifiedId={conversationQualifiedId}
            onRefresh={onRefresh}
          />
          <CellsRefresh onRefresh={onRefresh} />
          <CellsMoreMenu conversationQualifiedId={conversationQualifiedId} />
        </div>
      </div>
      <InputSubmitCombo
        css={{
          ...searchInputStyles,
          marginLeft: '8px',
          marginTop: '24px',
          width: '288px',
          height: '32px',
          borderRadius: '8px',
          paddingLeft: '10px',
        }}
      >
        <SearchIcon />

        <Input
          wrapperCSS={{
            marginBottom: 0,
            width: '100%',
            '> div': {width: '100%'},
            input: {
              fontSize: '14px',
              height: '32px',
              '&:hover': {
                boxShadow: 'none',
              },
              '&:focus': {
                outline: 'none',
                boxShadow: 'none',
              },
            },
          }}
          type="text"
          value={searchValue}
          ref={inputRef}
          aria-label={t('cells.search.placeholder')}
          placeholder={t('cells.search.placeholder')}
          onChange={event => onSearchChange(event.currentTarget.value)}
          data-uie-name="full-search-header-input"
        />

        {searchValue && (
          <CloseIcon
            css={{cursor: 'pointer'}}
            data-uie-name="full-search-dismiss"
            aria-label={t('fullsearchCancelCloseBtn')}
            onClick={onSearchClear}
          />
        )}
      </InputSubmitCombo>
    </div>
  );
};
