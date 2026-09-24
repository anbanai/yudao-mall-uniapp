// Every request and async store update belongs to exactly one session epoch.
let epoch = 0;
let phase = 'idle';
export const sessionEpoch = () => epoch;
export const invalidateSession = () => ++epoch;
export const isCurrentSession = (value) => value === epoch;
export const setIdentityPhase = (value) => { phase = value; };
export const isIdentityBlocked = () => phase === 'binding' || phase === 'failed';
export const staleSessionResult = () => ({ code: 'STALE_SESSION', msg: '账户状态已更新，请重试' });
