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

import {Request, Router} from 'express';
import {ServerConfig} from '../ServerConfig';

const geolite2 = require('geolite2');
const maxmind = require('maxmind');

function addGeoIP(req: Request) {
  let countryCode = '';

  try {
    const ip = req.header('X-Forwarded-For') || req.ip;
    const lookup = maxmind.openSync(geolite2.paths.country);
    const result = lookup.get(ip);
    if (result) {
      countryCode = result.country.iso_code;
    }
  } catch (error) {
    // It's okay to go without a detected country.
  }

  req.app.locals.country = countryCode;
}

const Root = (config: ServerConfig) => [
  Router().get('/', (req, res) => res.render('index')),
  Router().get('/auth', (req, res) => {
    addGeoIP(req);
    return res.render('auth/index');
  }),
  Router().get('/login', (req, res) => {
    addGeoIP(req);
    return res.render('login/index');
  }),
  Router().get('/demo', (req, res) => res.render('demo/index')),
];

export default Root;
