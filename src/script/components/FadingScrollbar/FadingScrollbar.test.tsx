/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {fireEvent, render} from '@testing-library/react';
import underscore from 'underscore';

import {FadingScrollbar, parseColor} from './FadingScrollbar';

describe('FadingScrollbar', () => {
  let step: () => void = () => {};
  beforeEach(() => {
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: any) => (step = cb));
  });

  const getAlpha = (element: HTMLElement) => {
    const [, , , a] = parseColor(element.style.getPropertyValue('--scrollbar-color'));
    return a;
  };

  it('fade scrollbar in when mouse enters and fades out after debounce', () => {
    let runDebounce = () => {};
    jest.spyOn(underscore, 'debounce').mockImplementation((cb: any): any => {
      const callback = (args: any) => {
        runDebounce = () => cb(args);
      };
      return callback;
    });

    const {getByTestId} = render(
      <FadingScrollbar data-uie-name="fading-scrollbar" style={{'--scrollbar-color': 'rgba(0,0,0,0)'} as any}>
        <div>hello</div>
      </FadingScrollbar>,
    );
    const scrollingElement = getByTestId('fading-scrollbar');
    fireEvent.mouseEnter(scrollingElement);
    expect(getAlpha(scrollingElement)).toEqual(0.05);

    for (let i = 0; i < 20; i++) {
      step();
    }
    expect(getAlpha(scrollingElement)).toBeGreaterThanOrEqual(1);

    runDebounce();
    for (let i = 0; i < 20; i++) {
      step();
    }
    expect(getAlpha(scrollingElement)).toBeLessThanOrEqual(0);
  });

  it('fades scrollbar out when mouse leaves', () => {
    const {getByTestId} = render(
      <FadingScrollbar data-uie-name="fading-scrollbar" style={{'--scrollbar-color': 'rgba(0,0,0,1)'} as any}>
        <div>hello</div>
      </FadingScrollbar>,
    );

    const scrollingElement = getByTestId('fading-scrollbar');
    fireEvent.mouseLeave(scrollingElement);

    expect(getAlpha(scrollingElement)).toEqual(0.95);

    for (let i = 0; i < 20; i++) {
      step();
    }
    expect(getAlpha(scrollingElement)).toBeLessThanOrEqual(0);
  });
});
