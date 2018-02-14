/*
 * Wire
 * Copyright (C) 2016 Wire Swiss GmbH
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

const assets = require('gulp-bower-assets');
const bower = require('gulp-bower');
const browserSync = require('browser-sync').create();
const clean = require('gulp-clean');
const gulp = require('gulp');
const gutil = require('gulp-util');
const karma = require('karma');
const runSequence = require('run-sequence');

// Aliases
gulp.task('c', ['clean']);
gulp.task('i', ['install']);
gulp.task('t', ['test']);

// Tasks
gulp.task('clean', ['clean_browser', 'clean_node'], () => {});

gulp.task('clean_browser', () => gulp.src('dist/window').pipe(clean()));

gulp.task('clean_node', () => gulp.src('dist/commonjs').pipe(clean()));

gulp.task('default', ['dist'], () => {
  gulp.watch('dist/**/*.*').on('change', browserSync.reload);

  browserSync.init({
    port: 3636,
    server: {baseDir: './'},
    startPath: '/dist',
  });
});

gulp.task('dist', done => {
  runSequence('clean', 'install', done);
});

gulp.task('install', ['install_bower_assets'], () => {});

gulp.task('install_bower', () => bower({cmd: 'install'}));

gulp.task('install_bower_assets', ['install_bower'], () =>
  gulp
    .src('bower_assets.json')
    .pipe(
      assets({
        prefix(name, prefix) {
          return `${prefix}/${name}`;
        },
      })
    )
    .pipe(gulp.dest('dist/lib'))
);

gulp.task('test', done => {
  done();
});

gulp.task('test_browser', done => {
  const filePosition = 4;

  gutil.log(gutil.colors.yellow('Running tests in Google Chrome:'));
  const file = process.argv[filePosition];

  const server = new karma.Server(
    {
      configFile: `${__dirname}/karma.conf.js`,
      files: [
        // Libraries
        {included: true, nocache: true, pattern: 'dist/lib/dynamic/**/*.js', served: true},
        // Application
        'dist/window/**/*.js',
        // Tests
        file ? `test/${file}` : 'test/**/*Spec.{browser,common}.js',
      ],
      logLevel: file ? 'debug' : 'info',
    },
    done
  );

  server.start();
});
