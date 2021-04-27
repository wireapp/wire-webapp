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

import React, {useEffect, useState} from 'react';
import cx from 'classnames';
import {container} from 'tsyringe';

import {registerReactComponent} from 'Util/ComponentUtil';
import {AssetRemoteData} from '../assets/AssetRemoteData';
import {AssetRepository} from '../assets/AssetRepository';
import {useViewPortObserver} from '../ui/viewportObserver';

export interface ImageProps extends React.HTMLProps<HTMLDivElement> {
  asset: AssetRemoteData;
  assetRepository?: AssetRepository;
  click?: (asset: AssetRemoteData) => void;
}

const Image: React.FC<ImageProps> = ({
  asset,
  click,
  className,
  assetRepository = container.resolve(AssetRepository),
  ...props
}) => {
  const [isInViewport, viewportElementRef] = useViewPortObserver();
  const [assetIsLoading, setAssetIsLoading] = useState<boolean>(false);
  const [assetSrc, setAssetSrc] = useState<string>();

  const onClick = () => {
    if (!assetIsLoading && typeof click === 'function') {
      click(asset);
    }
  };

  useEffect(() => {
    if (isInViewport === true) {
      setAssetIsLoading(true);
      assetRepository.load(asset).then(blob => {
        if (blob) {
          setAssetSrc(window.URL.createObjectURL(blob));
        }
        setAssetIsLoading(false);
      });
    }
    return () => {
      if (assetSrc) {
        window.URL.revokeObjectURL(assetSrc);
      }
    };
  }, [isInViewport]);

  return (
    <div ref={viewportElementRef} className={cx('image-wrapper', className)} {...props}>
      {assetSrc ? (
        <img onClick={onClick} src={assetSrc} />
      ) : (
        <div className={cx({'loading-dots': assetIsLoading})}></div>
      )}
    </div>
  );
};

export default Image;

registerReactComponent<ImageProps>('image-component', {
  component: Image,
  optionalParams: ['click', 'className', 'assetRepository'],
  template: '<span data-bind="react: {className, asset: ko.unwrap(asset), assetRepository, click}"></span>',
});
