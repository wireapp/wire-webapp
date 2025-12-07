/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

interface QualifiedEntity {
  [index: string]: any;
  domain: string | null;
  id: string;
}

/**
 * Will match the domain and id of the entities given.
 * If one of the entities has a `null` domain then it will fallback to only comparing ids
 *
 * @param entity1 - The first entity to compare
 * @param entity2 - The second entity to compare
 * @return boolean - do the entities match
 */
export function matchQualifiedIds(entity1?: QualifiedEntity, entity2?: QualifiedEntity) {
  if (!entity1 || !entity2) {
    return false;
  }

  const idsMatch = entity1.id === entity2.id;
  const domainsMatch = !entity1.domain || !entity2.domain || entity1.domain === entity2.domain;
  return idsMatch && domainsMatch;
}
