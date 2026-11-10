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

import type {JSX} from 'react';

import {useTheme} from '@emotion/react';
import {render, screen} from '@testing-library/react';

import {THEME_ID, themes, type Theme} from '../../uiKit/identity/theme/theme';
import {StyledApp} from '../../uiKit/layout/styledApp/styledApp';

function ThemeProbe(): JSX.Element {
  const theme: Theme = useTheme();

  return (
    <div
      data-uie-name="theme-probe"
      css={emotionTheme => {
        return {color: emotionTheme.general.color};
      }}
    >
      {theme.themeId}
    </div>
  );
}

describe('UI kit source theme integration', () => {
  it.each([THEME_ID.LIGHT, THEME_ID.DARK])('provides and renders the %s Emotion theme', themeId => {
    render(
      <StyledApp themeId={themeId}>
        <ThemeProbe />
      </StyledApp>,
    );

    const themeProbe = screen.getByTestId('theme-probe');

    expect(themeProbe).toHaveTextContent(themeId);
    expect(themeProbe).toHaveStyle({color: themes[themeId].general.color});
    expect(themeProbe.parentElement).toHaveStyle({background: themes[themeId].general.backgroundColor});
    expect(themeProbe).not.toHaveAttribute('css');
  });
});
