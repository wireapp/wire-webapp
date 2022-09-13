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

import React from 'react';
import {createRoot, Root} from 'react-dom/client';

let modalContainer: HTMLDivElement;
let reactRoot: Root;

const cleanUp = () => {
  if (modalContainer) {
    reactRoot.unmount();
    document.getElementById('wire-main')?.removeChild(modalContainer);
    modalContainer = undefined;
  }
};

interface RenderModal {
  onClose?: () => void;
}

const renderModal =
  <T extends RenderModal>(Component: React.FC<T>) =>
  (props: T) => {
    cleanUp();
    modalContainer = document.createElement('div');
    document.getElementById('wire-main')?.appendChild(modalContainer);

    reactRoot = createRoot(modalContainer);
    const onClose = () => {
      cleanUp();
      props.onClose?.();
    };

    const element = React.createElement(Component, {...props, onClose});
    reactRoot.render(element);
  };

export default renderModal;
