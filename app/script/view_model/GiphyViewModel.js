/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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
window.z.ViewModel = z.ViewModel || {};

z.ViewModel.GiphyViewModel = class GiphyViewModel {
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
  constructor(element_id, conversation_repository, giphy_repository) {
    this.on_clicked_gif = this.on_clicked_gif.bind(this);

    this.element_id = element_id;
    this.conversation_repository = conversation_repository;
    this.giphy_repository = giphy_repository;
    this.logger = new z.util.Logger('z.ViewModel.GiphyViewModel', z.config.LOGGER.OPTIONS);

    this.modal = undefined;
    this.state = ko.observable(GiphyViewModel.STATE.DEFAULT);
    this.query = ko.observable('');
    this.show_giphy_button = ko.observable(true);
    this.sending_giphy_message = false;

    // GIF presented in the single GIF view
    this.gif = ko.observable();

    // GIFs rendered in the modal
    this.gifs = ko.observableArray();

    // GIF selected by user or single GIF when in single GIF view
    this.selected_gif = ko.observable();

    this._init_subscriptions();
  }

  _init_subscriptions() {
    amplify.subscribe(z.event.WebApp.EXTENSIONS.GIPHY.SHOW, this.show_giphy.bind(this));
  }

  show_giphy() {
    this.sending_giphy_message = false;
    this.query(this.conversation_repository.active_conversation().input());
    this.state(GiphyViewModel.STATE.DEFAULT);
    this._get_random_gif();

    if (!this.modal) {
      this.modal = new zeta.webapp.module.Modal('#giphy-modal');
    }

    this.modal.show();
  }

  on_back() {
    this.gifs([this.gif()]);
    this.selected_gif(this.gif());
    this.show_giphy_button(true);
  }

  on_try_another() {
    this._get_random_gif();
  }

  on_giphy_button() {
    this._get_random_gifs();
  }

  on_send() {
    if (this.selected_gif() && !this.sending_giphy_message) {
      const conversation_et = this.conversation_repository.active_conversation();
      this.sending_giphy_message = true;

      this.conversation_repository.send_gif(conversation_et, this.selected_gif().animated, this.query()).then(() => {
        this.sending_giphy_message = false;
        const event = new z.tracking.event.PictureTakenEvent('conversation', 'giphy', 'button');
        amplify.publish(z.event.WebApp.ANALYTICS.EVENT, event.name, event.attributes);
        amplify.publish(z.event.WebApp.EXTENSIONS.GIPHY.SEND);
      });

      this.modal.hide();
    }
  }

  on_close() {
    this.modal.hide();
  }

  on_clicked_gif(clicked_gif, event) {
    if (this.gifs().length !== 1) {
      const gif_item = $(event.currentTarget);
      const gif_items = gif_item.parent().children();

      const remove_unselected = function() {
        $(this).removeClass('gif-container-item-unselected');
      };

      const add_unselected = function() {
        $(this).addClass('gif-container-item-unselected');
      };

      if (this.selected_gif() === clicked_gif) {
        gif_items.each(remove_unselected);
        this.selected_gif(undefined);
      } else {
        gif_items.each(add_unselected);
        remove_unselected.apply(gif_item);
        this.selected_gif(clicked_gif);
      }
    }
  }

  _clear_gifs() {
    this.gifs.removeAll();
    this.selected_gif(undefined);
    this.state(GiphyViewModel.STATE.LOADING);
  }

  _get_random_gif() {
    if (this.state() !== GiphyViewModel.STATE.ERROR) {
      this._clear_gifs();
      this.show_giphy_button(true);

      this.giphy_repository
        .getRandomGif({
          tag: this.query(),
        })
        .then(gif => {
          this.gif(gif);
          this.gifs.push(this.gif());
          this.selected_gif(this.gif());
          this.state(GiphyViewModel.STATE.RESULTS);
        })
        .catch(error => {
          this.logger.error(`No gif found for query: ${this.query()}`, error);
          this.state(GiphyViewModel.STATE.ERROR);
        });
    }
  }

  _get_random_gifs() {
    if (this.state() !== GiphyViewModel.STATE.ERROR) {
      this._clear_gifs();
      this.show_giphy_button(false);

      this.giphy_repository
        .getGifs({
          number: GiphyViewModel.CONFIG.NUMBER_OF_GIFS,
          query: this.query(),
        })
        .then(gifs => {
          this.gifs(gifs);
          if (gifs.length === 1) {
            this.selected_gif(gifs[0]);
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
