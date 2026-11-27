// Every request and async store update belongs to exactly one session epoch.
import { ref } from 'vue';
const epoch = ref(0);
export const sessionEpoch = () => epoch.value;
export const invalidateSession = () => ++epoch.value;
export const isCurrentSession = (value) => value === epoch.value;
export const staleSessionResult = () => ({ code: 'STALE_SESSION', msg: '账户状态已更新，请重试' });
