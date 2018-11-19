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

'use strict';

module.exports = {
  aws_deploy: {
    command:
      'aws elasticbeanstalk create-application-version --application-name Webapp --version-label <%= grunt.config("aws.deploy.options.version") %> --source-bundle S3Bucket="wire-webapp",S3Key="<%= grunt.config("aws.deploy.options.version") %>.zip" --auto-create-application',
    options: {
      stdout: true,
    },
  },
  aws_pack: {
    command: 'yarn && yarn bundle:prod',
    options: {
      stdout: true,
    },
  },
  less: {
    command: 'yarn build:style',
    options: {
      stdout: true,
    },
  },
};
