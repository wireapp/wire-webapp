/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import * as React from 'react';

import '@testing-library/jest-dom/jest-globals';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {Tooltip} from './Tooltip';

import {StyledApp, THEME_ID} from '../Layout';

describe('<Tooltip />', () => {
  it('renders correctly', () => {
    const tree = render(
      <StyledApp themeId={THEME_ID.LIGHT}>
        <Tooltip body={<div>Tooltip Content</div>}>Hover Me</Tooltip>
      </StyledApp>,
    );
    expect(tree).toMatchSnapshot();
  });

  it('hides tooltip content on mouse leave', () => {
    render(
      <StyledApp themeId={THEME_ID.LIGHT}>
        <Tooltip body="Tooltip Content">Hover Me</Tooltip>
      </StyledApp>,
    );
    const tooltipWrapper = screen.getByTestId('tooltip-wrapper');
    userEvent.hover(tooltipWrapper);
    userEvent.unhover(tooltipWrapper);
    expect(screen.getByTestId('tooltip-content')).not.toBeVisible();
  });

  it('should render tooltip on the top', () => {
    render(
      <StyledApp themeId={THEME_ID.LIGHT}>
        <Tooltip body="Tooltip Content" position="top">
          Hover Me
        </Tooltip>
      </StyledApp>,
    );
    expect(screen.getByTestId('tooltip-content')).toHaveStyle({bottom: '100%'});
  });

  it('should render tooltip on the right', () => {
    render(
      <StyledApp themeId={THEME_ID.LIGHT}>
        <Tooltip body="Tooltip Content" position="right">
          Hover Me
        </Tooltip>
      </StyledApp>,
    );
    expect(screen.getByTestId('tooltip-content')).toHaveStyle({left: '100%'});
  });

  it('should render tooltip on the bottom', () => {
    render(
      <StyledApp themeId={THEME_ID.LIGHT}>
        <Tooltip body="Tooltip Content" position="bottom">
          Hover Me
        </Tooltip>
      </StyledApp>,
    );
    expect(screen.getByTestId('tooltip-content')).toHaveStyle({top: '100%'});
  });

  it('should render tooltip on the left', () => {
    render(
      <StyledApp themeId={THEME_ID.LIGHT}>
        <Tooltip body="Tooltip Content" position="left">
          Hover Me
        </Tooltip>
      </StyledApp>,
    );
    expect(screen.getByTestId('tooltip-content')).toHaveStyle({right: '100%'});
  });
});
