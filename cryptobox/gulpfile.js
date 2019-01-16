/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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
const clean = require('gulp-clean');
const gulp = require('gulp');
const runSequence = require('run-sequence');
const {spawn} = require('child_process');

// Tasks
gulp.task('clean_browser', () => gulp.src('dist/window', {allowEmpty: true}).pipe(clean()));

gulp.task('clean_node', () => gulp.src('dist/commonjs', {allowEmpty: true}).pipe(clean()));

gulp.task(
  'clean',
  gulp.series('clean_browser', 'clean_node', done => {
    done();
  })
);

gulp.task('dist', done => runSequence('clean', 'install', done));

gulp.task('install_bower', done => {
  const child = spawn('npx bower', ['install'], {shell: true, stdio: 'inherit'});
  child.on('exit', done);
});

gulp.task(
  'install_bower_assets',
  gulp.series('install_bower', () => {
    return gulp
      .src('bower_assets.json')
      .pipe(
        assets({
          prefix(name, prefix) {
            return `${prefix}/${name}`;
          },
        })
      )
      .pipe(gulp.dest('dist/lib'));
  })
);

gulp.task(
  'install',
  gulp.series('install_bower_assets', done => {
    done();
  })
);
