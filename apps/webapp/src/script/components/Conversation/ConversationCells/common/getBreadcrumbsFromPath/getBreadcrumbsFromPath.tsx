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

import {t} from 'Util/LocalizerUtil';

import {TrashIcon} from '@wireapp/react-ui-kit';

import {RECYCLE_BIN_PATH} from '../recycleBin/recycleBin';

export const getBreadcrumbsFromPath = ({baseCrumb, currentPath}: {baseCrumb: string; currentPath: string}) => {
  const segments = currentPath.split('/').filter(Boolean);

  return [
    {
      name: baseCrumb,
      path: '',
    },
    ...segments.map((segment, index) => ({
      name: segment === RECYCLE_BIN_PATH ? t('cells.recycleBin.breadcrumb') : segment,
      path: segments.slice(0, index + 1).join('/'),
      icon: segment === RECYCLE_BIN_PATH ? <TrashIcon width={12} height={12} /> : undefined,
    })),
  ];
};
