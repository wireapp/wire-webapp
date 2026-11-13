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

import {type ReactElement, useCallback, useId, useRef, useState} from 'react';

import {encryptedBadgeButtonStyles, encryptedBadgeRootStyles} from './encryptedBadge.styles';

import {useCloseOnEscapeOrOutsidePress} from '../../../hooks/useCloseOnEscapeOrOutsidePress';
import {useApplicationContext} from '../../../page/rootProvider';
import {InfoIcon} from '../../../uiKit/dataDisplay/icon/infoIcon';
import {LockClosedIcon} from '../../../uiKit/dataDisplay/icon/lockClosedIcon';
import {callSecurityIconStyles, callSecurityLabelStyles} from '../callSecurityLine/callSecurityLine.styles';
import {EncryptionExplainer} from '../encryptionExplainer/encryptionExplainer';

interface EncryptedBadgeProps {
  readonly explainerTitle: string;
  readonly brandName: string;
  readonly supportUrl?: string;
}

/**
 * "End-to-end encrypted" chip that opens the encryption explainer. Same look and explainer as the
 * resting call security line, for places where no call runs yet, such as the meeting green room.
 */
export const EncryptedBadge = ({explainerTitle, brandName, supportUrl}: EncryptedBadgeProps): ReactElement => {
  const {translate} = useApplicationContext();
  const [isExplainerOpen, setIsExplainerOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const explainerId = useId();

  const closeExplainer = useCallback((): void => {
    setIsExplainerOpen(false);
    triggerRef.current?.focus();
  }, []);
  const dismissExplainer = useCallback((): void => {
    setIsExplainerOpen(false);
  }, []);

  // The badge sits in the green room modal: with focus in the badge, Escape closes the explainer only.
  useCloseOnEscapeOrOutsidePress(rootRef, isExplainerOpen, closeExplainer, dismissExplainer, {
    captureEscapeWhenFocused: true,
    closeOnFocusOut: true,
  });

  return (
    // tabIndex -1: a click on the explainer text keeps focus in the badge, so Escape still closes only the explainer.
    <div ref={rootRef} tabIndex={-1} css={encryptedBadgeRootStyles}>
      <button
        ref={triggerRef}
        type="button"
        css={encryptedBadgeButtonStyles}
        aria-label={translate('callSecurityShowDetails')}
        aria-expanded={isExplainerOpen}
        aria-controls={explainerId}
        onClick={() => {
          // Safari and Firefox on macOS do not focus a button on click. Escape is scoped to focus in the badge.
          triggerRef.current?.focus();
          setIsExplainerOpen(isOpen => {
            return !isOpen;
          });
        }}
        data-uie-name="encrypted-badge"
      >
        <LockClosedIcon color="var(--success-color)" css={callSecurityIconStyles} aria-hidden="true" />
        <span css={callSecurityLabelStyles}>{translate('callSecurityEncrypted')}</span>
        <InfoIcon color="var(--foreground-fade-56)" css={callSecurityIconStyles} aria-hidden="true" />
      </button>

      {isExplainerOpen && (
        <EncryptionExplainer
          id={explainerId}
          title={explainerTitle}
          body={translate('callSecurityExplainerBody', {brandName})}
          closeLabel={translate('callSecurityExplainerClose')}
          linkLabel={translate('callSecurityExplainerLink', {brandName})}
          supportUrl={supportUrl}
          placement="panel"
          onClose={closeExplainer}
        />
      )}
    </div>
  );
};
