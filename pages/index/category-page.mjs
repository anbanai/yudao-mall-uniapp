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

export function getSecondLevelCategories(categories = []) {
  const source = Array.isArray(categories) ? categories : [];
  const rootIds = new Set(
    source
      .filter((category) => Number(category?.parentId) === 0)
      .map((category) => Number(category.id)),
  );
  return source.filter((category) => rootIds.has(Number(category?.parentId)));
}

export function findInitialCategoryIndex(categories = [], requestedId) {
  const id = Number(requestedId);
  if (!Number.isInteger(id) || id <= 0) {
    return 0;
  }

  const categoryIndex = categories.findIndex((category) => Number(category.id) === id);
  if (categoryIndex >= 0) {
    return categoryIndex;
  }

  const childIndex = categories.findIndex((category) => Number(category.parentId) === id);
  return childIndex >= 0 ? childIndex : 0;
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
