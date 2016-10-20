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


window.OpenGraphMocks = {

  getFacebookMock: function() {
    return {
      'site_name': 'Facebook',
      'url': 'https://www.facebook.com/',
      'image': {
        'url': 'https://www.facebook.com/images/fb_icon_325x325.png'
      },
      'locale': 'en_US'
    }
  },

  getWireMock: function() {
    return {
      'title': 'Wire · Modern communication, full privacy. For iOS, Android, macOS, Windows and web.',
      'type': 'website',
      'url': 'https://wire.com/',
      'image': {
        'url': 'https://lh3.ggpht.com/ElqTCcY1N0c3EAX27MRFoXynZlbTaJD2KEqYNXAPn5YQPZa6Bvsux4NCgEMoUhazdIWWelAU__Kzmr55j55EsgM=s1024'
      },
      'description': 'HD quality calls, private and group chats with inline photos, music and video. Secure and perfectly synced across your devices.'
    }
  },

  getHeiseMock: function() {
    return {
      'title': 'Jupiter-Sonde Juno: Das erste Foto aus dem Orbit',
      'type': 'website',
      'locale': 'de_DE',
      'url': 'http://www.heise.de/newsticker/meldung/Jupiter-Sonde-Juno-Das-erste-Foto-aus-dem-Orbit-3265536.html',
      'site_name': 'heise online',
      'image': {
        'url': 'http://www.heise.de/imgs/18/1/8/5/1/3/4/6/PIA20707-68c99730783b54fb.jpeg'
      },
      'description': 'Eine Woche nach ihrer Ankunft im System hat die NASA-Sonde Juno ein erstes Bild aus dem Orbit um den Jupiter gemacht und zur Erde geschickt. Es zeigt den Gasriesen plus drei Monde und wie weit die Sonde auf ihrer Umlaufbahn ausschwenkt.'
    }
  },

  getSpotifyMock: function() {
    return {
      'site_name': 'Spotify',
      'title': 'Inspector Norse',
      'description': 'Inspector Norse, a song by Todd Terje on Spotify',
      'url': 'https://open.spotify.com/track/2pucDx5Wyz9uHCou4wntHa',
      'image': {
        'url': 'https://i.scdn.co/image/ce8e15daa93468eadbb45f27a96472229afa124a'
      },
      'type': 'music.song',
      'restrictions': {
        'country': {
          'allowed': ['AD','AR','AT','AU','BE','BG','BO','BR','CA','CH','CL','CO','CR','CY','CZ','DE','DK','DO','EC','EE','ES','FI','FR','GB','GR','GT','HK','HN','HU','ID','IE','IS','IT','LI','LT','LU','LV','MC','MT','MX','MY','NI','NL','NO','NZ','PA','PE','PH','PL','PT','PY','SE','SG','SK','SV','TR','TW','US','UY']
        }
      },
      'audio': {
        'url': 'https://p.scdn.co/mp3-preview/d0272ee4e30475d8a3f36988112ea1fb54db0309',
        'type': 'audio/vnd.facebook.bridge'
      }
    }
  }
};

