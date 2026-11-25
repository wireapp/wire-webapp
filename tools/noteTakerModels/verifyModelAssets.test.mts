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

import {mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {readModelManifest, verifyModelAssets, type ModelManifest} from './verifyModelAssets.mts';
import {
  speechModelIds,
  speechModelRevisions,
} from '../../apps/webapp/src/script/repositories/calling/noteTaker/speechModels.ts';

describe('self-hosted note taker model assets', () => {
  let temporaryDirectory: string;
  beforeEach(() => {
    temporaryDirectory = mkdtempSync(path.join(os.tmpdir(), 'note-models-'));
  });
  afterEach(() => {
    rmSync(temporaryDirectory, {recursive: true, force: true});
  });

  it('pins exactly the model revisions used by the browser', () => {
    const loaded = readModelManifest(path.resolve('tools/noteTakerModels/modelManifest.json'));
    expect(loaded.isOk).toBe(true);
    if (loaded.isErr) {
      throw loaded.error;
    }
    expect(
      loaded.value.models
        .map(model => {
          return model.id;
        })
        .toSorted(),
    ).toEqual([...speechModelIds].toSorted());
    for (const model of loaded.value.models) {
      expect(model.revision).toBe(speechModelRevisions[model.id]);
    }
  });

  it('rejects paths escaping the model directory before filesystem access', () => {
    const manifest = JSON.parse(readFileSync('tools/noteTakerModels/modelManifest.json', 'utf8')) as ModelManifest;
    manifest.models[0].files[0].path = '../outside.onnx';
    const filename = path.join(temporaryDirectory, 'manifest.json');
    writeFileSync(filename, JSON.stringify(manifest));
    expect(readModelManifest(filename).isErr).toBe(true);
  });

  it('fails the build for missing files or LFS pointers, and accepts hydrated assets', () => {
    const revision = 'a'.repeat(40);
    const manifest: ModelManifest = {
      models: [
        {
          id: 'tiny',
          repository: 'onnx-community/whisper-tiny',
          revision,
          files: [{path: 'weights.onnx', size: 200, sha256: 'b'.repeat(64)}],
        },
      ],
    };
    const verify = (): ReturnType<typeof verifyModelAssets> => {
      return verifyModelAssets({assetDirectory: temporaryDirectory, manifest});
    };
    expect(verify().isErr).toBe(true);
    const directory = path.join(temporaryDirectory, 'tiny', revision);
    mkdirSync(directory, {recursive: true});
    writeFileSync(path.join(directory, 'weights.onnx'), 'version https://git-lfs.github.com/spec/v1\n');
    const pointer = verify();
    expect(pointer.isErr).toBe(true);
    if (pointer.isErr) {
      expect(pointer.error.message).toContain('git lfs pull');
    }
    writeFileSync(path.join(directory, 'weights.onnx'), Buffer.alloc(200));
    expect(verify().isOk).toBe(true);
  });
});
