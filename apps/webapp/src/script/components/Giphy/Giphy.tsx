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

import {FC, useEffect, useState} from 'react';

import {amplify} from 'amplify';
import cx from 'classnames';

import {Button, ButtonVariant} from '@wireapp/react-ui-kit';
import {WebAppEvents} from '@wireapp/webapp-events';

import {GifImage} from 'Components/Giphy/GifImage';
import * as Icon from 'Components/Icon';
import {Gif, GiphyRepository} from 'Repositories/extension/GiphyRepository';
import {t} from 'Util/LocalizerUtil';
import {getLogger} from 'Util/Logger';

const logger = getLogger('Giphy');

const GIPHY_CLOSE_TIMEOUT = 350;

export enum GiphyState {
  DEFAULT = '',
  ERROR = 'GiphyViewModel.STATE.ERROR',
  LOADING = 'GiphyViewModel.STATE.LOADING',
  NO_SEARCH_RESULT = 'GiphyViewModel.STATE.NO_SEARCH_RESULT',
  RESULT = 'GiphyViewModel.STATE.RESULT',
  RESULTS = 'GiphyViewModel.STATE.RESULTS',
}

interface GiphyProps {
  readonly giphyRepository: GiphyRepository;
  inputValue: string;
  onClose: () => void;
  defaultGiphyState?: GiphyState;
}

const Giphy: FC<GiphyProps> = ({giphyRepository, defaultGiphyState = GiphyState.DEFAULT, inputValue, onClose}) => {
  const [playAnimation, setPlayAnimation] = useState<boolean>(false);
  const [currentQuery, setCurrentQuery] = useState<string>(inputValue);
  const [gifs, setGifs] = useState<Gif[]>([]);
  const [selectedGif, setSelectedGif] = useState<Gif | null>(null);
  const [currentGif, setCurrentGif] = useState<Gif | null>(null);

  const [giphyState, setGiphyState] = useState<GiphyState>(defaultGiphyState);

  const isErrorState = giphyState === GiphyState.ERROR;
  const isLoading = giphyState === GiphyState.LOADING;
  const isSingleGif = giphyState === GiphyState.RESULT;
  const isMultipleGifs = giphyState === GiphyState.RESULTS;
  const noSearchResults = giphyState === GiphyState.NO_SEARCH_RESULT;

  const hasGifs = gifs.length > 0;

  const loadingTxt = isLoading ? t('accessibility.giphyModal.loading') : '';

  const clearGifs = (): void => {
    setGifs([]);
    setSelectedGif(null);
    setGiphyState(GiphyState.LOADING);
  };

  const getGifs = async (query: string, displaySingleResult = false): Promise<void> => {
    if (isErrorState) {
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
      logger.development.warn('Failed to get gifs', error);
      setGiphyState(GiphyState.ERROR);
    }
  };

  const onGridClick = async () => getGifs(currentQuery);

  const onBackClick = () => {
    if (currentGif) {
      setGifs([currentGif]);
      setSelectedGif(currentGif);
      setGiphyState(GiphyState.RESULT);
    }
  };

  const onCloseClick = () => {
    requestAnimationFrame(() => setPlayAnimation(false));

    setTimeout(() => {
      onClose();
      giphyRepository.resetOffset();
    }, GIPHY_CLOSE_TIMEOUT);
  };

  const showGiphy = async (query: string) => {
    setCurrentQuery(query);
    await getGifs(query, true);
  };

  const getRandomGif = async () => {
    if (isErrorState) {
      return;
    }

    clearGifs();

    try {
      const gif = await giphyRepository.getRandomGif({tag: currentQuery});
      setCurrentGif(gif);
      setGifs([gif]);
      setSelectedGif(gif);
      setGiphyState(GiphyState.RESULT);
    } catch (error) {
      setGiphyState(GiphyState.ERROR);
    }
  };

  const onSend = () => {
    if (selectedGif) {
      amplify.publish(WebAppEvents.EXTENSIONS.GIPHY.SEND, selectedGif.animated, currentQuery);
      setSelectedGif(null);

      onCloseClick();
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
    if (inputValue) {
      requestAnimationFrame(() => setPlayAnimation(true));
      showGiphy(inputValue);
    }
  }, [inputValue]);

  return (
    <div id="giphy-modal" className={cx('giphy-modal modal modal-large modal-show', {'modal-fadein': playAnimation})}>
      <div role="dialog" aria-labelledby="giphy-name">
        <div className="modal-content">
          <header className="giphy-modal-header modal-header">
            {isSingleGif && (
              <button
                className="button-icon icon-grid"
                onClick={onGridClick}
                aria-label={t('accessibility.giphyModal.showGifs')}
                data-uie-name="do-open-giphs"
              />
            )}

            {(isMultipleGifs || noSearchResults) && (
              <button
                className="button-icon icon-back"
                onClick={onBackClick}
                data-uie-name="do-close"
                aria-label={t('accessibility.giphyModal.showSingleGif')}
              />
            )}

            {!(isSingleGif || isMultipleGifs || noSearchResults) && <span className="giphy-modal-header-button" />}

            <span id="giphy-name" className="label-xs" data-uie-name="giphy-query">
              {currentQuery}
            </span>

            <button
              type="button"
              className="icon-button"
              aria-label={t('accessibility.giphyModal.close')}
              onClick={onCloseClick}
              data-uie-name="do-close-giphy-modal"
            >
              <Icon.CloseIcon />
            </button>
          </header>

          <div className="giphy-modal-center modal-center">
            {isLoading && (
              <div className="gif-container-spinner">
                <div className="icon-spinner spin" aria-live="polite" aria-busy={isLoading} aria-label={loadingTxt} />
              </div>
            )}

            {isSingleGif && currentGif && (
              <div className="gif-container">
                <div className="button-reset-default gif-container-item">
                  <GifImage src={currentGif.animated} />
                </div>
              </div>
            )}

            {isMultipleGifs && (
              <div className="gif-container gif-container-grid">
                {gifs.map(gif => (
                  <button
                    key={gif.url}
                    className={cx('button-reset-default gif-container-item', {
                      'gif-container-item-unselected': gif.url !== selectedGif?.url,
                    })}
                    onClick={() => onSelectGif(gif)}
                    aria-label={t('accessibility.giphyModal.selectGif')}
                  >
                    <GifImage src={gif.static} animatedSrc={gif.animated} objectFit="cover" title={gif.title} />
                  </button>
                ))}
              </div>
            )}

            {isErrorState && (
              <div className="gif-container-error">
                <span className="gif-container-error-message" data-uie-name="giphy-error-message">
                  {t('extensionsGiphyNoGifs')}
                </span>
              </div>
            )}
          </div>

          <footer className="giphy-modal-footer modal-footer">
            <Button
              type="button"
              variant={ButtonVariant.SECONDARY}
              aria-disabled={!hasGifs}
              disabled={!hasGifs}
              onClick={getRandomGif}
              data-uie-name="do-try-another"
              aria-label={t('accessibility.giphyModal.tryAnother')}
            >
              {t('extensionsGiphyButtonMore')}
            </Button>

            <Button
              type="button"
              aria-disabled={!selectedGif}
              disabled={!selectedGif}
              onClick={onSend}
              data-uie-name="do-send-gif"
              aria-label={t('accessibility.giphyModal.sendGif')}
            >
              {t('extensionsGiphyButtonOk')}
            </Button>
          </footer>
        </div>
      </div>
    </div>
  );
};

export {Giphy};
