interface QualifiedEntity {
  [index: string]: any;
  domain?: string;
  id: string;
}

export function matchQualifiedIds(entity1: QualifiedEntity, entity2: QualifiedEntity) {
  return entity1.id === entity2.id && entity1.domain === entity2.domain;
}
