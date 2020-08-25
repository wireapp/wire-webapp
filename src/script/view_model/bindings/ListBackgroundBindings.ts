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

import {container} from 'tsyringe';
import ko from 'knockout';

import {alias} from 'Util/util';
import {AssetRepository} from '../../assets/AssetRepository';
import type {AssetRemoteData} from '../../assets/AssetRemoteData';

ko.bindingHandlers.switchBackground = (() => ({
  update(element: HTMLElement, valueAccessor: ko.PureComputed<AssetRemoteData | void>) {
    const imageResource = ko.unwrap(valueAccessor());

    if (imageResource) {
      const assetRepository = container.resolve(AssetRepository);
      const backgroundImages = $(element).find('.background');
      const backgroundLast = backgroundImages.last();
      const backgroundNext = backgroundLast.clone();
      backgroundNext.css({opacity: '0'});
      backgroundNext.insertAfter(backgroundLast);

      assetRepository
        .load(imageResource)
        .then(blob => {
          if (blob) {
            backgroundNext
              .find('.background-image')
              .css({'background-image': `url(${window.URL.createObjectURL(blob)})`});
          }
        })
        .then(() => backgroundNext.css({opacity: '1'}).one(alias.animationend, backgroundLast.remove as any));
    }
  },
}))();
