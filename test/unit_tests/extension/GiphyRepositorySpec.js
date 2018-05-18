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

// grunt test_init && grunt test_run:extension/GiphyRepositorySpecs

'use strict';

describe('Giphy Repository', () => {
  let server = null;
  const urls = {
    restUrl: 'http://localhost',
    websocket_url: 'wss://localhost',
  };

  let client = null;
  let giphy_repository = null;
  let giphy_service = null;

  beforeEach(() => {
    server = sinon.fakeServer.create();

    client = new z.service.BackendClient(urls);
    client.logger.level = client.logger.levels.OFF;

    giphy_service = new z.extension.GiphyService(client);
    giphy_repository = new z.extension.GiphyRepository(giphy_service);

    spyOn(giphy_service, 'getRandom').and.callThrough();
    spyOn(giphy_service, 'getById').and.callThrough();

    const random_foo_gif = `${urls.restUrl}/proxy/giphy/v1/gifs/random?tag=foo`;
    /* eslint-disable comma-spacing, key-spacing, no-useless-escape, sort-keys, quotes */
    server.respondWith('GET', random_foo_gif, [
      200,
      {'Content-Type': 'application/json'},
      JSON.stringify({
        data: {
          type: 'gif',
          id: 'GKLmFicoabZrW',
          url: 'http://giphy.com/gifs/big-thank-indulging-GKLmFicoabZrW',
          image_original_url: 'http://s3.amazonaws.com/giphygifs/media/GKLmFicoabZrW/giphy.gif',
          image_url: 'http://s3.amazonaws.com/giphygifs/media/GKLmFicoabZrW/giphy.gif',
          image_mp4_url: 'http://s3.amazonaws.com/giphygifs/media/GKLmFicoabZrW/giphy.mp4',
          image_frames: '10',
          image_width: '320',
          image_height: '244',
          fixed_height_downsampled_url: 'http://s3.amazonaws.com/giphygifs/media/GKLmFicoabZrW/200_d.gif',
          fixed_height_downsampled_width: '262',
          fixed_height_downsampled_height: '200',
          fixed_width_downsampled_url: 'http://s3.amazonaws.com/giphygifs/media/GKLmFicoabZrW/200w_d.gif',
          fixed_width_downsampled_width: '200',
          fixed_width_downsampled_height: '153',
          fixed_height_small_url: 'http://s3.amazonaws.com/giphygifs/media/GKLmFicoabZrW/100.gif',
          fixed_height_small_still_url: 'http://s3.amazonaws.com/giphygifs/media/GKLmFicoabZrW/100_s.gif',
          fixed_height_small_width: '131',
          fixed_height_small_height: '100',
          fixed_width_small_url: 'http://s3.amazonaws.com/giphygifs/media/GKLmFicoabZrW/100w.gif',
          fixed_width_small_still_url: 'http://s3.amazonaws.com/giphygifs/media/GKLmFicoabZrW/100w_s.gif',
          fixed_width_small_width: '100',
          fixed_width_small_height: '76',
        },
        meta: {status: 200, msg: 'OK'},
      }),
    ]);
    /* eslint-enable comma-spacing, key-spacing, no-useless-escape, sort-keys, quotes */

    const random_foo_gif_data = `${urls.restUrl}/proxy/giphy/v1/gifs/GKLmFicoabZrW`;
    /* eslint-disable comma-spacing, key-spacing, no-useless-escape, sort-keys, quotes */
    server.respondWith('GET', random_foo_gif_data, [
      200,
      {'Content-Type': 'application/json'},
      JSON.stringify({
        data: {
          type: 'gif',
          id: 'GKLmFicoabZrW',
          url: 'https://giphy.com/gifs/big-thank-indulging-GKLmFicoabZrW',
          bitly_gif_url: 'http://gph.is/1Q95Wje',
          bitly_url: 'http://gph.is/1Q95Wje',
          embed_url: 'https://giphy.com/embed/GKLmFicoabZrW',
          username: '',
          source: 'http://jezebel.com/big-sean-is-indulging-in-some-me-time-thank-you-1701548048',
          rating: 'pg',
          caption: '',
          content_url: '',
          import_datetime: '2015-05-02 00:11:31',
          trending_datetime: '2015-05-04 20:01:25',
          images: {
            fixed_height: {
              url: 'https://media4.giphy.com/media/GKLmFicoabZrW/200.gif',
              width: '262',
              height: '200',
              size: '0',
              mp4: 'https://media4.giphy.com/media/GKLmFicoabZrW/200.mp4',
              mp4_size: '178927',
              webp: 'https://media4.giphy.com/media/GKLmFicoabZrW/200.webp',
              webp_size: '88838',
            },
            fixed_height_still: {
              url: 'https://media4.giphy.com/media/GKLmFicoabZrW/200_s.gif',
              width: '262',
              height: '200',
            },
            fixed_height_downsampled: {
              url: 'https://media4.giphy.com/media/GKLmFicoabZrW/200_d.gif',
              width: '262',
              height: '200',
              size: '149525',
              webp: 'https://media4.giphy.com/media/GKLmFicoabZrW/200_d.webp',
              webp_size: '53016',
            },
            fixed_width: {
              url: 'https://media4.giphy.com/media/GKLmFicoabZrW/200w.gif',
              width: '200',
              height: '153',
              size: '0',
              mp4: 'https://media4.giphy.com/media/GKLmFicoabZrW/200w.mp4',
              mp4_size: '120356',
              webp: 'https://media4.giphy.com/media/GKLmFicoabZrW/200w.webp',
              webp_size: '57810',
            },
            fixed_width_still: {
              url: 'https://media4.giphy.com/media/GKLmFicoabZrW/200w_s.gif',
              width: '200',
              height: '153',
            },
            fixed_width_downsampled: {
              url: 'https://media4.giphy.com/media/GKLmFicoabZrW/200w_d.gif',
              width: '200',
              height: '153',
              size: '227351',
              webp: 'https://media4.giphy.com/media/GKLmFicoabZrW/200w_d.webp',
              webp_size: '34448',
            },
            fixed_height_small: {
              url: 'https://media4.giphy.com/media/GKLmFicoabZrW/100.gif',
              width: '131',
              height: '100',
              size: '0',
              mp4: 'https://media4.giphy.com/media/GKLmFicoabZrW/100.mp4',
              mp4_size: '66464',
              webp: 'https://media4.giphy.com/media/GKLmFicoabZrW/100.webp',
              webp_size: '32982',
            },
            fixed_height_small_still: {
              url: 'https://media4.giphy.com/media/GKLmFicoabZrW/100_s.gif',
              width: '131',
              height: '100',
            },
            fixed_width_small: {
              url: 'https://media4.giphy.com/media/GKLmFicoabZrW/100w.gif',
              width: '100',
              height: '76',
              size: '0',
              mp4: 'https://media4.giphy.com/media/GKLmFicoabZrW/100w.mp4',
              mp4_size: '46951',
              webp: 'https://media4.giphy.com/media/GKLmFicoabZrW/100w.webp',
              webp_size: '23174',
            },
            fixed_width_small_still: {
              url: 'https://media4.giphy.com/media/GKLmFicoabZrW/100w_s.gif',
              width: '100',
              height: '76',
            },
            downsized: {
              url: 'https://media4.giphy.com/media/GKLmFicoabZrW/giphy.gif',
              width: '320',
              height: '244',
              size: '514699',
            },
            downsized_still: {
              url: 'https://media4.giphy.com/media/GKLmFicoabZrW/giphy_s.gif',
              width: '320',
              height: '244',
            },
            downsized_large: {url: '', width: '0', height: '0', size: '0'},
            original: {
              url: 'https://media4.giphy.com/media/GKLmFicoabZrW/giphy.gif',
              width: '320',
              height: '244',
              size: '514699',
              frames: '10',
              mp4: 'https://media4.giphy.com/media/GKLmFicoabZrW/giphy.mp4',
              mp4_size: '710329',
              webp: 'https://media4.giphy.com/media/GKLmFicoabZrW/giphy.webp',
              webp_size: '116528',
            },
            original_still: {
              url: 'https://media4.giphy.com/media/GKLmFicoabZrW/giphy_s.gif',
              width: '320',
              height: '244',
            },
          },
        },
        meta: {status: 200, msg: 'OK'},
      }),
    ]);
    /* eslint-enable comma-spacing, key-spacing, no-useless-escape, sort-keys, quotes */
  });

  afterEach(() => {
    server.restore();
  });

  describe('getRandomGif', () => {
    it('can receive a random gif', done => {
      giphy_repository
        .getRandomGif({tag: 'foo'})
        .then(() => {
          expect(giphy_service.getRandom).toHaveBeenCalled();
          expect(giphy_service.getById).toHaveBeenCalled();
          done();
        })
        .catch(done.fail);

      server.respond();
      window.setTimeout(() => {
        server.respond();
      }, 10);
    });
  });
});
