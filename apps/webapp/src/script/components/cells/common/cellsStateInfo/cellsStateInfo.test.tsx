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

import {ReactNode} from 'react';

import {render, screen} from '@testing-library/react';

import {StyledApp, THEME_ID} from '@wireapp/react-ui-kit';

import {CellsStateInfo} from './cellsStateInfo';

const withTheme = (component: ReactNode) => <StyledApp themeId={THEME_ID.DEFAULT}>{component}</StyledApp>;

describe('CellsStateInfo', () => {
  it('renders description-only default state', () => {
    render(withTheme(<CellsStateInfo description="Deleted files appear here." />));

    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    expect(screen.getByText('Deleted files appear here.')).toBeInTheDocument();
  });

  it('announces search no-results state with heading and description', () => {
    render(
      withTheme(
        <CellsStateInfo variant="search" heading="No results found" description="Try to adjust your search." />,
      ),
    );

    const status = screen.getByRole('status');

    expect(status).toHaveTextContent('No results found');
    expect(status).toHaveTextContent('Try to adjust your search.');
  });
});
