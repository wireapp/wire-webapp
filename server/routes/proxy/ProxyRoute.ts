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

import {Router} from 'express';
import {createProxyMiddleware} from 'http-proxy-middleware';

const targetURLParam = 'oidcProxyUrl';

export const ProxyRoute = () => {
  // Function to validate the URL
  const isValidUrl = (urlString: string) => {
    try {
      new URL(urlString);
      return true;
    } catch (e) {
      return false;
    }
  };

  // @ts-ignore
  return Router().use('/proxy', (req, res, next) => {
    const targetUrl = req.query[targetURLParam];

    if (typeof targetUrl !== 'string' || !isValidUrl(targetUrl)) {
      return res.status(400).send('Invalid URL');
    }

    // Get all query parameters except the targetURLParam
    const queryParams = req.query;
    delete queryParams[targetURLParam];

    // Append the query parameters to the target URL
    const targetUrlWithQueryParams = new URL(targetUrl);
    Object.keys(queryParams).forEach(key => {
      targetUrlWithQueryParams.searchParams.append(key, queryParams[key] as string);
    });

    // Configure the dynamic proxy middleware
    const proxy = createProxyMiddleware({
      target: targetUrlWithQueryParams.href,
      changeOrigin: true,
      ignorePath: true,
      // logLevel: 'debug',
      selfHandleResponse: true, // Handle response manually
      followRedirects: true,
      onProxyRes: (proxyRes, req, res) => {
        if (targetUrlWithQueryParams.href.includes('/dex/auth')) {
          // Exception 1: Redirect to the target URL if the response is a redirect to the OIDC auth endpoint
          res.redirect(targetUrlWithQueryParams.href);
          // Exception 2: Modify the response if the target URL is the OIDC discovery URL
        } else if (req.originalUrl.includes('.well-known/openid-configuration')) {
          let body = '';

          proxyRes.on('data', chunk => {
            body += chunk;
          });

          proxyRes.on('end', () => {
            try {
              // Parse the body as JSON
              const json = JSON.parse(body);

              // Modify URLs in the JSON response
              Object.keys(json).forEach(key => {
                if (typeof json[key] === 'string' && json[key].startsWith('https://')) {
                  const originalUrl = new URL(json[key]);
                  const refererUrl = new URL(req.headers.referer);

                  json[key] = `${refererUrl.origin}/proxy?${targetURLParam}=${encodeURIComponent(originalUrl.href)}`;
                }
              });
              // Send the modified response back to the client
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(json));
            } catch (error) {
              console.error('Error processing proxy response:', error);
              res.status(500).send('Internal Server Error');
            }
          });
        } else {
          // Default: Send the response back to the client
          res.setHeader('Content-Type', proxyRes.headers['content-type']);
          proxyRes.pipe(res);
        }
      },
    });

    // Apply the proxy middleware
    return proxy(req, res, next);
  });
};
