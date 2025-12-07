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
import geolite2 from 'geolite2';
import maxmind, {CountryResponse} from 'maxmind';

async function addGeoIP(req: Request) {
  let countryCode = '';

  try {
    const ip = req.header('X-Forwarded-For') || req.ip;
    const lookup = await maxmind.open<CountryResponse>(geolite2.paths.country);
    const result = lookup.get(ip);
    if (result) {
      countryCode = result.country.iso_code;
    }
  } catch (error) {
    // It's okay to go without a detected country.
  }

  req.app.locals.country = countryCode;
}

const Root = () => [
  Router().get('/', (_req, res) => res.render('index')),
  Router().get('/auth', async (req, res) => {
    await addGeoIP(req);
    return res.render('auth/index');
  }),
  Router().get('/unsupported', async (req, res) => {
    await addGeoIP(req);
    return res.render('unsupported/index');
  }),
  Router().get('/login', async (req, res) => {
    await addGeoIP(req);
    return res.render('login/index');
  }),
];

export {Root};
