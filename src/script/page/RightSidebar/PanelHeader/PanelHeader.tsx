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

import {FC} from 'react';
import cx from 'classnames';

import Icon from 'Components/Icon';

import {t} from 'Util/LocalizerUtil';
import {noop} from 'Util/util';

interface PanelHeaderProps {
  onClose: () => void;
  onBack?: () => void;
  onToggleMute?: () => void;
  title?: string;
  className?: string;
  backDataUieName?: string;
  isReversePanel?: boolean;
  showBackArrow?: boolean;
  showActionMute?: boolean;
  showNotificationsNothing?: boolean;
}

const PanelHeader: FC<PanelHeaderProps> = ({
  onBack,
  onClose,
  title = '',
  className = '',
  backDataUieName = '',
  isReversePanel = false,
  showBackArrow = false,
  showActionMute = false,
  showNotificationsNothing = false,
  onToggleMute = noop,
}) => {
  return (
    <div className={cx('panel__header', {'panel__header--reverse': isReversePanel}, className)}>
      {showBackArrow && (
        <button
          className="icon-button"
          type="button"
          onClick={onBack}
          title={t('accessibility.rightPanel.GoBack')}
          aria-label={t('accessibility.rightPanel.GoBack')}
          data-uie-name={backDataUieName}
        >
          <Icon.ArrowLeft />
        </button>
      )}

      {title && <h3 className="panel__header__title">{title}</h3>}

      <button
        className="right-panel-close icon-button"
        type="button"
        title={t('accessibility.rightPanel.close')}
        aria-label={t('accessibility.rightPanel.close')}
        onClick={onClose}
        data-uie-name="do-close"
      >
        <Icon.Close />
      </button>

      {showActionMute && (
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
      )}
    </div>
  );
};

export default PanelHeader;
