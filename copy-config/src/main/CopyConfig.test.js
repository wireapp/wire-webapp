"use strict";
/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
//@ts-check
const path_1 = __importDefault(require("path"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const _1 = require(".");
const utils = __importStar(require("./utils"));
const TEMP_DIR = path_1.default.resolve(__dirname, '..', '..', '.temp');
describe('CopyConfig', () => {
    afterEach(() => fs_extra_1.default.remove(TEMP_DIR));
    describe('constructor', () => {
        it('can be configured using environment variables', async () => {
            process.env.WIRE_CONFIGURATION_EXTERNAL_DIR = 'externalDir';
            process.env.WIRE_CONFIGURATION_FILES = `./spec/helpers/**:${TEMP_DIR};./spec/helpers/test1.txt:[${TEMP_DIR}/test1.txt,${TEMP_DIR}/test2.txt]`;
            const copyConfig = new _1.CopyConfig({
                files: {},
                repositoryUrl: '',
            });
            // @ts-ignore
            expect(copyConfig.options.externalDir.endsWith('externalDir')).toBe(true);
            // @ts-ignore
            expect(copyConfig.options.files).toEqual({
                './spec/helpers/**': TEMP_DIR,
                './spec/helpers/test1.txt': [`${TEMP_DIR}/test1.txt`, `${TEMP_DIR}/test2.txt`],
            });
            delete process.env.WIRE_CONFIGURATION_EXTERNAL_DIR;
            delete process.env.WIRE_CONFIGURATION_FILES;
        });
    });
    describe('copy', () => {
        it('copies a single file', async () => {
            const copyConfig = new _1.CopyConfig({
                externalDir: '.',
                files: {
                    './spec/helpers/test1.txt': `${TEMP_DIR}/test1.txt`,
                },
                repositoryUrl: '',
            });
            const copiedResult = await copyConfig.copy();
            expect(copiedResult.length).toBe(1);
            const copiedFiles = fs_extra_1.default.readdirSync(TEMP_DIR);
            expect(copiedFiles.includes('test1.txt')).toBe(true);
        });
        it('copies dot files', async () => {
            const copyConfig = new _1.CopyConfig({
                externalDir: '.',
                files: {
                    './spec/helpers/.env.test': `${TEMP_DIR}/.env`,
                },
                repositoryUrl: '',
            });
            const copiedResult = await copyConfig.copy();
            expect(copiedResult.length).toBe(1);
        });
        it('copies all files', async () => {
            const copyConfig = new _1.CopyConfig({
                externalDir: '.',
                files: {
                    './spec/helpers/**': TEMP_DIR,
                },
                repositoryUrl: '',
            });
            const copiedResult = await copyConfig.copy();
            expect(copiedResult.length).toBe(1 + 1);
            const copiedFiles = fs_extra_1.default.readdirSync(TEMP_DIR);
            expect(copiedFiles.includes('test1.txt')).toBe(true);
            expect(copiedFiles.includes('test2.txt')).toBe(true);
        });
        it('reports errors', async () => {
            const copyConfig = new _1.CopyConfig({
                externalDir: '.',
                files: {
                    'non-existant': TEMP_DIR,
                },
                repositoryUrl: '',
            });
            try {
                await copyConfig.copy();
                throw new Error('Should throw');
            }
            catch (error) {
                expect(error.code).toBe('ENOENT');
            }
        });
        it('overwrites destination files', async () => {
            await fs_extra_1.default.ensureDir(TEMP_DIR);
            await fs_extra_1.default.writeFile(path_1.default.join(TEMP_DIR, 'test1.txt'), '');
            const copyConfig = new _1.CopyConfig({
                externalDir: '.',
                files: {
                    './spec/helpers/test1.txt': `${TEMP_DIR}/test1.txt`,
                },
                repositoryUrl: '',
            });
            const copiedResult = await copyConfig.copy();
            expect(copiedResult.length).toBe(1);
        });
        it('downloads zip archives from an https url', async () => {
            await fs_extra_1.default.ensureDir(TEMP_DIR);
            await fs_extra_1.default.writeFile(path_1.default.join(TEMP_DIR, 'test1.txt'), '');
            const HTTPS_URL = 'https://github.com/wireapp/wire-web-config-default#master';
            const ZIP_URL = 'https://github.com/wireapp/wire-web-config-default/archive/master.zip';
            const copyConfig = new _1.CopyConfig({
                files: {
                    './package.json': TEMP_DIR,
                },
                forceDownload: true,
                repositoryUrl: HTTPS_URL,
            });
            jest.spyOn(utils, 'downloadFileAsync').mockReturnValue(Promise.resolve());
            jest.spyOn(copyConfig, 'copyDirOrFile').mockReturnValue(Promise.resolve([]));
            await copyConfig.copy();
            expect(utils.downloadFileAsync).toHaveBeenCalledWith(ZIP_URL, expect.any(String));
        });
    });
    it('downloads zip archives from a git url', async () => {
        await fs_extra_1.default.ensureDir(TEMP_DIR);
        await fs_extra_1.default.writeFile(path_1.default.join(TEMP_DIR, 'test1.txt'), '');
        const GIT_URL = 'git@github.com:wireapp/wire-web-config-default#master';
        const ZIP_URL = 'https://github.com/wireapp/wire-web-config-default/archive/master.zip';
        const copyConfig = new _1.CopyConfig({
            files: {
                './package.json': TEMP_DIR,
            },
            forceDownload: true,
            repositoryUrl: GIT_URL,
        });
        jest.spyOn(utils, 'downloadFileAsync').mockReturnValue(Promise.resolve());
        jest.spyOn(copyConfig, 'copyDirOrFile').mockReturnValue(Promise.resolve([]));
        await copyConfig.copy();
        expect(utils.downloadFileAsync).toHaveBeenCalledWith(ZIP_URL, expect.any(String));
    });
    describe('getFilesFromString', () => {
        it('is compatible with Windows paths', () => {
            const copyString = 'C:\\source:D:\\target';
            const copyConfig = new _1.CopyConfig({
                externalDir: '.',
                files: {},
                repositoryUrl: '',
            });
            // @ts-ignore
            const resolvedPaths = copyConfig.getFilesFromString(copyString);
            expect(Object.keys(resolvedPaths)[0]).toBe('C:\\source');
            expect(Object.values(resolvedPaths)[0]).toBe('D:\\target');
        });
    });
});
//# sourceMappingURL=CopyConfig.test.js.map