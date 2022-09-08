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

import cx from 'classnames';
import {forwardRef, ForwardRefRenderFunction, ForwardedRef} from 'react';

import DragableClickWrapper from 'Components/DragableClickWrapper';
import Icon from 'Components/Icon';

import {t} from 'Util/LocalizerUtil';
import {noop} from 'Util/util';

export interface PanelHeaderProps {
  onClose: () => void;
  onGoBack?: () => void;
  className?: string;
  showBackArrow?: boolean;
  showActionMute?: boolean;
  showNotificationsNothing?: boolean;
  isReverse?: boolean;
  closeUie?: string;
  closeBtnTitle?: string;
  goBackTitle?: string;
  goBackUie?: string;
  title?: string;
  tabIndex?: number;
  handleBlur?: () => void;
  onToggleMute?: () => void;
}

const PanelHeader: ForwardRefRenderFunction<HTMLButtonElement, PanelHeaderProps> = (
  {
    onClose,
    isReverse,
    className = '',
    showBackArrow = true,
    showActionMute = false,
    showNotificationsNothing = false,
    goBackUie,
    goBackTitle = t('accessibility.rightPanel.GoBack'),
    title = '',
    closeUie = 'do-close',
    closeBtnTitle = t('accessibility.rightPanel.close'),
    tabIndex = 0,
    handleBlur = noop,
    onGoBack = noop,
    onToggleMute = noop,
  }: PanelHeaderProps,
  ref: ForwardedRef<HTMLButtonElement>,
) => {
  return (
    <div className={cx('panel__header', {'panel__header--reverse': isReverse}, className)}>
      {showBackArrow && (
        <DragableClickWrapper onClick={onGoBack}>
          <button
            ref={ref}
            className="icon-button"
            data-uie-name={goBackUie}
            title={goBackTitle}
            tabIndex={tabIndex}
            onBlur={handleBlur}
          >
            <Icon.ArrowLeft />
          </button>
        </DragableClickWrapper>
      )}

      {title && (
        <h3 className="panel__header__title" tabIndex={0}>
          {title}
        </h3>
      )}

      <DragableClickWrapper onClick={onClose}>
        <button
          className="icon-button"
          data-uie-name={closeUie}
          title={closeBtnTitle}
          tabIndex={tabIndex}
          onBlur={handleBlur}
        >
          <Icon.Close className="right-panel-close" />
        </button>
      </DragableClickWrapper>

      {showActionMute && (
        <DragableClickWrapper onClick={onToggleMute}>
          <button
            className={cx('right-panel-close icon-button', {
              'right-panel-mute--active': showNotificationsNothing,
            })}
            type="button"
            onClick={onToggleMute}
            data-uie-name="do-mute"
          >
            <Icon.Mute />
          </button>
        </DragableClickWrapper>
      )}
    </div>
  );
};

export default forwardRef(PanelHeader);
