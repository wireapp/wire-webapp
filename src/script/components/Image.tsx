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

import {registerReactComponent, useKoSubscribableChildren} from 'Util/ComponentUtil';
import {AssetRemoteData} from '../assets/AssetRemoteData';
import {AssetRepository} from '../assets/AssetRepository';
import {useViewPortObserver} from '../ui/viewportObserver';
import {TeamState} from '../team/TeamState';
import RestrictedImage from './asset/RestrictedImage';
import useEffectRef from 'Util/useEffectRef';

export interface ImageProps extends React.HTMLProps<HTMLDivElement> {
  aspectRatio?: number;
  asset: AssetRemoteData;
  assetRepository?: AssetRepository;
  click?: (asset: AssetRemoteData, event: React.MouseEvent) => void;
  isQuote?: boolean;
  teamState?: TeamState;
}

const Image: React.FC<ImageProps> = ({
  asset,
  click,
  className,
  isQuote = false,
  assetRepository = container.resolve(AssetRepository),
  teamState = container.resolve(TeamState),
  aspectRatio,
  ...props
}) => {
  const [viewportElementRef, setViewportElementRef] = useEffectRef<HTMLDivElement>();
  const isInViewport = useViewPortObserver(viewportElementRef);

  const [assetIsLoading, setAssetIsLoading] = useState<boolean>(false);
  const [assetSrc, setAssetSrc] = useState<string>();

  const {isFileSharingReceivingEnabled} = useKoSubscribableChildren(teamState, ['isFileSharingReceivingEnabled']);

  const onClick = (event: React.MouseEvent) => {
    if (!assetIsLoading && typeof click === 'function') {
      click(asset, event);
    }
  };

  useEffect(() => {
    if (isInViewport && isFileSharingReceivingEnabled) {
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

  const style = aspectRatio ? {aspectRatio: aspectRatio.toString(), width: '100%'} : undefined;
  return !isFileSharingReceivingEnabled ? (
    <RestrictedImage className={className} showMessage={!isQuote} isSmall={isQuote} />
  ) : (
    <div ref={setViewportElementRef} className={cx('image-wrapper', className)} {...props}>
      {assetSrc ? (
        <img style={style} onClick={onClick} src={assetSrc} role="presentation" alt="" />
      ) : (
        <div style={style} className={cx({'loading-dots': assetIsLoading})}></div>
      )}
    </div>
  );
};

export default Image;

registerReactComponent<ImageProps>('image-component', {
  component: Image,
  template: '<span data-bind="react: {className, asset: ko.unwrap(asset), assetRepository, click, isQuote}"></span>',
});
