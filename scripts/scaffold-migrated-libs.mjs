#!/usr/bin/env node
/**
 * Scaffold Nx project.json and update package.json for bulk-migrated libraries.
 */
import {readFileSync, writeFileSync, existsSync} from 'fs';
import {join} from 'path';

const ROOT = '/Users/bardia.rastin/Documents/wire/wire-webapp/libraries';

const PACKAGES = [
  {dir: 'bazinga64', tier: 'standard', passWithNoTests: false},
  {dir: 'certificate-check', tier: 'standard', passWithNoTests: false},
  {dir: 'commons', tier: 'standard', passWithNoTests: false},
  {dir: 'copy-config', tier: 'standard', passWithNoTests: false},
  {dir: 'eslint-config', tier: 'config', passWithNoTests: true},
  {dir: 'license-collector', tier: 'standard', passWithNoTests: true},
  {dir: 'prettier-config', tier: 'config', passWithNoTests: true},
  {dir: 'priority-queue', tier: 'standard', passWithNoTests: false},
  {dir: 'promise-queue', tier: 'standard', passWithNoTests: false},
  {dir: 'store-engine', tier: 'standard', passWithNoTests: false},
  {dir: 'store-engine-dexie', tier: 'standard', passWithNoTests: false},
  {dir: 'store-engine-fs', tier: 'standard', passWithNoTests: false},
  {dir: 'telemetry', tier: 'vite', passWithNoTests: true},
  {dir: 'webapp-events', tier: 'standard', passWithNoTests: true},
];

function nxProjectName(dir) {
  return `${dir}-lib`;
}

function standardProjectJson(dir, {passWithNoTests, buildCommand = 'tsc'}) {
  const name = nxProjectName(dir);
  const lintPath = existsSync(join(ROOT, dir, 'src')) ? '{projectRoot}/src' : '{projectRoot}';
  const project = {
    name,
    $schema: '../../node_modules/nx/schemas/project-schema.json',
    sourceRoot: existsSync(join(ROOT, dir, 'src')) ? '{projectRoot}/src' : '{projectRoot}',
    projectType: 'library',
    targets: {
      clean: {
        executor: 'nx:run-commands',
        options: {command: 'npx rimraf lib', cwd: '{projectRoot}'},
      },
      build: {
        executor: 'nx:run-commands',
        outputs: ['{projectRoot}/lib'],
        dependsOn: ['clean'],
        options: {command: buildCommand, cwd: '{projectRoot}'},
      },
      dist: {
        executor: 'nx:run-commands',
        dependsOn: ['build'],
        options: {command: "echo 'Build complete'"},
      },
      test: {
        executor: '@nx/jest:jest',
        outputs: [`{workspaceRoot}/coverage/libraries/${dir}`],
        options: {
          jestConfig: '{projectRoot}/jest.config.js',
          passWithNoTests,
        },
        configurations: {
          ci: {ci: true, coverage: true, coverageReporters: ['lcov', 'text']},
        },
      },
      'test:coverage': {
        executor: '@nx/jest:jest',
        outputs: [`{workspaceRoot}/coverage/libraries/${dir}`],
        options: {
          jestConfig: '{projectRoot}/jest.config.js',
          passWithNoTests,
          coverage: true,
        },
      },
      lint: {
        executor: 'nx:run-commands',
        options: {
          command: `eslint --config eslint.config.ts --max-warnings=1289 --cache --cache-location node_modules/.cache/eslint/${dir} --ext .js,.ts,.tsx ${lintPath}`,
        },
      },
      'type-check': {
        executor: 'nx:run-commands',
        options: {
          command: 'tsc --project {projectRoot}/tsconfig.json --noEmit',
        },
      },
    },
    tags: ['type:lib', `scope:${dir}`],
  };

  if (dir === 'webapp-events') {
    delete project.targets['test:coverage'];
  }

  return project;
}

function configProjectJson(dir) {
  const name = nxProjectName(dir);
  return {
    name,
    $schema: '../../node_modules/nx/schemas/project-schema.json',
    sourceRoot: '{projectRoot}',
    projectType: 'library',
    targets: {
      build: {
        executor: 'nx:run-commands',
        options: {command: "echo 'No build required'", cwd: '{projectRoot}'},
      },
      lint: {
        executor: 'nx:run-commands',
        options: {
          command: `eslint --config eslint.config.ts --max-warnings=1289 --ext .js,.ts ${'{projectRoot}'}`,
        },
      },
    },
    tags: ['type:lib', `scope:${dir}`],
  };
}

