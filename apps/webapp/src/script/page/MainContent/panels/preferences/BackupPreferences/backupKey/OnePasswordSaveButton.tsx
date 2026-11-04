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

import {ElementType, useEffect, useRef, useState} from 'react';

import type {SaveRequestField} from '@1password/save-button';

import {Runtime} from '@wireapp/commons';

import {t} from 'Util/LocalizerUtil';
import {getLogger} from 'Util/Logger';

const logger = getLogger('OnePasswordSaveButton');

// `AutofillType` is a const enum in the package typings, so use the plain string values
const USERNAME_FIELD = 'username' as SaveRequestField['autocomplete'];
const NEW_PASSWORD_FIELD = 'new-password' as SaveRequestField['autocomplete'];

// Custom element registered by the package. Its own JSX typings don't allow `ref` and data attributes.
const OnePasswordButtonElement = 'onepassword-save-button' as unknown as ElementType;

// The package centers its "What's 1Password" popover over the (narrow) button, so it overflows to the left
// and gets clipped by the modal. Anchor it to the button's left edge instead.
const INFO_MODAL_STYLE_ID = 'wire-onepassword-modal-position';
const INFO_MODAL_STYLE = '#onepassword-modal { left: 0; }';

const fixInfoModalPosition = (button: HTMLElement) => {
  const shadowRoot = button.shadowRoot;
  if (!shadowRoot || shadowRoot.getElementById(INFO_MODAL_STYLE_ID)) {
    return;
  }
  const style = document.createElement('style');
  style.id = INFO_MODAL_STYLE_ID;
  style.textContent = INFO_MODAL_STYLE;
  shadowRoot.appendChild(style);
};

// The actual button inside the element's (open) shadow root, the 1Password extension enables it and handles its clicks
const SAVE_BUTTON_SELECTOR = 'button[data-onepassword-save-button]';

interface OnePasswordSaveButtonProps {
  credentialId: string;
  backupKey: string;
  /** Called when the 1Password extension enables (or disables) the button */
  onAvailabilityChange: (isAvailable: boolean) => void;
  /**
   * Called when the user clicks the save button. 1Password then shows its own save dialog,
   * it doesn't report back to the page whether the item was saved.
   */
  onSaveRequested: () => void;
}

/**
 * "Save in 1Password" button (https://www.npmjs.com/package/@1password/save-button).
 * The button is rendered disabled and only enabled by the 1Password browser extension.
 */
export const OnePasswordSaveButton = ({
  credentialId,
  backupKey,
  onAvailabilityChange,
  onSaveRequested,
}: OnePasswordSaveButtonProps) => {
  const buttonRef = useRef<HTMLElement>(null);
  const [encodedRequest, setEncodedRequest] = useState<string>();

  // The package is ESM-only, load it lazily and only in browsers (1Password extensions don't run in Electron)
  useEffect(() => {
    if (Runtime.isDesktopApp()) {
      return undefined;
    }

    let isCancelled = false;
    import('@1password/save-button')
      .then(({encodeOPSaveRequest}) => {
        if (isCancelled) {
          return;
        }
        setEncodedRequest(
          encodeOPSaveRequest({
            title: credentialId,
            fields: [
              {autocomplete: USERNAME_FIELD, value: credentialId},
              {autocomplete: NEW_PASSWORD_FIELD, value: backupKey},
            ],
            notes: t('preferencesBackupKeyOnePasswordNotes'),
          }),
        );
      })
      .catch(error => logger.warn(`Failed to load 1Password save button: ${(error as Error)?.name}`));

    return () => {
      isCancelled = true;
    };
  }, [credentialId, backupKey]);

  useEffect(() => {
    const button = buttonRef.current;
    if (!button || !encodedRequest) {
      return undefined;
    }

    void import('@1password/save-button').then(({activateOPButton}) => activateOPButton());
    void customElements.whenDefined('onepassword-save-button').then(() => fixInfoModalPosition(button));

    const saveButton = button.shadowRoot?.querySelector<HTMLButtonElement>(SAVE_BUTTON_SELECTOR);
    if (!saveButton) {
      return undefined;
    }

    // Note: the `visible` attribute of the element only controls the package's info popover
    const updateAvailability = () => onAvailabilityChange(!saveButton.disabled);
    const observer = new MutationObserver(updateAvailability);
    observer.observe(saveButton, {attributes: true, attributeFilter: ['disabled']});
    updateAvailability();

    // Clicks inside the shadow root are retargeted to the host element, so check the composed path
    const onClick = (event: MouseEvent) => {
      if (!saveButton.disabled && event.composedPath().includes(saveButton)) {
        onSaveRequested();
      }
    };
    button.addEventListener('click', onClick);

    return () => {
      observer.disconnect();
      button.removeEventListener('click', onClick);
    };
  }, [encodedRequest, onAvailabilityChange, onSaveRequested]);

  if (!encodedRequest) {
    return null;
  }

  const theme = document.body.classList.contains('theme-dark') ? 'dark' : 'light';

  return (
    <OnePasswordButtonElement
      ref={buttonRef}
      data-onepassword-type="login"
      value={encodedRequest}
      data-theme={theme}
      padding="compact"
      data-uie-name="do-save-backup-key-1password"
    />
  );
};
