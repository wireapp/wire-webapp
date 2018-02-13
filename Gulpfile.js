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

const browserSync = require('browser-sync').create();
const concat = require('gulp-concat');
const gulp = require('gulp');
const plumber = require('gulp-plumber');
const sass = require('gulp-sass');

gulp.task('serve', ['sass', 'sass:min'], () => {
  browserSync.init({
    server: '.',
  });
  gulp.watch('scss/**/*.scss', ['sass', 'sass:min']);
  gulp.watch('*.html').on('change', browserSync.reload);
});

gulp.task('sass', () => {
  return gulp
    .src('scss/wire.scss')
    .pipe(plumber())
    .pipe(sass())
    .pipe(gulp.dest('dist'))
    .pipe(browserSync.stream());
});

gulp.task('sass:min', () => {
  return gulp
    .src('scss/wire.scss')
    .pipe(plumber())
    .pipe(sass({outputStyle: 'compressed'}))
    .pipe(concat('wire.min.css'))
    .pipe(gulp.dest('dist'));
});

gulp.task('default', ['serve']);
