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
  tabIndex?: number;
  handleBlur?: () => void;
}

const PanelHeader: React.ForwardRefRenderFunction<HTMLButtonElement, PanelHeaderProps> = (
  {onGoBack, onClose, title, goBackUie, closeUie = 'do-close', tabIndex = 0, handleBlur}: PanelHeaderProps,
  ref: React.ForwardedRef<HTMLButtonElement>,
) => {
  return (
    <div className="panel__header">
      <DragableClickWrapper onClick={onGoBack}>
        <button
          id="arrowleftiid"
          ref={ref}
          className="icon-button"
          data-uie-name={goBackUie}
          title={t('index.goBack')}
          tabIndex={tabIndex}
        >
          <Icon.ArrowLeft />
        </button>
      </DragableClickWrapper>
      {/*eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex*/}
      <div className="panel__header__title" tabIndex={0}>
        {title}
      </div>
      <DragableClickWrapper onClick={onClose}>
        <button
          className="icon-button"
          data-uie-name={closeUie}
          title={t('accessibility.rightPanel.close')}
          tabIndex={tabIndex}
          onBlur={handleBlur}
        >
          <Icon.Close className="right-panel-close" />
        </button>
      </DragableClickWrapper>
    </div>
  );
};

const PanelHeaderForwarded = React.forwardRef(PanelHeader);
export default PanelHeaderForwarded;
