/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import AssetLoader from './AssetLoader';
import {render, fireEvent} from '@testing-library/react';

describe('AssetLoader', () => {
  it('runs onClick when clicking it', async () => {
    const props = {large: false, loadProgress: 10, onCancel: jest.fn()};

    const {container} = render(<AssetLoader {...props} />);

    const assetLoader = container.querySelector('div[data-uie-name="status-loading-media"]');
    expect(assetLoader).not.toBeNull();

    fireEvent.click(assetLoader!);
    expect(props.onCancel).toHaveBeenCalledTimes(1);
  });

  it('sets the correct viewBox size', async () => {
    const props = {large: false, loadProgress: 10, onCancel: () => {}};

    const {container, rerender} = render(<AssetLoader {...props} />);

    const assetLoaderSvg = container.querySelector('svg[data-uie-name="asset-loader-svg"]');
    expect(assetLoaderSvg).not.toBeNull();

    const viewBoxSmall = assetLoaderSvg!.getAttribute('viewBox');
    expect(viewBoxSmall).toBe(`0 0 32 32`);

    props.large = true;
    rerender(<AssetLoader {...props} />);

    const viewBoxLarge = assetLoaderSvg!.getAttribute('viewBox');
    expect(viewBoxLarge).toBe(`0 0 64 64`);
  });

  it('sets the correct circle style', async () => {
    const props = {large: false, loadProgress: 10, onCancel: () => {}};

    const {container, rerender} = render(<AssetLoader {...props} />);

    const circleElement = container.querySelector('circle[data-uie-name="asset-loader-circle"]');
    expect(circleElement).not.toBeNull();

    const strokeDasharraySmallTen = window.getComputedStyle(circleElement!).getPropertyValue('stroke-dasharray');
    expect(strokeDasharraySmallTen).toBe('10 100');

    props.loadProgress = 50;
    rerender(<AssetLoader {...props} />);

    const strokeDasharraySmallFifty = window.getComputedStyle(circleElement!).getPropertyValue('stroke-dasharray');
    expect(strokeDasharraySmallFifty).toBe('50 100');

    props.large = true;
    props.loadProgress = 10;
    rerender(<AssetLoader {...props} />);

    const strokeDasharrayLargeTen = window.getComputedStyle(circleElement!).getPropertyValue('stroke-dasharray');
    expect(strokeDasharrayLargeTen).toBe('20 200');

    props.loadProgress = 50;
    rerender(<AssetLoader {...props} />);

    const strokeDasharrayLargeFifty = window.getComputedStyle(circleElement!).getPropertyValue('stroke-dasharray');
    expect(strokeDasharrayLargeFifty).toBe('100 200');
  });
});
