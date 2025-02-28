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

const backendConfigSchema = z.object({
  endpoints: z.object({
    backendURL: z.string().url(),
    backendWSURL: z.string().url(),
    blackListURL: z.string().url(),
    teamsURL: z.string().url(),
    accountsURL: z.string().url(),
    websiteURL: z.string().url(),
  }),
  title: z.string(),
});

export type BackendConfig = z.infer<typeof backendConfigSchema> & {webAppUrl: string};

export const getValidatedBackendConfig = async (url: string): Promise<BackendConfig> => {
  const domainConfigResponse = await fetch(url);
  const domainConfig = await domainConfigResponse.json();
  const parsedDomainConfig = configSchema.parse(domainConfig);

  const backendConfigResponse = await fetch(parsedDomainConfig.config_json_url);
  const backendConfig = await backendConfigResponse.json();
  const parsedBackendConfig = backendConfigSchema.parse(backendConfig);

  return {...parsedBackendConfig, webAppUrl: parsedDomainConfig.webapp_welcome_url};
};
