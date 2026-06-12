/*
 * Wire
 * Copyright (C) 2020 Wire Swiss GmbH
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

import type {ComponentProps} from 'react';

import {matchers} from '@emotion/jest';
import {render} from '@testing-library/react';

import {Switch} from './Switch';

import {THEME_ID, Theme, themes} from '../../Identity';
import {StyledApp} from '../../Layout';

expect.extend(matchers);

type SwitchTestProps = ComponentProps<typeof Switch>;

const renderSwitch = (props: SwitchTestProps, themeId = THEME_ID.LIGHT) =>
  render(
    <StyledApp themeId={themeId}>
      <Switch {...props} />
    </StyledApp>,
  );

const renderSwitchWithTheme = (props: SwitchTestProps, theme: Theme) =>
  render(
    <StyledApp theme={theme}>
      <Switch {...props} />
    </StyledApp>,
  );

const getTrack = (container: HTMLElement) => {
  const track = container.querySelector('label span');
  if (!track) {
    throw new Error('Switch track not found.');
  }
  return track as HTMLElement;
};

describe('"Switch"', () => {
  it('resolves light theme props', () => {
    const {container} = renderSwitch(
      {
        id: '1',
        checked: true,
        onToggle: () => {},
        activatedColor: '#0a5fb3',
        deactivatedColor: '#c2c2c2',
      },
      THEME_ID.LIGHT,
    );

    const track = getTrack(container);
    expect(track).toHaveStyleRule('background-color', '#0a5fb3', {target: ':before'});
  });

  it('resolves dark theme props', () => {
    const {container} = renderSwitch(
      {
        id: '2',
        checked: false,
        onToggle: () => {},
        deactivatedColorDark: '#111111',
      },
      THEME_ID.DARK,
    );

    const track = getTrack(container);
    expect(track).toHaveStyleRule('background-color', '#111111', {target: ':before'});
  });

  it('resolves dark theme disabled props', () => {
    const {container} = renderSwitch(
      {
        id: '3',
        checked: false,
        onToggle: () => {},
        disabled: true,
        disabledColorDark: '#222222',
      },
      THEME_ID.DARK,
    );

    const track = getTrack(container);
    expect(track).toHaveStyleRule('background-color', '#222222', {target: ':before'});
  });

  it('falls back to base props in dark theme', () => {
    const {container} = renderSwitch(
      {
        id: '4',
        checked: true,
        onToggle: () => {},
        activatedColor: '#123456',
      },
      THEME_ID.DARK,
    );

    const track = getTrack(container);
    expect(track).toHaveStyleRule('background-color', '#123456', {target: ':before'});
  });

  it('falls back to theme Switch colors when props are missing', () => {
    const theme: Theme = {
      ...themes[THEME_ID.LIGHT],
      Switch: {
        activatedColor: '#098765',
        deactivatedColor: '#456789',
        disabledColor: '#888888',
      },
    };

    const {container} = renderSwitchWithTheme(
      {
        id: '5',
        checked: false,
        onToggle: () => {},
        disabled: true,
      },
      theme,
    );

    const track = getTrack(container);
    expect(track).toHaveStyleRule('background-color', '#888888', {target: ':before'});
  });

  it('falls back to theme defaults when no props are provided', () => {
    const {container} = renderSwitch(
      {
        id: '6',
        checked: true,
        onToggle: () => {},
      },
      THEME_ID.LIGHT,
    );

    const track = getTrack(container);
    expect(track).toHaveStyleRule('background-color', themes[THEME_ID.LIGHT].Switch.activatedColor, {
      target: ':before',
    });
  });
});
