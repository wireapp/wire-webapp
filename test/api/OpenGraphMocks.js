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

window.OpenGraphMocks = {
  getHeiseMock: function() {
    return {
      description:
        'Eine Woche nach ihrer Ankunft im System hat die NASA-Sonde Juno ein erstes Bild aus dem Orbit um den Jupiter gemacht und zur Erde geschickt. Es zeigt den Gasriesen plus drei Monde und wie weit die Sonde auf ihrer Umlaufbahn ausschwenkt.',
      image: {
        url: 'http://www.heise.de/imgs/18/1/8/5/1/3/4/6/PIA20707-68c99730783b54fb.jpeg',
      },
      locale: 'de_DE',
      site_name: 'heise online',
      title: 'Jupiter-Sonde Juno: Das erste Foto aus dem Orbit',
      type: 'website',
      url: 'http://www.heise.de/newsticker/meldung/Jupiter-Sonde-Juno-Das-erste-Foto-aus-dem-Orbit-3265536.html',
    };
  },

  getWireMock: function() {
    return {
      description:
        'HD quality calls, private and group chats with inline photos, music and video. Secure and perfectly synced across your devices.',
      image: {
        url:
          'https://lh3.ggpht.com/ElqTCcY1N0c3EAX27MRFoXynZlbTaJD2KEqYNXAPn5YQPZa6Bvsux4NCgEMoUhazdIWWelAU__Kzmr55j55EsgM=s1024',
      },
      title: 'Wire · Modern communication, full privacy. For iOS, Android, macOS, Windows and web.',
      type: 'website',
      url: 'https://wire.com/',
    };
  },
};
