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

import TestPage from 'Util/test/TestPage';

import AssetLoader, {AssetLoaderProps} from './AssetLoader';

class AssetLoaderPage extends TestPage<AssetLoaderProps> {
  constructor(props?: AssetLoaderProps) {
    super(AssetLoader, props);
  }

  getStatus = () => this.get('div[data-uie-name="status-loading-media"]');
  clickStatus = () => this.click(this.getStatus());
  getViewBox = () =>
    this.get('svg[data-uie-name="asset-loader-svg"]').getDOMNode<SVGSVGElement>().getAttribute('viewBox');
  getCircle = () => this.get('circle[data-uie-name="asset-loader-circle"]').getDOMNode<SVGCircleElement>();
}

describe('AssetLoader', () => {
  it('runs onClick when clicking it', async () => {
    const onClickMock = jest.fn();

    const assetLoader = new AssetLoaderPage({large: false, loadProgress: 10, onCancel: onClickMock});
    assetLoader.clickStatus();

    expect(onClickMock.mock.calls.length).toBe(1);
  });

  it('sets the correct viewBox size', async () => {
    const assetLoaderSmall = new AssetLoaderPage({large: false, loadProgress: 10, onCancel: () => {}});
    const viewBoxSmall = assetLoaderSmall.getViewBox();
    expect(viewBoxSmall).toBe(`0 0 32 32`);

    const assetLoaderLarge = new AssetLoaderPage({large: true, loadProgress: 10, onCancel: () => {}});
    const viewBoxLarge = assetLoaderLarge.getViewBox();
    expect(viewBoxLarge).toBe(`0 0 64 64`);
  });

  it('sets the correct viewBox size', async () => {
    const assetLoaderSmall = new AssetLoaderPage({large: false, loadProgress: 10, onCancel: () => {}});
    const viewBoxSmall = assetLoaderSmall.getViewBox();
    expect(viewBoxSmall).toBe(`0 0 32 32`);

    const assetLoaderLarge = new AssetLoaderPage({large: true, loadProgress: 10, onCancel: () => {}});
    const viewBoxLarge = assetLoaderLarge.getViewBox();
    expect(viewBoxLarge).toBe(`0 0 64 64`);
  });

  it('sets the correct circle style', async () => {
    const assetLoaderSmallTen = new AssetLoaderPage({large: false, loadProgress: 10, onCancel: () => {}});
    const strokeDasharraySmallTen = assetLoaderSmallTen.getCircle().style.strokeDasharray;
    expect(strokeDasharraySmallTen).toBe('10 100');

    const assetLoaderSmallFifty = new AssetLoaderPage({large: false, loadProgress: 50, onCancel: () => {}});
    const strokeDasharraySmallFifty = assetLoaderSmallFifty.getCircle().style.strokeDasharray;
    expect(strokeDasharraySmallFifty).toBe('50 100');

    const assetLoaderLargeTen = new AssetLoaderPage({large: true, loadProgress: 10, onCancel: () => {}});
    const strokeDasharrayLargeTen = assetLoaderLargeTen.getCircle().style.strokeDasharray;
    expect(strokeDasharrayLargeTen).toBe('20 200');

    const assetLoaderLargeFifty = new AssetLoaderPage({large: true, loadProgress: 50, onCancel: () => {}});
    const strokeDasharrayLargeFifty = assetLoaderLargeFifty.getCircle().style.strokeDasharray;
    expect(strokeDasharrayLargeFifty).toBe('100 200');
  });
});
