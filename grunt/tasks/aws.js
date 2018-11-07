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

const path = require('path');

module.exports = grunt => {
  grunt.registerTask('aws_deploy', () => {
    grunt.task.run('init');

    grunt.option('target' || grunt.config('gitinfo.local.branch.current.name'));
    grunt.task.run('prepare');
    const version = grunt.option('version');

    grunt.config('aws.deploy.options.version', version);
    grunt.config(
      'aws.deploy.options.application_versions',
      'https://eu-west-1.console.aws.amazon.com/elasticbeanstalk/home?region=eu-west-1#/application/versions?applicationName=Webapp'
    );
    grunt.task.run('aws_prepare', 'aws_s3:default', 'shell:aws_deploy', 'open:ebs');
  });

  grunt.registerTask('aws_version_file', () => grunt.file.write(path.join('aws', 'version'), grunt.option('version')));

  grunt.registerTask('aws_prepare', [
    'aws_version_file',
    'clean:aws',
    'copy:aws',
    'clean:aws_app',
    'clean:aws_s3',
    'shell:aws_pack',
    'compress:aws',
  ]);
};
