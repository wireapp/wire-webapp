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
 */

import {match, P} from 'ts-pattern';
import {Maybe, Result} from 'true-myth';

export type RspackSmokeBuildVariant = 'internal' | 'public';

export type RspackSmokeServerOptions = {
  readonly buildVariant: RspackSmokeBuildVariant;
  readonly port: number;
};

export type RspackSmokeServerArgumentsError =
  {readonly kind: 'unknownOption'; readonly optionName: string} | {readonly kind: 'invalidArguments'};

type ParsedRspackSmokeServerArguments = {
  readonly buildVariant: Maybe<string>;
  readonly port: Maybe<string>;
};

const firstPortNumber = 1;
const lastPortNumber = 65_535;

function isValidPort(port: number): boolean {
  return Number.isInteger(port) && port >= firstPortNumber && port <= lastPortNumber;
}

export function parseRspackSmokeServerOptions(
  argumentValues: readonly string[],
): Result<RspackSmokeServerOptions, RspackSmokeServerArgumentsError> {
  let parsedArguments: Result<ParsedRspackSmokeServerArguments, RspackSmokeServerArgumentsError> = Result.ok({
    buildVariant: Maybe.nothing(),
    port: Maybe.nothing(),
  });

  for (let argumentIndex = 0; argumentIndex < argumentValues.length; argumentIndex += 1) {
    const optionName = Maybe.of(argumentValues[argumentIndex]).unwrapOr('');
    const optionValue = Maybe.of(argumentValues[argumentIndex + 1]);

    parsedArguments = parsedArguments.andThen(parsedArgumentValues => {
      return match(optionName)
        .with('--variant', () => {
          argumentIndex += 1;

          return Result.ok({...parsedArgumentValues, buildVariant: optionValue});
        })
        .with('--port', () => {
          argumentIndex += 1;

          return Result.ok({...parsedArgumentValues, port: optionValue});
        })
        .otherwise(unknownOption => {
          return Result.err({kind: 'unknownOption', optionName: unknownOption});
        });
    });
  }

  return parsedArguments.andThen(parsedArgumentValues => {
    const validatedOptions = parsedArgumentValues.buildVariant.andThen(buildVariant => {
      return parsedArgumentValues.port.andThen(portValue => {
        const parsedPort = Number(portValue);

        return match([buildVariant, parsedPort] as const)
          .with(['internal', P.when(isValidPort)], ([validBuildVariant, validPort]) => {
            return Maybe.just({buildVariant: validBuildVariant, port: validPort});
          })
          .with(['public', P.when(isValidPort)], ([validBuildVariant, validPort]) => {
            return Maybe.just({buildVariant: validBuildVariant, port: validPort});
          })
          .otherwise(() => {
            return Maybe.nothing<RspackSmokeServerOptions>();
          });
      });
    });

    return validatedOptions.match({
      Just: options => {
        return Result.ok(options);
      },
      Nothing: () => {
        return Result.err({kind: 'invalidArguments'});
      },
    });
  });
}
