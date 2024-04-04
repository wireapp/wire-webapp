/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import React, {HTMLProps, useRef, useState} from 'react';

import cx from 'classnames';

import {imageStyle} from 'Components/ZoomableImage/ZoomableImage.style';

function checkIfCanZoomImage(element: HTMLImageElement) {
  return element.naturalWidth !== element.offsetWidth || element.naturalHeight !== element.offsetHeight;
}

type ZoomableImageProps = HTMLProps<HTMLImageElement>;

export const ZoomableImage = (props: ZoomableImageProps) => {
  const imageRef = useRef<HTMLImageElement | null>(null);

  const [isZoomEnabled, setIsZoomEnabled] = useState<boolean>(false);
  const [maxOffset, setMaxOffset] = useState({x: 0, y: 0});

  const onButtonClick = (event: React.MouseEvent<HTMLImageElement>) => {
    const element = event.target as HTMLImageElement;

    if (!checkIfCanZoomImage(element)) {
      setIsZoomEnabled(false);

      if (isZoomEnabled) {
        element.style.width = `unset`;
        element.style.height = `unset`;
        element.style.transform = `translate(0%, 0%)`;
        element.style.maxWidth = ``;
        return;
      }

      return;
    }

    setIsZoomEnabled(prevState => !prevState);

    const {naturalWidth, naturalHeight, offsetWidth, offsetHeight} = element;
    const {clientX, clientY} = event;

    element.style.width = `${naturalWidth}px`;
    element.style.height = `${naturalHeight}px`;
    element.style.maxWidth = `unset`;

    const {left, top} = element.getBoundingClientRect();

    const imageCenterX = naturalWidth / 2;
    const imageCenterY = naturalHeight / 2;

    const deltaX = clientX - left;
    const deltaY = clientY - top;

    const maxXOffset = ((naturalWidth - offsetWidth) / 2 / naturalWidth) * 100;
    const maxYOffset = ((naturalHeight - offsetHeight) / 2 / naturalHeight) * 100;

    setMaxOffset({x: maxXOffset, y: maxYOffset});

    const xOffset = Math.min(Math.max(((deltaX - imageCenterX) / naturalWidth) * 100, -maxXOffset), maxXOffset);
    const yOffset = Math.min(Math.max(((deltaY - imageCenterY) / naturalWidth) * 100, -maxYOffset), maxYOffset);

    element.style.transform = `translate(${-xOffset}%, ${-yOffset}%)`;
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLImageElement>) => {
    if (isZoomEnabled) {
      const element = event.target as HTMLImageElement;

      const {naturalWidth, naturalHeight} = element;
      const {left, top} = element.getBoundingClientRect();

      const mouseX = event.clientX - left;
      const mouseY = event.clientY - top;
      const centerX = naturalWidth / 2;
      const centerY = naturalHeight / 2;

      const {x: maxXOffset, y: maxYOffset} = maxOffset;

      const xOffset = Math.min(Math.max(((mouseX - centerX) / naturalWidth) * 100, -maxXOffset), maxXOffset);
      const yOffset = Math.min(Math.max(((mouseY - centerY) / naturalHeight) * 100, -maxYOffset), maxYOffset);

      element.style.transform = `translate(${-xOffset}%, ${-yOffset}%)`;
    }
  };

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events,jsx-a11y/no-noninteractive-element-interactions,jsx-a11y/alt-text
    <img
      {...props}
      ref={imageRef}
      css={imageStyle(!!imageRef.current && checkIfCanZoomImage(imageRef.current), isZoomEnabled)}
      onClick={onButtonClick}
      onMouseMove={handleMouseMove}
      className={cx(props.className, {zoomed: isZoomEnabled})}
    />
  );
};
