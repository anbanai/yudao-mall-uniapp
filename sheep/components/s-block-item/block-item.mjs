export function resolveDiyProductComponentType(type, data = {}) {
  if (
    type === 'ProductGroup' &&
    Array.isArray(data?.categoryIds) &&
    (!Array.isArray(data?.groupIds) || data.groupIds.length === 0)
  ) {
    return 'ProductCategory';
  }
  return type;
}
