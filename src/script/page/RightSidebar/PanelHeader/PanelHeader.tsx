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
  onToggleMute?: () => void;
  className?: string;
  showActionMute?: boolean;
  showNotificationsNothing?: boolean;
}

const PanelHeader: FC<PanelHeaderProps> = ({
  onClose,
  className = '',
  showActionMute = false,
  showNotificationsNothing = false,
  onToggleMute = noop,
}) => {
  return (
    <div className={cx('panel__header panel__header--reverse', className)}>
      {/* TODO: ADD clickOrDrag functionality */}
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

      {/* TODO: ADD clickOrDrag functionality */}
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
