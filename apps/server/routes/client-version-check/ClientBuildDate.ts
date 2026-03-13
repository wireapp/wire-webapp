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

import {Maybe, Result, toolbelt} from 'true-myth';

export type ParseMinimumRequiredClientBuildDateDependencies = {
  readonly parseClientVersion: (clientVersionHeaderValue: string) => Result<Date, Error>;
  readonly clientVersion?: string | undefined;
  readonly deployedClientVersion?: string | undefined;
  readonly logInvalidMinimumRequiredClientBuildDate?: (message: string) => void;
};

export function parseMinimumRequiredClientBuildDate(
  dependencies: ParseMinimumRequiredClientBuildDateDependencies,
): Maybe<Date> {
  const {parseClientVersion, clientVersion, deployedClientVersion, logInvalidMinimumRequiredClientBuildDate} =
    dependencies;

  if (clientVersion === undefined || clientVersion.length === 0) {
    return Maybe.nothing();
  }

  const parsedMinimumRequiredClientBuildDate = toolbelt.fromResult(parseClientVersion(clientVersion));

  if (parsedMinimumRequiredClientBuildDate.isNothing) {
    return Maybe.nothing();
  }

  if (deployedClientVersion === undefined || deployedClientVersion.length === 0) {
    return parsedMinimumRequiredClientBuildDate;
  }

  const parsedDeployedClientVersion = toolbelt.fromResult(parseClientVersion(deployedClientVersion));

  if (parsedDeployedClientVersion.isNothing) {
    logInvalidMinimumRequiredClientBuildDate?.(
      `Ignoring MINIMUM_REQUIRED_CLIENT_BUILD_DATE="${clientVersion}" because deployed client version "${deployedClientVersion}" is invalid.`,
    );

    return Maybe.nothing();
  }

  const isMinimumRequiredClientBuildDateNewerThanDeployedClientVersion =
    parsedMinimumRequiredClientBuildDate.value.getTime() > parsedDeployedClientVersion.value.getTime();

  if (isMinimumRequiredClientBuildDateNewerThanDeployedClientVersion) {
    logInvalidMinimumRequiredClientBuildDate?.(
      `Ignoring MINIMUM_REQUIRED_CLIENT_BUILD_DATE="${clientVersion}" because it is newer than deployed client version "${deployedClientVersion}".`,
    );

    return Maybe.nothing();
  }

  return parsedMinimumRequiredClientBuildDate;
}
