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

import compression from 'compression';
import type {NextFunction, Request, RequestHandler, Response} from 'express';

export function createResponseCompression(): RequestHandler {
  const compressResponse = compression();

  return function compressAllowedEncoding(request: Request, response: Response, next: NextFunction): void {
    const selectedEncoding = request.acceptsEncodings('gzip', 'deflate', 'identity');
    // compression also supports Brotli; restrict its negotiation to our allowed encodings.
    request.headers['accept-encoding'] = selectedEncoding === false ? 'identity' : selectedEncoding;
    compressResponse(request, response, next);
  };
}
