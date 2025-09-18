#!/usr/bin/env bash
# Wire
# Copyright (C) 2020 Wire Swiss GmbH
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program. If not, see http://www.gnu.org/licenses/.


#
# This scripts determines the latest published release or prelease version
# of the webapp helm chart returns a semver bump of it on stdout.
#
# If the version in the helm chart source in ./charts/webapp/Chart.yaml
# is greater than the published version it is used in place of the latest
# published version.
#
# Usage: ./bin/chart-next-version.sh <prerelease|release>

set -eo pipefail

readonly bump_type=${1:?"Please specify bump type \"prerelease\" or \"release\""}

# search latest version in helm repo
if [ "$bump_type" = "prerelease" ]; then
  search_args="--devel"
else
  if [ "$bump_type" = "release" ]; then
    search_args=""
  else
    echo 1>&2 "Unknown bump_type $bump_type provided"
    exit 1
  fi
fi
res=$(helm search repo charts-webapp/webapp $search_args)
if [ "$res" == "No results found" ]; then
  echo 1>&2 "Unexpected: no charts found"
  exit 1
else
  version_latest=$(sed -nE '2{s/[^ \t]+[ \t]+([^ \t]+).*/\1/p}' <<< "$res")
  if [ "$(./bin/semver validate "$version_latest")" != "valid" ]; then
    echo 1>&2 "Could not determine version"
    exit 1
  fi
fi

# is hardcoded bigger? if yes then use it instead
version_src=$(yq -Mr '.version' ./charts/webapp/Chart.yaml)
if [ "$(./bin/semver compare "$version_src" "$version_latest")" = "1" ]; then
  echo 1>&2 "Harcoded version $version_src is newer than $version_latest, so using $version_src"
  version_latest="$version_src"
fi

echo 1>&2 "version_latest: $version_latest"

if [ "$bump_type" = "prerelease" ]; then
  if [ "$(./bin/semver get prerelease "$version_latest")" = "" ]; then
    # this is a first prelease
    # so let's create a new release (bump minor)
    # and create a first prerelease for it
    version_next=$(./bin/semver bump minor "$version_latest")
    version_new=$(./bin/semver bump prerelease pre.1 "$version_next")
  else
    version_new=$(./bin/semver bump prerelease "$version_latest")
  fi
else
  version_new=$(./bin/semver bump minor "$version_latest")
fi

echo "$version_new"
