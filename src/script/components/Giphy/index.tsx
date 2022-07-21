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

import {WebAppEvents} from '@wireapp/webapp-events';
import {MouseEvent, FC, useEffect, useState} from 'react';
import {amplify} from 'amplify';
import cx from 'classnames';

import Icon from 'Components/Icon';

import {registerReactComponent} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';
import {Modal} from '../../ui/Modal';
import {Gif, GiphyRepository} from '../../extension/GiphyRepository';
import {getLogger, Logger} from 'Util/Logger';

enum GiphyState {
  DEFAULT = '',
  ERROR = 'GiphyViewModel.STATE.ERROR',
  LOADING = 'GiphyViewModel.STATE.LOADING',
  NO_SEARCH_RESULT = 'GiphyViewModel.STATE.NO_SEARCH_RESULT',
  RESULT = 'GiphyViewModel.STATE.RESULT',
  RESULTS = 'GiphyViewModel.STATE.RESULTS',
}

interface GiphyProps {
  readonly giphyRepository: GiphyRepository;
}

const Giphy: FC<GiphyProps> = ({giphyRepository}) => {
  const logger: Logger = getLogger('GiphyViewModel');

  const [query, setQuery] = useState<string>('');
  const [gifs, setGifs] = useState<Gif[]>([]);
  const [selectedGif, setSelectedGif] = useState<Gif | null>(null);
  const [currentGif, setCurrentGif] = useState<Gif | null>(null);

  const [giphyState, setGiphyState] = useState<GiphyState>(GiphyState.DEFAULT);
  const isErrorState = giphyState === GiphyState.ERROR;
  const isLoadingState = giphyState === GiphyState.LOADING;
  const isResultState = giphyState === GiphyState.RESULT;
  const isResultsState = giphyState === GiphyState.RESULTS;
  const areResultsState = [GiphyState.RESULT, GiphyState.RESULTS].includes(giphyState);
  const isNoSearchResultState = giphyState === GiphyState.NO_SEARCH_RESULT;

  const hasGifs = gifs.length > 0;

  const loadingTxt = isLoadingState ? t('accessibility.giphyModal.loading') : '';

  const giphyModal = new Modal('#giphy-modal', () => {
    giphyRepository.resetOffset();
  });

  const clearGifs = (): void => {
    setGifs([]);
    setSelectedGif(null);
    setGiphyState(GiphyState.LOADING);
  };

  const getGifs = async (displaySingleResult = false): Promise<void> => {
    const isStateError = giphyState === GiphyState.ERROR;

    if (isStateError) {
      return;
    }

    clearGifs();

    try {
      const fetchedGifs = await giphyRepository.getGifs(query);

      if (fetchedGifs.length === 0) {
        setGiphyState(GiphyState.NO_SEARCH_RESULT);

        return;
      }

      if (fetchedGifs.length === 1 || displaySingleResult) {
        const gif = fetchedGifs[0];

        setCurrentGif(gif);
        setGifs([gif]);
        setSelectedGif(gif);
        setGiphyState(GiphyState.RESULT);
      } else {
        setGifs(fetchedGifs);
        setGiphyState(GiphyState.RESULTS);
      }
    } catch (error) {
      console.warn(error);
      setGiphyState(GiphyState.ERROR);

      logger.warn(error);
    }
  };

  const onGridClick = async () => getGifs();

  const onBackClick = () => {
    if (currentGif) {
      setGifs([currentGif]);
      setSelectedGif(currentGif);
    }
    setGiphyState(GiphyState.RESULT);
  };

  const onCloseClick = () => {
    giphyModal.hide();
    giphyRepository.resetOffset();
  };

  const showGiphy = async (query: string) => {
    setQuery(query);
    setGiphyState(GiphyState.DEFAULT);
    await getGifs(true);

    giphyModal.show();
    giphyModal.focus();
  };

  const getRandomGif = async () => {
    if (isErrorState) {
      return;
    }

    clearGifs();

    try {
      const gif = await giphyRepository.getRandomGif({tag: query});
      setCurrentGif(gif);
      setGifs([gif]);
      setSelectedGif(gif);
      setGiphyState(GiphyState.RESULT);
    } catch (error) {
      logger.warn(error);
      setGiphyState(GiphyState.ERROR);
    }
  };

  const onSend = () => {
    if (selectedGif) {
      amplify.publish(WebAppEvents.EXTENSIONS.GIPHY.SEND, selectedGif.animated, query);
      setSelectedGif(null);

      giphyModal.hide();
      giphyRepository.resetOffset();
    }
  };

  const onSelectGif = (clickedGif: Gif): void => {
    const hasMultipleGifs = gifs.length !== 1;

    if (hasMultipleGifs) {
      if (selectedGif === clickedGif) {
        setSelectedGif(null);
      } else {
        setSelectedGif(clickedGif);
      }
    }
  };

  useEffect(() => {
    amplify.subscribe(WebAppEvents.EXTENSIONS.GIPHY.SHOW, showGiphy);
  }, []);

  return (
    <div
      role="dialog"
      aria-labelledby="giphy-name"
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={0}
    >
      <div className="modal-content">
        <div className="giphy-modal-header modal-header">
          {isResultState && <button className="button-icon icon-grid" onClick={onGridClick} />}

          {(isResultsState || isNoSearchResultState) && (
            <button className="button-icon icon-back" onClick={onBackClick} data-uie-name="do-close" />
          )}

          {!(areResultsState || isNoSearchResultState) && <span className="giphy-modal-header-button" />}

          <span id="giphy-name" className="label-xs" data-uie-name="giphy-query">
            {query}
          </span>

          <button
            type="button"
            className="icon-button"
            aria-label={t('accessibility.giphyModal.close')}
            onClick={onCloseClick}
            data-uie-name="do-close-giphy-modal"
          >
            <Icon.Close />
          </button>
        </div>

        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
        <div className="giphy-modal-center modal-center" tabIndex={0}>
          {isLoadingState && (
            <div className="gif-container-spinner">
              <div
                className="icon-spinner spin"
                aria-live="polite"
                aria-busy={isLoadingState}
                aria-label={loadingTxt}
              />
            </div>
          )}

          {areResultsState && (
            <div className={cx('gif-container', {'gif-container-grid': gifs.length > 1})}>
              {gifs.map(gif => {
                const currentGifUrl = gifs.length === 1 ? gif.animated : gif.static;

                const renderImage = (mouseActions = false) => (
                  <img
                    src={currentGifUrl}
                    alt=""
                    css={{height: '100%', objectFit: gifs.length === 1 ? 'contain' : 'cover', width: '100%'}}
                    {...(mouseActions && {
                      onMouseOut: (e: MouseEvent<HTMLImageElement>) => {
                        e.currentTarget.src = gif.static;
                      },
                      onMouseOver: (e: MouseEvent<HTMLImageElement>) => {
                        e.currentTarget.src = gif.animated;
                      },
                    })}
                  />
                );

                return gifs.length === 1 ? (
                  <div
                    key={gif.url}
                    className={cx('button-reset-default gif-container-item', {
                      'gif-container-item-unselected': gif.url !== selectedGif?.url,
                    })}
                  >
                    {renderImage()}
                  </div>
                ) : (
                  <button
                    key={gif.url}
                    className={cx('button-reset-default gif-container-item', {
                      'gif-container-item-unselected': gif.url !== selectedGif?.url,
                    })}
                    onClick={() => onSelectGif(gif)}
                  >
                    {renderImage(gifs.length > 1)}
                  </button>
                );
              })}
            </div>
          )}

          {isErrorState && (
            <div className="gif-container-error">
              <span className="gif-container-error-message">{t('extensionsGiphyNoGifs')}</span>
            </div>
          )}
        </div>

        <footer className="giphy-modal-footer modal-footer">
          <button
            type="button"
            className={cx('button button-inverted', {'button-disabled': !hasGifs})}
            aria-disabled={!hasGifs}
            onClick={getRandomGif}
            data-uie-name="do-try-another"
          >
            {t('extensionsGiphyButtonMore')}
          </button>

          <button
            type="button"
            className={cx('button', {'button-disabled': !selectedGif})}
            aria-disabled={!selectedGif}
            onClick={onSend}
            data-uie-name="do-send-gif"
          >
            {t('extensionsGiphyButtonOk')}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default Giphy;

registerReactComponent('giphy', Giphy);
