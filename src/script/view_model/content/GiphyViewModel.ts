/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import {getLogger, Logger} from 'Util/Logger';
import {amplify} from 'amplify';
import ko from 'knockout';
import {WebAppEvents} from '@wireapp/webapp-events';

import {Modal} from '../../ui/Modal';
import {GiphyRepository, Gif} from '../../extension/GiphyRepository';

enum GiphyState {
  DEFAULT = '',
  ERROR = 'GiphyViewModel.STATE.ERROR',
  LOADING = 'GiphyViewModel.STATE.LOADING',
  NO_SEARCH_RESULT = 'GiphyViewModel.STATE.NO_SEARCH_RESULT',
  RESULT = 'GiphyViewModel.STATE.RESULT',
  RESULTS = 'GiphyViewModel.STATE.RESULTS',
}

export class GiphyViewModel {
  private readonly logger: Logger;
  private modal: Modal;
  private readonly state: ko.Observable<GiphyState>;
  private readonly query: ko.Observable<string>;
  public gif: ko.Observable<Gif>;
  public gifs: ko.ObservableArray<Gif>;
  public selectedGif: ko.Observable<Gif>;
  public isStateError: ko.PureComputed<boolean>;
  public isStateLoading: ko.PureComputed<boolean>;
  public isStateResult: ko.PureComputed<boolean>;
  public isStateResults: ko.PureComputed<boolean>;
  public isResultState: ko.PureComputed<boolean>;
  public isStateNoSearchResults: ko.PureComputed<boolean>;

  constructor(private readonly giphyRepository: GiphyRepository) {
    this.logger = getLogger('GiphyViewModel');

    this.modal = undefined;
    this.state = ko.observable(GiphyState.DEFAULT);
    this.query = ko.observable('');

    // GIF presented in the single GIF view
    this.gif = ko.observable();

    // GIFs rendered in the modal
    this.gifs = ko.observableArray();

    // GIF selected by user or single GIF when in single GIF view
    this.selectedGif = ko.observable();

    this.isStateError = ko.pureComputed(() => [GiphyState.ERROR, GiphyState.NO_SEARCH_RESULT].includes(this.state()));
    this.isStateLoading = ko.pureComputed(() => this.state() === GiphyState.LOADING);
    this.isStateResult = ko.pureComputed(() => this.state() === GiphyState.RESULT);
    this.isStateResults = ko.pureComputed(() => this.state() === GiphyState.RESULTS);
    this.isStateNoSearchResults = ko.pureComputed(() => this.state() === GiphyState.NO_SEARCH_RESULT);

    this.isResultState = ko.pureComputed(() => {
      return [GiphyState.RESULT, GiphyState.RESULTS].includes(this.state());
    });

    this._initSubscriptions();
  }

  _initSubscriptions = (): void => {
    amplify.subscribe(WebAppEvents.EXTENSIONS.GIPHY.SHOW, this.showGiphy.bind(this));
  };

  clickOnBack = (): void => {
    this.gifs([this.gif()]);
    this.selectedGif(this.gif());
    this.state(GiphyState.RESULT);
  };

  clickOnClose = (): void => {
    this.modal.hide();
    this.giphyRepository.resetOffset();
  };

  clickOnTryAnother = (): void => {
    this._getRandomGif();
  };

  clickOnGrid = (): void => {
    this._getRandomGifs();
  };

  clickToSelectGif = (clickedGif: Gif, event: MouseEvent): void => {
    const hasMultipleGifs = this.gifs().length !== 1;
    if (hasMultipleGifs) {
      const gifItem = $(event.currentTarget);
      const gifItems = gifItem.parent().children();

      const remove_unselected = function () {
        $(this).removeClass('gif-container-item-unselected');
      };

      const add_unselected = function () {
        $(this).addClass('gif-container-item-unselected');
      };

      if (this.selectedGif() === clickedGif) {
        gifItems.each(remove_unselected);
        this.selectedGif(undefined);
      } else {
        gifItems.each(add_unselected);
        remove_unselected.apply(gifItem);
        this.selectedGif(clickedGif);
      }
    }
  };

  clickToSend = (): void => {
    const selectedGif = this.selectedGif();
    if (selectedGif) {
      amplify.publish(WebAppEvents.EXTENSIONS.GIPHY.SEND, selectedGif.animated, this.query());
      this.selectedGif(undefined);
      this.modal.hide();
    }
  };

  showGiphy = (query: string): void => {
    this.query(query);
    this.state(GiphyState.DEFAULT);
    this._getRandomGif();

    if (!this.modal) {
      this.modal = new Modal('#giphy-modal', () => {
        this.modal = undefined;
      });
    }

    this.modal.show();
  };

  _clearGifs = (): void => {
    this.gifs.removeAll();
    this.selectedGif(undefined);
    this.state(GiphyState.LOADING);
  };

  _getRandomGif = async (): Promise<void> => {
    const isStateError = this.state() === GiphyState.ERROR;
    if (isStateError) {
      return;
    }

    this._clearGifs();

    try {
      const gif = await this.giphyRepository.getRandomGif({tag: this.query()});
      this.gif(gif);
      this.gifs([this.gif()]);
      this.selectedGif(this.gif());
      this.state(GiphyState.RESULT);
    } catch (error) {
      this.logger.warn(error);
      this.state(GiphyState.ERROR);
    }
  };

  _getRandomGifs = async (): Promise<void> => {
    const isStateError = this.state() === GiphyState.ERROR;
    if (isStateError) {
      return;
    }

    this._clearGifs();

    try {
      const gifs = await this.giphyRepository.getGifs(this.query());
      if (gifs.length === 0) {
        this.state(GiphyState.NO_SEARCH_RESULT);
        return;
      }
      this.gifs(gifs);
      if (gifs.length === 1) {
        this.selectedGif(gifs[0]);
      }
      this.state(GiphyState.RESULTS);
    } catch (error) {
      this.logger.warn(error);
      this.state(GiphyState.ERROR);
    }
  };
}
