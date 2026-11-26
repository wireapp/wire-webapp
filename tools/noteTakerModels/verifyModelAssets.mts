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

import {result, type Result} from 'true-myth';
import {z} from 'zod';

import {readFileSync, statSync} from 'node:fs';
import path from 'node:path';

const supportedModelCount = 3;
const manifestSchema = z
  .object({
    models: z
      .array(
        z.object({
          id: z.enum(['tiny', 'base', 'small']),
          repository: z.string().regex(/^onnx-community\/whisper-(tiny|base|small)$/),
          revision: z.string().regex(/^[a-f0-9]{40}$/),
          files: z
            .array(
              z.object({
                path: z
                  .string()
                  .regex(/^[a-zA-Z0-9_./-]+$/)
                  .refine(value => {
                    return (
                      !value.startsWith('/') &&
                      !value.split('/').some(part => {
                        return part === '..' || part === '.';
                      })
                    );
                  }),
                size: z.number().int().positive(),
                sha256: z.string().regex(/^[a-f0-9]{64}$/),
              }),
            )
            .min(1),
        }),
      )
      .length(supportedModelCount),
  })
  .refine(manifest => {
    return (
      new Set(
        manifest.models.map(model => {
          return model.id;
        }),
      ).size === supportedModelCount
    );
  });
export type ModelManifest = z.infer<typeof manifestSchema>;

export function readModelManifest(filename: string): Result<ModelManifest, Error> {
  const decoded = result.tryOrElse(
    error => {
      return new Error(String(error));
    },
    () => {
      return JSON.parse(readFileSync(filename, 'utf8')) as unknown;
    },
  );
  if (decoded.isErr) {
    return result.err(decoded.error);
  }
  const parsed = manifestSchema.safeParse(decoded.value);
  if (!parsed.success) {
    return result.err(new Error('Invalid note taker model manifest'));
  }
  if (
    parsed.data.models.some(model => {
      return model.repository !== `onnx-community/whisper-${model.id}`;
    })
  ) {
    return result.err(new Error('Model repository does not match its model ID'));
  }
  return result.ok(parsed.data);
}

export function verifyModelAssets({
  assetDirectory,
  manifest,
}: {
  assetDirectory: string;
  manifest: ModelManifest;
}): Result<void, Error> {
  for (const model of manifest.models) {
    for (const file of model.files) {
      const filename = path.join(assetDirectory, model.id, model.revision, file.path);
      const size = result.tryOrElse(
        error => {
          return new Error(String(error));
        },
        () => {
          return statSync(filename).size;
        },
      );
      if (size.isErr || size.value !== file.size) {
        return result.err(
          new Error(
            `Missing, incomplete or unhydrated model asset: ${filename}. Run git lfs pull --include="apps/webapp/assets/noteTakerModels/**" before building.`,
          ),
        );
      }
    }
  }
  return result.ok(undefined);
}

export function verifyCommittedModelAssets({workspaceDirectory}: {workspaceDirectory: string}): void {
  const manifest = readModelManifest(path.join(workspaceDirectory, 'tools/noteTakerModels/modelManifest.json'));
  if (manifest.isErr) {
    throw manifest.error;
  }
  const verified = verifyModelAssets({
    assetDirectory: path.join(workspaceDirectory, 'apps/webapp/assets/noteTakerModels'),
    manifest: manifest.value,
  });
  if (verified.isErr) {
    throw verified.error;
  }
}
