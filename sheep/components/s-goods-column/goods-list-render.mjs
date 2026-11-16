/**
 * Append a page without replacing the arrays that already back rendered cards.
 * Keeping those arrays stable lets Vue and the mini-program renderer retain
 * previously loaded card instances while a new page is committed.
 */
export function appendGoodsToColumns(leftGoods, rightGoods, items = []) {
  const offset = leftGoods.length + rightGoods.length;
  items.forEach((item, index) => {
    (offset + index) % 2 === 0 ? leftGoods.push(item) : rightGoods.push(item);
  });
}

export function appendUniqueGoods(target, items = []) {
  const seenIds = new Set(target.map((item) => String(item.id)));
  const appended = [];
  for (const item of items) {
    if (item?.id == null) continue;
    const id = String(item.id);
    if (seenIds.has(id)) continue;
    seenIds.add(id);
    target.push(item);
    appended.push(item);
  }
  return appended;
}
