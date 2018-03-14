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

'use strict';

window.z = window.z || {};
window.z.viewModel = z.viewModel || {};
window.z.viewModel.content = z.viewModel.content || {};

z.viewModel.content.GiphyViewModel = class GiphyViewModel {
  static get CONFIG() {
    return {
      NUMBER_OF_GIFS: 6,
    };
  }

  static get STATE() {
    return {
      DEFAULT: '',
      ERROR: 'error',
      LOADING: 'loading',
      RESULTS: 'results',
    };
  }

  constructor(mainViewModel, contentViewModel, repositories) {
    this.clickToSelectGif = this.clickToSelectGif.bind(this);

    this.conversationRepository = repositories.conversation;
    this.giphyRepository = repositories.giphy;
    this.logger = new z.util.Logger('z.viewModel.content.GiphyViewModel', z.config.LOGGER.OPTIONS);

    this.modal = undefined;
    this.state = ko.observable(GiphyViewModel.STATE.DEFAULT);
    this.query = ko.observable('');
    this.showGridButton = ko.observable(true);
    this.sendingGiphyMessage = false;

    // GIF presented in the single GIF view
    this.gif = ko.observable();

    // GIFs rendered in the modal
    this.gifs = ko.observableArray();

    // GIF selected by user or single GIF when in single GIF view
    this.selectedGif = ko.observable();

    this._initSubscriptions();
  }

  _initSubscriptions() {
    amplify.subscribe(z.event.WebApp.EXTENSIONS.GIPHY.SHOW, this.showGiphy.bind(this));
  }

  clickOnBack() {
    this.gifs([this.gif()]);
    this.selectedGif(this.gif());
    this.showGridButton(true);
  }

  clickOnClose() {
    this.modal.hide();
  }

  clickOnTryAnother() {
    this._getRandomGif();
  }

  clickOnGrid() {
    this._getRandomGifs();
  }

  clickToSelectGif(clickedGif, event) {
    const hasMultipleGifs = this.gifs().length !== 1;
    if (hasMultipleGifs) {
      const gifItem = $(event.currentTarget);
      const gifItems = gifItem.parent().children();

      const remove_unselected = function() {
        $(this).removeClass('gif-container-item-unselected');
      };

      const add_unselected = function() {
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
  }

  clickToSend() {
    if (this.selectedGif() && !this.sendingGiphyMessage) {
      const conversation_et = this.conversationRepository.active_conversation();
      this.sendingGiphyMessage = true;

      this.conversationRepository.send_gif(conversation_et, this.selectedGif().animated, this.query()).then(() => {
        this.sendingGiphyMessage = false;
        const event = new z.tracking.event.PictureTakenEvent('conversation', 'giphy', 'button');
        amplify.publish(z.event.WebApp.ANALYTICS.EVENT, event.name, event.attributes);
        amplify.publish(z.event.WebApp.EXTENSIONS.GIPHY.SEND);
      });

      this.modal.hide();
    }
  }

  showGiphy() {
    this.sendingGiphyMessage = false;
    this.query(this.conversationRepository.active_conversation().input());
    this.state(GiphyViewModel.STATE.DEFAULT);
    this._getRandomGif();

    if (!this.modal) {
      this.modal = new zeta.webapp.module.Modal('#giphy-modal');
    }

    this.modal.show();
  }

  _clearGifs() {
    this.gifs.removeAll();
    this.selectedGif(undefined);
    this.state(GiphyViewModel.STATE.LOADING);
  }

  _getRandomGif() {
    const isStateError = this.state() === GiphyViewModel.STATE.ERROR;
    if (!isStateError) {
      this._clearGifs();
      this.showGridButton(true);

      this.giphyRepository
        .getRandomGif({tag: this.query()})
        .then(gif => {
          this.gif(gif);
          this.gifs.push(this.gif());
          this.selectedGif(this.gif());
          this.state(GiphyViewModel.STATE.RESULTS);
        })
        .catch(error => {
          this.logger.error(`No gif found for query: ${this.query()}`, error);
          this.state(GiphyViewModel.STATE.ERROR);
        });
    }
  }

  _getRandomGifs() {
    const isStateError = this.state() === GiphyViewModel.STATE.ERROR;
    if (!isStateError) {
      this._clearGifs();
      this.showGridButton(false);

      this.giphyRepository
        .getGifs({
          number: GiphyViewModel.CONFIG.NUMBER_OF_GIFS,
          query: this.query(),
        })
        .then(gifs => {
          this.gifs(gifs);

          if (gifs.length === 1) {
            this.selectedGif(gifs[0]);
          }

          this.state(GiphyViewModel.STATE.RESULTS);
        })
        .catch(error => {
          this.logger.error(`No gifs found for query: ${this.query()}`, error);
          this.state(GiphyViewModel.STATE.ERROR);
        });
    }
  }
};
