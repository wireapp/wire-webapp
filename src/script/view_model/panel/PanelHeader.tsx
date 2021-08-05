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

import React from 'react';

import DragableClickWrapper from 'Components/DragableClickWrapper';
import Icon from 'Components/Icon';

export interface PanelHeaderProps {
  closeUie?: string;
  goBackUie?: string;
  onClose: () => void;
  onGoBack: () => void;
  title?: string;
}

const PanelHeader: React.FC<PanelHeaderProps> = ({onGoBack, onClose, title, goBackUie, closeUie = 'do-close'}) => {
  return (
    <div className="panel__header">
      <DragableClickWrapper onClick={onGoBack}>
        <div className="icon-button" data-uie-name={goBackUie}>
          <Icon.ArrowLeft />
        </div>
      </DragableClickWrapper>
      <div className="panel__header__title">{title}</div>
      <DragableClickWrapper onClick={onClose}>
        <div className="icon-button" data-uie-name={closeUie}>
          <Icon.Close className="right-panel-close" />
        </div>
      </DragableClickWrapper>
    </div>
  );
};

export default PanelHeader;
