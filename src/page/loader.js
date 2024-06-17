/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

const HALF_MINUTE_IN_MS = 30000;

const translations = {
  de: `<p>Laden von Wire dauert länger als erwartet.</p><p>Bitte überprüfen Sie Ihre Internetverbindung.</p>`,
  en: `<p>Loading Wire takes longer than expected.</p><p>Please check your internet connection.</p>`,
};

const userLang = navigator.language;

setTimeout(() => {
  const loadingMessage = document.getElementById('loading-message');

  if (!loadingMessage) {
    return;
  }

  // TODO: If there will be more translations, we have to change this functionality..
  if (userLang.startsWith('de')) {
    loadingMessage.innerHTML = translations['de'];
  } else {
    loadingMessage.innerHTML = translations['en'];
  }

  loadingMessage.classList.add('visible');
}, HALF_MINUTE_IN_MS);
