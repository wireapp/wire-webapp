#!/usr/bin/env bash
#
# Print the next SemVer prelease of ./charts/webapp/ on stdout
# The version is dermined by looking which prereleases are already published
# in the helm repo named 'charts-webapp'
#
# Prints also some debugging information on stderr

set -eo pipefail

version_src=$(yq -Mr '.version' ./charts/webapp/Chart.yaml)

prerelease_src=$(./bin/semver get prerelease "$version_src")
if [ "$prerelease_src" != "" ]; then
  echo 1>&2 "Cannot have prelease in Chart.yaml"
  exit 1
fi

echo 1>&2 "version_src: $version_src"

version_next=$(./bin/semver bump patch "$version_src")

echo 1>&2 "version_next: $version_next"

res=$(helm search repo charts-webapp/webapp -l --version "> $version_next-pre0")
if [ "$res" == "No results found" ]; then
  version_last_prerelease="$version_next-pre0"
else
  # echo "$res"
  # echo ----------
  version_last_prerelease=$(sed -nE '2{s/[^ \t]+[ \t]+([^ \t]+).*/\1/p}' <<< "$res")
  if [ "$(./bin/semver validate "$version_last_prerelease")" != "valid" ]; then
    echo 1>&2 "Could not determine last_prerelease prerelease"
    exit 1
  fi
fi

echo 1>&2 "version_last_prerelease: $version_last_prerelease"

version_next_prerelease=$(./bin/semver bump prerelease "$version_last_prerelease")

echo 1>&2 "version_next_prerelease: $version_next_prerelease"

echo "$version_next_prerelease"
