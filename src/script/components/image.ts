/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import ko from 'knockout';

import {viewportObserver} from '../ui/viewportObserver';
import {AssetRemoteData} from '../assets/AssetRemoteData';
import {AssetRepository} from '../assets/AssetRepository';
import {container} from 'tsyringe';

interface ImageParams {
  asset: AssetRemoteData;
  assetRepository: AssetRepository;
  click?: (asset: AssetRemoteData) => void;
}

class Image {
  asset: AssetRemoteData;
  assetSrc: ko.Observable<any>;
  assetIsLoading: ko.Observable<boolean>;
  element: HTMLElement;
  params: ImageParams;

  constructor(
    {assetRepository = container.resolve(AssetRepository), ...params}: ImageParams,
    componentInfo: {element: HTMLElement},
  ) {
    this.asset = ko.unwrap(params.asset);
    this.assetSrc = ko.observable();
    this.assetIsLoading = ko.observable(false);
    this.element = componentInfo.element;
    this.params = {...params, assetRepository};

    const _onInViewport = () => {
      this.assetIsLoading(true);
      assetRepository.load(this.asset).then(blob => {
        if (blob) {
          this.assetSrc(window.URL.createObjectURL(blob));
        }
        this.assetIsLoading(false);
      });
    };

    viewportObserver.onElementInViewport(this.element, _onInViewport);
  }

  onClick = () => {
    if (!this.assetIsLoading() && typeof this.params.click === 'function') {
      this.params.click(this.asset);
    }
  };

  dispose() {
    viewportObserver.removeElement(this.element);
    if (this.assetSrc()) {
      window.URL.revokeObjectURL(this.assetSrc());
    }
  }
}

ko.components.register('image-component', {
  template: `
    <!-- ko if: assetSrc() -->
      <img data-bind="attr:{src: assetSrc}, click: onClick"/>
    <!-- /ko -->
    <!-- ko ifnot: assetSrc() -->
      <div data-bind="css: {'loading-dots': assetIsLoading()}">
      </div>
    <!-- /ko -->
  `,
  viewModel: {
    createViewModel(params: ImageParams, componentInfo: {element: HTMLElement}) {
      return new Image(params, componentInfo);
    },
  },
});
