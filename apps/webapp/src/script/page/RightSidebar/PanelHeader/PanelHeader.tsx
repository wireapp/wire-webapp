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

import {FC, useEffect, useRef} from 'react';

import cx from 'classnames';
import {DraggableClickWrapper} from 'Components/DraggableClickWrapper';
import * as Icon from 'Components/Icon';
import {t} from 'Util/LocalizerUtil';
import {noop} from 'Util/util';

import {TabIndex} from '@wireapp/react-ui-kit';

interface PanelHeaderProps {
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
  titleDataUieName?: string;
  title?: string;
  handleBlur?: () => void;
  onToggleMute?: () => void;
  shouldFocusFirstButton?: boolean;
}

const PanelHeader: FC<PanelHeaderProps> = ({
  onClose,
  isReverse,
  className = '',
  showBackArrow = true,
  showActionMute = false,
  showNotificationsNothing = false,
  goBackUie = 'back-button',
  goBackTitle = t('accessibility.rightPanel.GoBack'),
  title = '',
  titleDataUieName = '',
  closeUie = 'do-close',
  closeBtnTitle = t('accessibility.rightPanel.close'),
  handleBlur = noop,
  onGoBack = noop,
  onToggleMute = noop,
  shouldFocusFirstButton = true,
}: PanelHeaderProps) => {
  const panelHeaderRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!!panelHeaderRef.current && shouldFocusFirstButton) {
      const nextElementToFocus = panelHeaderRef.current.querySelector('button');
      // TO-DO Remove setTimeout after replacing transition group animation libray
      // triggering focus method without setTimeout is not working due to right side bar animation
      setTimeout(() => {
        nextElementToFocus?.focus();
      }, 0);
    }
  }, [shouldFocusFirstButton]);

  return (
    <header className={cx('panel__header', {'panel__header--reverse': isReverse}, className)} ref={panelHeaderRef}>
      {showBackArrow && (
        <DraggableClickWrapper onClick={() => onGoBack()}>
          <button className="icon-button" data-uie-name={goBackUie} title={goBackTitle} onBlur={handleBlur}>
            <Icon.ArrowLeftIcon />
          </button>
        </DraggableClickWrapper>
      )}

      {title && (
        <h2 className="panel__header__title" tabIndex={TabIndex.FOCUSABLE} data-uie-name={titleDataUieName}>
          {title}
        </h2>
      )}

      <DraggableClickWrapper onClick={onClose}>
        <button className="icon-button" data-uie-name={closeUie} title={closeBtnTitle} onBlur={handleBlur}>
          <Icon.CloseIcon className="right-panel-close" />
        </button>
      </DraggableClickWrapper>

      {showActionMute && (
        <DraggableClickWrapper onClick={onToggleMute}>
          <button
            className={cx('right-panel-close icon-button', {
              'right-panel-mute--active': showNotificationsNothing,
            })}
            type="button"
            onClick={onToggleMute}
            data-uie-name="do-mute"
          >
            <Icon.MuteIcon />
          </button>
        </DraggableClickWrapper>
      )}
    </header>
  );
};

export {PanelHeader};
