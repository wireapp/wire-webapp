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

import is from '@sindresorhus/is';
import {Maybe, Result, toolbelt} from 'true-myth';

export type ParseMinimumRequiredClientBuildDateDependencies = {
  readonly parseClientVersion: (clientVersionHeaderValue: string) => Result<Date, Error>;
  readonly clientVersion: Maybe<string>;
  readonly deployedClientVersion: string;
};

function getInvalidDeployedClientVersionError(
  minimumRequiredClientBuildDateValue: string,
  deployedClientVersion: string,
): Error {
  return new Error(
    `Ignoring MINIMUM_REQUIRED_CLIENT_BUILD_DATE="${minimumRequiredClientBuildDateValue}" because deployed client version "${deployedClientVersion}" is invalid.`,
  );
}

function getMinimumRequiredClientBuildDateNewerThanDeployedClientVersionError(
  minimumRequiredClientBuildDateValue: string,
  deployedClientVersion: string,
): Error {
  return new Error(
    `Ignoring MINIMUM_REQUIRED_CLIENT_BUILD_DATE="${minimumRequiredClientBuildDateValue}" because it is newer than deployed client version "${deployedClientVersion}".`,
  );
}

export function parseMinimumRequiredClientBuildDate(
  dependencies: ParseMinimumRequiredClientBuildDateDependencies,
): Result<Maybe<Date>, Error> {
  const {parseClientVersion, clientVersion, deployedClientVersion} = dependencies;
  const minimumRequiredClientBuildDateValue = clientVersion.unwrapOr('');

  if (is.emptyString(minimumRequiredClientBuildDateValue)) {
    return Result.ok(Maybe.nothing());
  }

  const parsedMinimumRequiredClientBuildDate = toolbelt.fromResult(
    parseClientVersion(minimumRequiredClientBuildDateValue),
  );

  if (parsedMinimumRequiredClientBuildDate.isNothing) {
    return Result.ok(Maybe.nothing());
  }

  const parsedDeployedClientVersion = toolbelt.fromResult(parseClientVersion(deployedClientVersion));

  if (parsedDeployedClientVersion.isNothing) {
    return Result.err(getInvalidDeployedClientVersionError(minimumRequiredClientBuildDateValue, deployedClientVersion));
  }

  const isMinimumRequiredClientBuildDateNewerThanDeployedClientVersion =
    parsedMinimumRequiredClientBuildDate.value.getTime() > parsedDeployedClientVersion.value.getTime();

  if (isMinimumRequiredClientBuildDateNewerThanDeployedClientVersion) {
    return Result.err(
      getMinimumRequiredClientBuildDateNewerThanDeployedClientVersionError(
        minimumRequiredClientBuildDateValue,
        deployedClientVersion,
      ),
    );
  }

  return Result.ok(parsedMinimumRequiredClientBuildDate);
}
