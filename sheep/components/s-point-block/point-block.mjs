function getDisplayText(value) {
  return typeof value === 'string' ? value.trim() : value;
}

/**
 * Remove a redundant point-product subtitle without mutating the API response.
 * The goods card falls back from subtitle to introduction, so both fields need
 * to be considered when they duplicate the displayed product title.
 */
export function normalizePointSpu(spu) {
  if (!spu || typeof spu !== 'object') {
    return spu;
  }

  const title = getDisplayText(spu.title || spu.name);
  const subtitle = getDisplayText(spu.subtitle || spu.introduction);
  if (!title || !subtitle || title !== subtitle) {
    return spu;
  }

  const normalized = { ...spu };
  if (getDisplayText(normalized.subtitle) === subtitle) {
    delete normalized.subtitle;
  }
  if (getDisplayText(normalized.introduction) === subtitle) {
    delete normalized.introduction;
  }
  return normalized;
}

export function mergePointActivitiesWithSpus(activities, spus, activityType) {
  if (!Array.isArray(activities) || !Array.isArray(spus)) {
    return [];
  }

  const spuMap = new Map(spus.filter((spu) => spu?.id != null).map((spu) => [String(spu.id), spu]));
  return activities.flatMap((activity) => {
    const spu = spuMap.get(String(activity?.spuId));
    if (!spu) {
      return [];
    }
    return [
      normalizePointSpu({
        ...spu,
        pointStock: activity.stock,
        pointTotalStock: activity.totalStock,
        point: activity.point,
        pointPrice: activity.price,
        activityId: activity.id,
        activityType,
      }),
    ];
  });
}
