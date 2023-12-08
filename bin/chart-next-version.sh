#!/usr/bin/env bash
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

if [ "$bump_type" = "prerelease" ]; then
  search_args="--devel"
  bump_component="prerelease"
else
  if [ "$bump_type" = "release" ]; then
    search_args=""
    bump_component="minor"
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

version_src=$(yq -Mr '.version' ./charts/webapp/Chart.yaml)

if [ "$(./bin/semver compare "$version_src" "$version_latest")" = "1" ]; then
  echo 1>&2 "Harcoded version $version_src is newer $version_latest, so using $version_src"
  version_latest="$version_src"
fi

./bin/semver bump "$bump_component" "$version_latest"
