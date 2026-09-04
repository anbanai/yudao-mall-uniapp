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
      {
        ...spu,
        pointStock: activity.stock,
        pointTotalStock: activity.totalStock,
        point: activity.point,
        pointPrice: activity.price,
        activityId: activity.id,
        activityType,
      },
    ];
  });
}
