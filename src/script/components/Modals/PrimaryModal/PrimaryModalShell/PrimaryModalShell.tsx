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

import {ReactNode} from 'react';

import {ModalComponent} from 'Components/ModalComponent';

interface PrimaryModalShellProps {
  title: string;
  isShown: boolean;
  children: ReactNode;
  dataUieName: string;
  onClose: () => void;
  onBgClick: () => void;
}

export const PrimaryModalShell = ({
  isShown,
  title,
  dataUieName,
  children,
  onClose,
  onBgClick,
}: PrimaryModalShellProps) => {
  return (
    <div
      id="modals"
      data-uie-name="primary-modals-container"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      tabIndex={-1}
      ref={ref => isShown && ref?.focus()}
    >
      <ModalComponent isShown={isShown} onClosed={onClose} onBgClick={onBgClick} data-uie-name={dataUieName}>
        {isShown && children}
      </ModalComponent>
    </div>
  );
};
