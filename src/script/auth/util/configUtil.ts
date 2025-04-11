/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {z} from 'zod';

const configSchema = z.object({
  config_json_url: z.string().url(),
  webapp_welcome_url: z.string().url(),
});

export const getRedirectURL = async (url: string): Promise<string> => {
  const domainConfigResponse = await fetch(url);
  const domainConfig = await domainConfigResponse.json();
  const parsedDomainConfig = configSchema.parse(domainConfig);

  return parsedDomainConfig.webapp_welcome_url;
};