function viteProjectJson(dir) {
  const project = standardProjectJson(dir, {passWithNoTests: true, buildCommand: 'vite build'});
  delete project.targets['type-check'];
  return project;
}

function updatePackageJson(dir, nxName) {
  const pkgPath = join(ROOT, dir, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  pkg.private = true;
  pkg.repository = {
    type: 'git',
    url: 'https://github.com/wireapp/wire-webapp',
    directory: `libraries/${dir}`,
  };
  pkg.scripts = {
    build: `nx run ${nxName}:build`,
    clean: `nx run ${nxName}:clean`,
    dist: `nx run ${nxName}:dist`,
    test: `nx run ${nxName}:test`,
    'test:coverage': `nx run ${nxName}:test:coverage`,
    'test:watch': `nx run ${nxName}:test --watch`,
  };
  if (dir === 'eslint-config' || dir === 'prettier-config') {
    pkg.scripts = {lint: `nx run ${nxName}:lint`};
  }
  if (dir === 'telemetry') {
    pkg.scripts = {
      build: `nx run ${nxName}:build`,
      clean: `nx run ${nxName}:clean`,
      dist: `nx run ${nxName}:dist`,
    };
  }
  if (dir === 'license-collector') {
    delete pkg.scripts.test;
    delete pkg.scripts['test:coverage'];
    delete pkg.scripts['test:watch'];
  }
  if (dir === 'webapp-events') {
    delete pkg.scripts['test:coverage'];
  }
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
}

function fixJestConfig(dir) {
  const jestPath = join(ROOT, dir, 'jest.config.js');
  if (!existsSync(jestPath)) {
    return;
  }
  const name = nxProjectName(dir);
  const content = `/*
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

module.exports = {
  displayName: '${name}',
  testEnvironment: 'node',
  clearMocks: true,
  transform: {
    '^.+\\\\.(ts|tsx)$': '@swc/jest',
    '^.+\\\\.(js|jsx)$': '@swc/jest',
  },
  coverageDirectory: '../../coverage/libraries/${dir}',
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.[jt]s?(x)',
    '<rootDir>/src/**/?(*.)+(spec|test).[jt]s?(x)',
    '<rootDir>/spec/**/*.[jt]s?(x)',
  ],
  moduleFileExtensions: ['js', 'json', 'ts', 'tsx'],
};
`;
  writeFileSync(jestPath, content);
}

function fixTsconfig(dir) {
  const tsPath = join(ROOT, dir, 'tsconfig.json');
  if (!existsSync(tsPath)) {
    return;
  }
  const ts = JSON.parse(readFileSync(tsPath, 'utf8'));
  ts.extends = '../../tsconfig.base.json';
  if (!ts.compilerOptions) {
    ts.compilerOptions = {};
  }
  ts.compilerOptions.esModuleInterop = true;
  if (ts.compilerOptions.outDir === 'lib' || !ts.compilerOptions.outDir) {
    ts.compilerOptions.outDir = 'lib';
  }
  if (existsSync(join(ROOT, dir, 'src'))) {
    ts.compilerOptions.rootDir = 'src';
  }
  ts.compilerOptions.skipLibCheck = true;
  writeFileSync(tsPath, `${JSON.stringify(ts, null, 2)}\n`);
}

for (const pkg of PACKAGES) {
  const {dir, tier, passWithNoTests} = pkg;
  const nxName = nxProjectName(dir);
  let projectJson;
  if (tier === 'config') {
    projectJson = configProjectJson(dir);
  } else if (tier === 'vite') {
    projectJson = viteProjectJson(dir);
  } else {
    projectJson = standardProjectJson(dir, {passWithNoTests});
  }
  writeFileSync(join(ROOT, dir, 'project.json'), `${JSON.stringify(projectJson, null, 2)}\n`);
  updatePackageJson(dir, nxName);
  fixJestConfig(dir);
  fixTsconfig(dir);
  console.log(`Scaffolded ${dir} (${nxName})`);
}
