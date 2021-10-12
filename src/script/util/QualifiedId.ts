export interface QualifiedEntity {
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
export function matchQualifiedIds(entity1: QualifiedEntity, entity2: QualifiedEntity) {
  const idsMatch = entity1.id === entity2.id;
  const domainsMatch = !entity1.domain || !entity2.domain || entity1.domain === entity2.domain;
  return idsMatch && domainsMatch;
}
