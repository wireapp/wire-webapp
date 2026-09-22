/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import type {ReactNode} from 'react';

import {render, screen} from '@testing-library/react';

import {StyledApp, THEME_ID} from '@wireapp/react-ui-kit';

import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import type {Translate} from 'Util/localizerUtil';

import {CellsSearch} from './cellsSeach';

const translate: Translate = translationKey => {
  if (translationKey === 'cells.search.allFilesPlaceholder') {
    return 'Search files';
  }

  return translationKey;
};

const rootProviderWrapper = createRootProviderWrapperForTest(createRootContextValueForTest({translate}));

const wrapper = ({children}: {children: ReactNode}) => (
  <StyledApp themeId={THEME_ID.DEFAULT}>{rootProviderWrapper({children})}</StyledApp>
);

describe('CellsSearch', () => {
  it('displays the files-only search placeholder in the all-files Drive view', () => {
    render(<CellsSearch searchValue="" onSearch={jest.fn()} onClearSearch={jest.fn()} />, {wrapper});

    expect(screen.getByRole('textbox', {name: 'Search files'})).toHaveAttribute('placeholder', 'Search files');
  });
});
