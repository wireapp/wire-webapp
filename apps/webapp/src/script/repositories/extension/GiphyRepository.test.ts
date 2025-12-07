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

import {GiphyResult} from '@wireapp/api-client/lib/giphy/GiphyResult';
import {APIClient} from 'src/script/service/APIClientSingleton';
import {container} from 'tsyringe';

import {GiphyRepository} from './GiphyRepository';
import {GiphyService} from './GiphyService';

const randomFooGiphyResponse = {
  data: {
    fixed_height_downsampled_height: '200',
    fixed_height_downsampled_url: 'http://s3.amazonaws.com/giphygifs/media/GKLmFicoabZrW/200_d.gif',
    fixed_height_downsampled_width: '262',
    fixed_height_small_height: '100',
    fixed_height_small_still_url: 'http://s3.amazonaws.com/giphygifs/media/GKLmFicoabZrW/100_s.gif',
    fixed_height_small_url: 'http://s3.amazonaws.com/giphygifs/media/GKLmFicoabZrW/100.gif',
    fixed_height_small_width: '131',
    fixed_width_downsampled_height: '153',
    fixed_width_downsampled_url: 'http://s3.amazonaws.com/giphygifs/media/GKLmFicoabZrW/200w_d.gif',
    fixed_width_downsampled_width: '200',
    fixed_width_small_height: '76',
    fixed_width_small_still_url: 'http://s3.amazonaws.com/giphygifs/media/GKLmFicoabZrW/100w_s.gif',
    fixed_width_small_url: 'http://s3.amazonaws.com/giphygifs/media/GKLmFicoabZrW/100w.gif',
    fixed_width_small_width: '100',
    id: 'GKLmFicoabZrW',
    image_frames: '10',
    image_height: '244',
    image_mp4_url: 'http://s3.amazonaws.com/giphygifs/media/GKLmFicoabZrW/giphy.mp4',
    image_original_url: 'http://s3.amazonaws.com/giphygifs/media/GKLmFicoabZrW/giphy.gif',
    image_url: 'http://s3.amazonaws.com/giphygifs/media/GKLmFicoabZrW/giphy.gif',
    image_width: '320',
    type: 'gif',
    url: 'http://giphy.com/gifs/big-thank-indulging-GKLmFicoabZrW',
  },
  meta: {},
} as unknown as GiphyResult;

