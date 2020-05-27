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

// https://github.com/gruntjs/grunt-contrib-clean

/* eslint-disable sort-keys-fix/sort-keys-fix */

module.exports = {
  //##############################################################################
  // Local/Test deployment related
  //##############################################################################
  docs: '<%= dir.docs %>',
  docs_coverage: '<%= dir.docs.coverage %>',

  //##############################################################################
  // Amazon Web Services related
  //##############################################################################
  dist: '<%= dir.dist.static %>',
  dist_src: '<%= dir.dist.templates %>/<%= dir.src_ %>',
  dist_s3: '<%= dir.dist.s3 %>',
};
