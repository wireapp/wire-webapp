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

import {Fragment, useCallback, useEffect} from 'react';

import {container} from 'tsyringe';

import {CallState} from 'Repositories/calling/CallState';
import {ElectronDesktopCapturerSource} from 'Repositories/media/MediaDevicesHandler';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';

interface ChooseScreenProps {
  choose: (screenId: string) => void;
  callState?: CallState;
}

function ChooseScreen({choose, callState = container.resolve(CallState)}: ChooseScreenProps) {
  const {selectableScreens, selectableWindows} = useKoSubscribableChildren(callState, [
    'selectableScreens',
    'selectableWindows',
  ]);

  const cancel = useCallback(() => {
    callState.selectableScreens([]);
    callState.selectableWindows([]);
  }, [callState]);

  useEffect(() => {
    const closeOnEsc = ({key}: KeyboardEvent): void => {
      if (key === 'Escape') {
        cancel();
      }
    };

    document.addEventListener('keydown', closeOnEsc);
    return () => {
      document.removeEventListener('keydown', closeOnEsc);
    };
  }, [cancel]);

  const renderPreviews = (list: ElectronDesktopCapturerSource[], uieName: string) =>
    list.map(({id, thumbnail}) => (
      <button
        type="button"
        key={id}
        className="choose-screen-list-item"
        data-uie-name={uieName}
        onClick={() => choose(id)}
      >
        <img className="choose-screen-list-image" src={thumbnail.toDataURL()} role="presentation" alt="" />
      </button>
    ));

  return (
    <div className="choose-screen">
      <div className="label-xs text-white">{t('callChooseSharedScreen')}</div>
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
        ></button>
      </div>
    </div>
  );
}

export {ChooseScreen};
