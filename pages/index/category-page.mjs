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

export function createScrollIntentTracker() {
  let version = 0;
  return {
    capture: () => version,
    invalidate: () => {
      version += 1;
    },
    isCurrent: (capturedVersion) => capturedVersion === version,
  };
}

export function getTopLevelCategories(categories = []) {
  const source = Array.isArray(categories) ? categories : [];
  return source.filter((category) => Number(category?.parentId) === 0);
}

export function findInitialCategoryIndex(categories = [], requestedId, allCategories = categories) {
  const id = Number(requestedId);
  if (!Number.isInteger(id) || id <= 0) {
    return 0;
  }

  const categoryIndex = categories.findIndex((category) => Number(category.id) === id);
  if (categoryIndex >= 0) {
    return categoryIndex;
  }

  const linkedCategory = allCategories.find((category) => Number(category?.id) === id);
  const parentIndex = categories.findIndex((category) => Number(category.id) === Number(linkedCategory?.parentId));
  return parentIndex >= 0 ? parentIndex : 0;
}

export function findActiveCategoryIndex(sectionRects = [], scrollRect, scrollTop = 0) {
  if (!Array.isArray(sectionRects) || sectionRects.length === 0 || !scrollRect) {
    return -1;
  }

  let activeIndex = -1;
  sectionRects.forEach((rect, index) => {
    if (rect && rect.top <= scrollRect.top + 24) {
      activeIndex = index;
    }
  });

  const lastRect = sectionRects[sectionRects.length - 1];
  if (Number(scrollTop) > 0 && lastRect && lastRect.bottom <= scrollRect.bottom + 1) {
    return sectionRects.length - 1;
  }
  return activeIndex;
}
