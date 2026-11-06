export const DEFAULT_DISPLAY_PRODUCT_COUNT = 6;

export function normalizeDisplayProductCount(value) {
  const count = Number(value);
  return Number.isInteger(count) && count >= 1 && count <= 50
    ? count
    : DEFAULT_DISPLAY_PRODUCT_COUNT;
}

export function buildCategoryProductQuery(category = {}) {
  return {
    categoryId: category.id,
    pageNo: 1,
    pageSize: normalizeDisplayProductCount(category.displayProductCount),
  };
}

export function buildCategoryTree(categories = []) {
  const source = Array.isArray(categories) ? categories : [];
  const childrenByParent = new Map();

  source.forEach((category) => {
    const parentId = String(category?.parentId ?? 0);
    const children = childrenByParent.get(parentId) || [];
    children.push({ ...category });
    childrenByParent.set(parentId, children);
  });

  const buildBranch = (category) => {
    const children = childrenByParent.get(String(category.id)) || [];
    return {
      ...category,
      ...(children.length > 0 ? { children: children.map(buildBranch) } : {}),
    };
  };

  return (childrenByParent.get('0') || []).map(buildBranch);
}
