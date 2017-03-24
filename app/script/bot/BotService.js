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

window.z = window.z || {};
window.z.bot = z.bot || {};

z.bot.BotService = class BotService {
  constructor() {
    this.logger = new z.util.Logger('z.bot.BotService', z.config.LOGGER.OPTIONS);
    this.url = `${z.util.Environment.backend.website_url()}${BotService.URL}`;
  }

  /*
  Fetch bot information.
  @param {string} bot_name - Bot name registered on backend
  */
  fetch_bot(bot_name) {
    return new Promise((resolve, reject) => {
      $.get(`${this.url}${bot_name}/`)
      .done((data) => {
        resolve(data.result);
      }).fail((jqXHR, textStatus, errorThrown) => {
        this.logger.warn(`Could not find information for bot '${bot_name}': ${errorThrown}`);
        reject(errorThrown);
      });
    });
  }

  static get URL() {
    return 'api/v1/bot/';
  }

};
