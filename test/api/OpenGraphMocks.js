/*
 * Wire
 * Copyright (C) 2016 Wire Swiss GmbH
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

window.OpenGraphMocks = {

  getWireMock: function() {
    return {
      'title': 'Wire · Modern communication, full privacy. For iOS, Android, macOS, Windows and web.',
      'type': 'website',
      'url': 'https://wire.com/',
      'image': {
        'url': 'https://lh3.ggpht.com/ElqTCcY1N0c3EAX27MRFoXynZlbTaJD2KEqYNXAPn5YQPZa6Bvsux4NCgEMoUhazdIWWelAU__Kzmr55j55EsgM=s1024',
      },
      'description': 'HD quality calls, private and group chats with inline photos, music and video. Secure and perfectly synced across your devices.',
    };
  },

  getHeiseMock: function() {
    return {
      'title': 'Jupiter-Sonde Juno: Das erste Foto aus dem Orbit',
      'type': 'website',
      'locale': 'de_DE',
      'url': 'http://www.heise.de/newsticker/meldung/Jupiter-Sonde-Juno-Das-erste-Foto-aus-dem-Orbit-3265536.html',
      'site_name': 'heise online',
      'image': {
        'url': 'http://www.heise.de/imgs/18/1/8/5/1/3/4/6/PIA20707-68c99730783b54fb.jpeg',
      },
      'description': 'Eine Woche nach ihrer Ankunft im System hat die NASA-Sonde Juno ein erstes Bild aus dem Orbit um den Jupiter gemacht und zur Erde geschickt. Es zeigt den Gasriesen plus drei Monde und wie weit die Sonde auf ihrer Umlaufbahn ausschwenkt.',
    };
  },
};
