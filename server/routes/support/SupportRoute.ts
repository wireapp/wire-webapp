/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

const SupportRoute = () => [
  Router().get('/support', (_req, res) => res.render('support/index')),
  Router().get('/support/page1', (_req, res) => res.render('support/page1')),
  Router().get('/support/page2', (_req, res) => res.render('support/page2')),
  Router().get('/support/page3', (_req, res) => res.render('support/page3')),
];

export {SupportRoute};
