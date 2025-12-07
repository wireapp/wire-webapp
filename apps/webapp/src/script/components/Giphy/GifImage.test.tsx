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

import {render, fireEvent} from '@testing-library/react';

import {GifImage} from 'Components/Giphy/GifImage';

const staticImage = 'https://mock.image/500/300';
const hoveredImage = 'https://mock.image/500/400';

describe('GifImage', () => {
  it('single image rendered', async () => {
    const title = 'Static image';
    const {getByAltText} = render(<GifImage src={staticImage} title={title} />);
    const image = getByAltText(title) as HTMLImageElement;

    expect(image.src).toEqual(staticImage);
  });

  it('user hover on image', async () => {
    const title = 'Image';
    const {getByAltText} = render(<GifImage src={staticImage} animatedSrc={hoveredImage} title={title} />);
    const image = getByAltText(title) as HTMLImageElement;

    expect(image.src).toEqual(staticImage);
    fireEvent.mouseOver(image);
    expect(image.src).toEqual(hoveredImage);
    fireEvent.mouseOut(image);
    expect(image.src).toEqual(staticImage);
  });
});
