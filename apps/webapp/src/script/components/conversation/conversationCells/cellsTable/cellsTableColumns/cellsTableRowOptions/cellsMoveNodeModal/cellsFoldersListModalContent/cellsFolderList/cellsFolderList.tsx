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

import type {FunctionComponent} from 'react';

import {FolderIcon} from '@wireapp/react-ui-kit';

import {ChevronRight} from 'Components/icon';
import {useApplicationContext} from 'src/script/page/rootProvider';

import {
  arrowIconStyles,
  buttonStyles,
  listItemStyles,
  listStyles,
  nameStyles,
  nameWrapperStyles,
  navigateButtonStyles,
} from './cellsFolderList.styles';

interface CellsFolderListProps {
  items: {id: string; name: string; path: string}[];
  onNavigate: (path: string) => void;
  onSelectDestination?: (path: string) => void;
  selectedDestinationPath?: string;
  disabledDestinationPaths?: readonly string[];
  disabledDestinationLabels?: Readonly<Record<string, string>>;
}

export const CellsFolderList: FunctionComponent<CellsFolderListProps> = ({
  items,
  onNavigate,
  onSelectDestination,
  selectedDestinationPath,
  disabledDestinationPaths = [],
  disabledDestinationLabels = {},
}: CellsFolderListProps) => {
  const {translate} = useApplicationContext();

  return (
    <ul css={listStyles}>
      {items.map(item => {
        return (
          <li key={item.id} css={listItemStyles}>
            <button
              type="button"
              css={buttonStyles}
              disabled={disabledDestinationPaths.includes(item.path)}
              aria-pressed={onSelectDestination !== undefined ? selectedDestinationPath === item.path : undefined}
              onClick={() => {
                if (onSelectDestination !== undefined) {
                  return onSelectDestination(item.path);
                }

                return onNavigate(item.path);
              }}
            >
              <div css={nameWrapperStyles}>
                <FolderIcon width={24} height={24} />
                <span css={nameStyles}>{item.name}</span>
              </div>
              {disabledDestinationLabels[item.path] !== undefined && (
                <span>{disabledDestinationLabels[item.path]}</span>
              )}
              {onSelectDestination === undefined && <ChevronRight width={16} height={16} css={arrowIconStyles} />}
            </button>
            {onSelectDestination !== undefined && (
              <button
                type="button"
                css={navigateButtonStyles}
                aria-label={translate('cells.moveNodeModal.openFolder', {folderName: item.name})}
                disabled={disabledDestinationPaths.includes(item.path)}
                onClick={() => {
                  return onNavigate(item.path);
                }}
              >
                <ChevronRight width={16} height={16} css={arrowIconStyles} />
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
};