const getByIdResponse = {
  data: {
    bitly_gif_url: 'http://gph.is/1Q95Wje',
    bitly_url: 'http://gph.is/1Q95Wje',
    caption: '',
    content_url: '',
    embed_url: 'https://giphy.com/embed/GKLmFicoabZrW',
    id: 'GKLmFicoabZrW',
    images: {
      downsized: {
        height: '244',
        size: '514699',
        url: 'https://media4.giphy.com/media/GKLmFicoabZrW/giphy.gif',
        width: '320',
      },
      downsized_large: {
        height: '0',
        size: '0',
        url: '',
        width: '0',
      },
      downsized_still: {
        height: '244',
        url: 'https://media4.giphy.com/media/GKLmFicoabZrW/giphy_s.gif',
        width: '320',
      },
      fixed_height: {
        height: '200',
        mp4: 'https://media4.giphy.com/media/GKLmFicoabZrW/200.mp4',
        mp4_size: '178927',
        size: '0',
        url: 'https://media4.giphy.com/media/GKLmFicoabZrW/200.gif',
        webp: 'https://media4.giphy.com/media/GKLmFicoabZrW/200.webp',
        webp_size: '88838',
        width: '262',
      },
      fixed_height_downsampled: {
        height: '200',
        size: '149525',
        url: 'https://media4.giphy.com/media/GKLmFicoabZrW/200_d.gif',
        webp: 'https://media4.giphy.com/media/GKLmFicoabZrW/200_d.webp',
        webp_size: '53016',
        width: '262',
      },
      fixed_height_small: {
        height: '100',
        mp4: 'https://media4.giphy.com/media/GKLmFicoabZrW/100.mp4',
        mp4_size: '66464',
        size: '0',
        url: 'https://media4.giphy.com/media/GKLmFicoabZrW/100.gif',
        webp: 'https://media4.giphy.com/media/GKLmFicoabZrW/100.webp',
        webp_size: '32982',
        width: '131',
      },
      fixed_height_small_still: {
        height: '100',
        url: 'https://media4.giphy.com/media/GKLmFicoabZrW/100_s.gif',
        width: '131',
      },
      fixed_height_still: {
        height: '200',
        url: 'https://media4.giphy.com/media/GKLmFicoabZrW/200_s.gif',
        width: '262',
      },
      fixed_width: {
        height: '153',
        mp4: 'https://media4.giphy.com/media/GKLmFicoabZrW/200w.mp4',
        mp4_size: '120356',
        size: '0',
        url: 'https://media4.giphy.com/media/GKLmFicoabZrW/200w.gif',
        webp: 'https://media4.giphy.com/media/GKLmFicoabZrW/200w.webp',
        webp_size: '57810',
        width: '200',
      },
      fixed_width_downsampled: {
        height: '153',
        size: '227351',
        url: 'https://media4.giphy.com/media/GKLmFicoabZrW/200w_d.gif',
        webp: 'https://media4.giphy.com/media/GKLmFicoabZrW/200w_d.webp',
        webp_size: '34448',
        width: '200',
      },
      fixed_width_small: {
        height: '76',
        mp4: 'https://media4.giphy.com/media/GKLmFicoabZrW/100w.mp4',
        mp4_size: '46951',
        size: '0',
        url: 'https://media4.giphy.com/media/GKLmFicoabZrW/100w.gif',
        webp: 'https://media4.giphy.com/media/GKLmFicoabZrW/100w.webp',
        webp_size: '23174',
        width: '100',
      },
      fixed_width_small_still: {
        height: '76',
        url: 'https://media4.giphy.com/media/GKLmFicoabZrW/100w_s.gif',
        width: '100',
      },
      fixed_width_still: {
        height: '153',
        url: 'https://media4.giphy.com/media/GKLmFicoabZrW/200w_s.gif',
        width: '200',
      },
      original: {
        frames: '10',
        height: '244',
        mp4: 'https://media4.giphy.com/media/GKLmFicoabZrW/giphy.mp4',
        mp4_size: '710329',
        size: '514699',
        url: 'https://media4.giphy.com/media/GKLmFicoabZrW/giphy.gif',
        webp: 'https://media4.giphy.com/media/GKLmFicoabZrW/giphy.webp',
        webp_size: '116528',
        width: '320',
      },
      original_still: {
        height: '244',
        url: 'https://media4.giphy.com/media/GKLmFicoabZrW/giphy_s.gif',
        width: '320',
      },
    },
    import_datetime: '2015-05-02 00:11:31',
    rating: 'pg',
    source: 'http://jezebel.com/big-sean-is-indulging-in-some-me-time-thank-you-1701548048',
    trending_datetime: '2015-05-04 20:01:25',
    type: 'gif',
    url: 'https://giphy.com/gifs/big-thank-indulging-GKLmFicoabZrW',
    username: '',
  },
} as unknown as GiphyResult;

describe('Giphy Repository', () => {
  describe('getRandomGif', () => {
    it('can receive a random gif', async () => {
      const apiClient = container.resolve(APIClient);

      const giphyService = new GiphyService(container.resolve(APIClient));
      const giphyRepository = new GiphyRepository(giphyService);

      jest.spyOn(giphyService, 'getRandom');
      jest.spyOn(giphyService, 'getById');

      jest.spyOn(apiClient.api.giphy, 'getGiphyRandom').mockResolvedValueOnce(randomFooGiphyResponse);
      jest.spyOn(apiClient.api.giphy, 'getGiphyById').mockResolvedValueOnce(getByIdResponse);

      const tag = 'foo';
      await giphyRepository.getRandomGif({tag});

      expect(giphyService.getRandom).toHaveBeenCalledWith(tag);
      expect(giphyService.getById).toHaveBeenCalledWith(randomFooGiphyResponse.data.id);
    });
  });
});
