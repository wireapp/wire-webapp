/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import type {RequestHandler} from 'express';

// Only versioned weights are immutable. Other assets keep their existing cache policy.
export const cacheLongpipeModels = (fallback: RequestHandler): RequestHandler => {
  return (req, res, next) => {
    if (/^\/assets\/longpipe\/models\/v\d+\.\d+\.\d+\/model_(xs|small|medium|large)(\.f16)?\.bin$/.test(req.path)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      next();
      return;
    }
    fallback(req, res, next);
  };
};
