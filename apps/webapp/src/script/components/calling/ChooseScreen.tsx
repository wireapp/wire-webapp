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

import {Fragment, useCallback, useEffect, useRef} from 'react';

import {container} from 'tsyringe';

import {CallingViewMode, CallState} from 'Repositories/calling/CallState';
import {ElectronDesktopCapturerSource} from 'Repositories/media/MediaDevicesHandler';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {KEY} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';
import {captureModalFocusContext} from 'Util/ModalFocusUtil';

interface ChooseScreenProps {
  choose: (screenId: string) => void;
  callState?: CallState;
}

function ChooseScreen({choose, callState = container.resolve(CallState)}: ChooseScreenProps) {
  const {selectableScreens, selectableWindows} = useKoSubscribableChildren(callState, [
    'selectableScreens',
    'selectableWindows',
  ]);

  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<(() => void) | null>(null);

  const cancel = useCallback(() => {
    requestAnimationFrame(() => {
      restoreFocusRef.current?.();
    });
    callState.selectableScreens([]);
    callState.selectableWindows([]);
  }, [callState, restoreFocusRef]);

  const handleChoose = useCallback(
    (screenId: string) => {
      requestAnimationFrame(() => {
        restoreFocusRef.current?.();
      });
      choose(screenId);
    },
    [choose, restoreFocusRef],
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return undefined;
    }

    const detachedWindow = callState.detachedWindow();
    const isDetachedWindow = callState.viewMode() === CallingViewMode.DETACHED_WINDOW;

    const focusContext = captureModalFocusContext({
      targetDocument: isDetachedWindow && detachedWindow ? detachedWindow.document : undefined,
      container: isDetachedWindow && detachedWindow ? detachedWindow.document.body : undefined,
    });

    restoreFocusRef.current = focusContext.createFocusRestorationCallback();

    // Get all focusable elements
    const getFocusableElements = () => Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled])'));

    // Focus first screen when dialog appears
    const firstFocusableElement = getFocusableElements().at(0);
    firstFocusableElement?.focus();

    // Keydown handler for ESC and Tab
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === KEY.ESC) {
        cancel();
        return;
      }

      if (event.key === KEY.TAB) {
        const elements = getFocusableElements();
        if (elements.length === 0) {
          return;
        }

        const firstElement = elements.at(0);
        const lastElement = elements.at(-1);
        const activeElement = focusContext.targetDocument.activeElement;

        // Shift+Tab on first elem move the focus to the last
        if (event.shiftKey && activeElement === firstElement) {
          event.preventDefault();
          lastElement?.focus();
        } else if (!event.shiftKey && activeElement === lastElement) {
          event.preventDefault();
          firstElement?.focus();
        }
      }
    };

    // Prevent focus from getting out of the dialog
    const handleFocusOut = (event: FocusEvent) => {
      const relatedTarget = event.relatedTarget as HTMLElement | null;
      if (!relatedTarget || !dialog.contains(relatedTarget)) {
        event.preventDefault();
        const elements = getFocusableElements();
        elements.at(0)?.focus();
      }
    };

    focusContext.targetDocument.addEventListener('keydown', handleKeyDown);
    dialog.addEventListener('focusout', handleFocusOut);

    return () => {
      focusContext.targetDocument.removeEventListener('keydown', handleKeyDown);
      dialog.removeEventListener('focusout', handleFocusOut);
    };
  }, [selectableScreens, selectableWindows, cancel, callState]);

  const renderPreviews = (list: ElectronDesktopCapturerSource[], uieName: string) =>
    list.map(({id, name, thumbnail}) => (
      <button
        type="button"
        key={id}
        className="choose-screen-list-item"
        data-uie-name={uieName}
        onClick={() => handleChoose(id)}
        aria-label={name}
        title={name}
      >
        <img className="choose-screen-list-image" src={thumbnail.toDataURL()} role="presentation" alt="" />
      </button>
    ));

  return (
    <div
      ref={dialogRef}
      className="choose-screen"
      role="dialog"
      aria-modal="true"
      aria-labelledby="choose-screen-title"
    >
      <div id="choose-screen-title" className="label-xs text-white">
        {t('callChooseSharedScreen')}
      </div>
      <div className="choose-screen-list">{renderPreviews(selectableScreens, 'item-screen')}</div>
      {selectableWindows.length > 0 && (
        <Fragment>
          <div className="label-xs text-white">{t('callChooseSharedWindow')}</div>
          <div className="choose-screen-list">{renderPreviews(selectableWindows, 'item-window')}</div>
        </Fragment>
      )}
      <div id="choose-screen-controls" className="choose-screen-controls">
        <button
          type="button"
          className="choose-screen-controls-button button-round button-round-dark button-round-md icon-close"
          data-uie-name="do-choose-screen-cancel"
          onClick={cancel}
          aria-label={t('callChooseScreenCancel')}
          title={t('callChooseScreenCancel')}
        ></button>
      </div>
    </div>
  );
}

export {ChooseScreen};
