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
import {t} from 'Util/LocalizerUtil';
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
        <button className="icon-button" data-uie-name={goBackUie} title={t('index.goBack')}>
          <Icon.ArrowLeft />
        </button>
      </DragableClickWrapper>

      <div className="panel__header__title">{title}</div>

      <DragableClickWrapper onClick={onClose}>
        <button className="icon-button" data-uie-name={closeUie} title={t('accessibility.rightPanel.close')}>
          <Icon.Close className="right-panel-close" />
        </button>
      </DragableClickWrapper>
    </div>
  );
};

export default PanelHeader;
