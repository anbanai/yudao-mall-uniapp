import { getGoodsSubtitle, getGoodsTitle } from '../s-goods-column/goods-column.mjs';

/**
 * Remove a redundant point-product subtitle without mutating the API response.
 * The goods card falls back from subtitle to introduction, so both fields need
 * to be considered when they duplicate the displayed product title.
 */
export function normalizePointSpu(spu) {
  if (!spu || typeof spu !== 'object') {
    return spu;
  }

  const title = getGoodsTitle(spu);
  const subtitle = getGoodsSubtitle(spu);
  if (!title || !subtitle || title !== subtitle) {
    return spu;
  }

  const normalized = { ...spu };
  if (getGoodsSubtitle({ subtitle: normalized.subtitle }) === subtitle) {
    delete normalized.subtitle;
  }
  if (getGoodsSubtitle({ introduction: normalized.introduction }) === subtitle) {
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
