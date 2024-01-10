/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {createProxyMiddleware} from 'http-proxy-middleware';

import {OIDCProxyRoutePath, targetURLParam, getTargetUrlWithQueryParams} from './common';

// Configure the dynamic proxy middleware
export const OIDCProxy = createProxyMiddleware({
  changeOrigin: true,
  ignorePath: true,
  logLevel: 'silent',
  selfHandleResponse: true, // Handle response manually
  followRedirects: true,
  router: req => {
    // Dynamic target based on the request

    const {isValidUrl, targetUrlWithQueryParams} = getTargetUrlWithQueryParams(req);

    if (isValidUrl) {
      return targetUrlWithQueryParams.href;
    }

    return undefined; // or handle this case appropriately
  },
  onProxyRes: (proxyRes, req, res) => {
    // Exception: Modify the response if the target URL is the OIDC discovery URL
    if (req.originalUrl.includes('.well-known/openid-configuration')) {
      let body = '';

      proxyRes.on('data', chunk => {
        body += chunk;
      });

      proxyRes.on('end', () => {
        try {
          // Parse the body as JSON
          const json = JSON.parse(body);

          if (!req.headers.referer) {
            throw new Error('no referrer URL found');
          }
          const refererUrl = new URL(req.headers.referer);

          // Modify URLs in the JSON response
          Object.keys(json).forEach(key => {
            if (typeof json[key] === 'string' && json[key].startsWith('https://')) {
              const originalUrl = new URL(json[key]);

              json[key] = `${refererUrl.origin}${OIDCProxyRoutePath}?${targetURLParam}=${encodeURIComponent(
                originalUrl.href,
              )}`;
            }
          });
          // Send the modified response back to the client
          res.end(JSON.stringify(json));
        } catch (error) {
          console.error('Error processing proxy response:', error);
          res.status(500).send('Internal Server Error');
        }
      });
    } else {
      // Default: Send the response back to the client
      proxyRes.pipe(res);
    }
  },
});
