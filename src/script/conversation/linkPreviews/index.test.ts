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

import {getLinkPreviewFromString} from '.';

describe('linkPreviews', () => {
  const mockOgResult = {
    description: 'an interesting article about the past',
    image: {
      data:
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJYAAACWCAYAAAA8AXHiAAADiUlEQVR4nO3dS67cMAwEwHeWuf8dkxOMDV' +
        'DTJiVXA1pq+FF5EyDJ3+fz+XfCuUp3bzv3Wj1/3Q288bF26rV6wNJr5ICl18gBS6+RA5ZeIwcsvUbOJaxpSTxW9V5HzWkBC6xIwAIrEr' +
        'DAigQssCIBC6xIwAIrkgisu6VXT7Vm4l5HTnkPsIbllPcAa1hOeQ+whuWU9wBrWE55D7CG5ZT3AGtYTnmP18PqmGOnGas1wQILrGm9gg' +
        'UWWGDts3SwwAILrH2WDhZYYIH1+6V35JSPp1oTrFDAOmSQaQHrkEGmBaxDBpkWsA4ZZFrAOmSQaQHr5Y+1Mn9id6e8B1hglQMWWJGABV' +
        'YkYIEVCVhgRQIWWJGUYe10qguo3uuqucsBCyywpj0yWGCBBRZYJxywwAJr2iODdQHrcsoXZNpHcErAAisSsMCKBCywIgELrEjAAisSsM' +
        'CKpPznWCuZ9Fgrv/k0nmq9jo8HLLDAAgusxwdN9JK8+2SvYIEVqQcWWJF6YIEVqbcVrBSCSXg65u+YI7EDsAJLBQusyFLBAiuyVLDAii' +
        'wVLLAiSwULrMhSwbr5yxQdgySG7IA1acaOOcAK1Zs0I1g3AQusbZaeqjdpRrBuAhZY2yw9VW/SjGDdBCywtll6qt6kGY+BdZfU706pt9' +
        'JP4iPo6AeshoAF1uP9gLUQsMAC6+F+wFoIWGCB9XA/r4CVGqT6u4mz0svTc6SS6BWshV6eniMVsMCKBCywIgELrEjAAisSsMCKZBSsnQ' +
        'LWdRI1wSreA+s6YBXvgXUdsIr3wLoOWMV7YF0HrOI9sK4DVvEeWNd5xX/dW00HrGmp9gpWcalggRVZKlhgRZYKFliRpYIFVmSpYIEVWS' +
        'pYC7CmJfHI1XsdH0FqjkRNsIr3wAILLLCuAxZYkYAFViRggRUJWC+A1bH0ab0+jWenAxZYYE3rFSywwAKrVnPaY1XTDQKsAb2CBRZYYN' +
        'Vq7vSQiV5XZkzsByywIvsBC6zIfsACK7IfsMCK7AcssCL7AQusyH7AAiuyn9fDSs3YUXPSRwBWaMaOmmCBFakJFliRmmCBFakJFliRmm' +
        'CBFal5BKyO7PQRJPpJ7Gb17reABRZYYP1+N6t3vwUssMAC6/e7Wb37LWCBBRZYv9/N6t1vecU/btvx8UyCvNJr9R5YoYA1AAVYYI09ic' +
        'WtBKwBKMACa+xJLG4lYA1AAdZ5sP4Df5GjbWdSI2IAAAAASUVORK5CYII=',
    },
    title: 'A link to the past',
    type: 'article',
  };
  beforeEach(() => (window.openGraphAsync = url => Promise.resolve({...mockOgResult, url})));
  afterEach((): void => (window.openGraphAsync = undefined));

  describe('getLinkPreviewFromString', () => {
    it('does nothing if openGraphAsync is not defined on window', async () => {
      window.openGraphAsync = undefined;

      const res = await getLinkPreviewFromString('test https://test.com');
      expect(res).not.toBeDefined();
    });

    it('returns nothing if a link is blacklisted', async () => {
      const res = await getLinkPreviewFromString('test https://youtu.be');
      expect(res).not.toBeDefined();
    });

    it('catches errors that are raised by the openGraph lib when invalid URIs are parsed', async () => {
      window.openGraphAsync = () => Promise.reject(new Error('Invalid URI'));

      const res = await getLinkPreviewFromString('test https://test.com');
      expect(res).not.toBeDefined();
    });

    it.each([
      ['look at this http://test.com', 'http://test.com'],
      ['wow https://stuff.com', 'https://stuff.com'],
    ])('returns a proper link preview for valid input "%s"', async (input, url) => {
      const res = await getLinkPreviewFromString(input);
      expect(res).toEqual(
        expect.objectContaining({
          image: {
            data: expect.any(Uint8Array),
            height: 0,
            type: 'image/png',
            width: 0,
          },
          title: mockOgResult.title,
          url,
        }),
      );
    });

    it('should work when preview has no image', async () => {
      window.openGraphAsync = url => Promise.resolve({...mockOgResult, image: undefined, url});
      const url = 'http://test.com';
      const res = await getLinkPreviewFromString(url);
      expect(res).toEqual(
        expect.objectContaining({
          image: undefined,
          title: mockOgResult.title,
          url,
        }),
      );
    });

    it.each([['look at this'], ['look at this stuff http//stuff.co']])(
      'does not generate link preview if no link is detected in the text "%s"',
      async input => {
        const res = await getLinkPreviewFromString(input);
        expect(res).not.toBeDefined();
      },
    );

    it('detects tweets from url', async () => {
      window.openGraphAsync = url =>
        Promise.resolve({...mockOgResult, site_name: 'Twitter', title: 'Jack on Twitter', url});
      const url = 'https://twitter.com/jack/status/20';
      const res = await getLinkPreviewFromString(url);

      expect(res?.tweet).toBeDefined();
      expect(res?.tweet.author).toBe('Jack');
      expect(res?.tweet.username).toBe('jack');
    });
  });
});
