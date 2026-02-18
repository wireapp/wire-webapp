/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {ModalComponent} from 'Components/Modals/ModalComponent';
import {t} from 'Util/LocalizerUtil';

interface HardwareAccelerationRestartModalProps {
  isShown: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

const HardwareAccelerationRestartModal = ({isShown, onCancel, onConfirm}: HardwareAccelerationRestartModalProps) => {
  return (
    <ModalComponent isShown={isShown} onBgClick={onCancel}>
      <div style={{padding: 24, maxWidth: 420}}>
        <h3>{t('preferencesOptionsEnableHardwareAccelerationModalTitle')}</h3>

        <p>{t('preferencesOptionsEnableHardwareAccelerationModalMessage')}</p>

        <div style={{display: 'flex', justifyContent: 'flex-end', gap: 12}}>
          <button onClick={onCancel}>{t('preferencesOptionsEnableHardwareAccelerationModalCancel')}</button>

          <button onClick={onConfirm}>{t('preferencesOptionsEnableHardwareAccelerationModalOk')}</button>
        </div>
      </div>
    </ModalComponent>
  );
};

export {HardwareAccelerationRestartModal};
