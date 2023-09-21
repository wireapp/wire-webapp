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

import React, {Fragment, useEffect} from 'react';

import {t} from 'Util/LocalizerUtil';

export interface Screen {
  id: string;
  thumbnail: HTMLCanvasElement;
}

export interface ChooseScreenProps {
  cancel: () => void;
  choose: (screenId: string) => void;
  screens: Screen[];
  windows: Screen[];
}

const ChooseScreen: React.FC<ChooseScreenProps> = ({cancel, choose, screens = [], windows = []}: ChooseScreenProps) => {
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

  const renderPreviews = (list: Screen[], uieName: string) =>
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
      <div className="choose-screen-list">{renderPreviews(screens, 'item-screen')}</div>
      {windows.length > 0 && (
        <>
          <div className="label-xs text-white">{t('callChooseSharedWindow')}</div>
          <div className="choose-screen-list">{renderPreviews(windows, 'item-window')}</div>
        </>
      )}
      <div id="choose-screen-controls" className="choose-screen-controls">
        <button
          type="button"
          className="choose-screen-controls-button button-round button-round-dark button-round-md icon-close"
          data-uie-name="do-choose-screen-cancel"
          onClick={cancel}
        />
      </div>
    </div>
  );
};

export {ChooseScreen};
