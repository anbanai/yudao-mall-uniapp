// Every request and async store update belongs to exactly one session epoch.
let epoch = 0;
export const sessionEpoch = () => epoch;
export const invalidateSession = () => ++epoch;
export const isCurrentSession = (value) => value === epoch;
export const staleSessionResult = () => ({ code: 'STALE_SESSION', msg: '账户状态已更新，请重试' });
