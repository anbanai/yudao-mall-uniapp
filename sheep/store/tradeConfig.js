import { defineStore } from 'pinia';
import TradeConfigApi from '@/sheep/api/trade/config';

let tradeConfigRequest;
const TRADE_CONFIG_CACHE_TTL = 5 * 60 * 1000;

const tradeConfig = defineStore('tradeConfig', {
  state: () => ({
    config: null,
    loaded: false,
    loadedAt: 0,
  }),
  actions: {
    async getTradeConfig() {
      if (this.loaded && Date.now() - this.loadedAt < TRADE_CONFIG_CACHE_TTL) {
        return this.config;
      }
      if (tradeConfigRequest) {
        return tradeConfigRequest;
      }

      tradeConfigRequest = TradeConfigApi.getTradeConfig({ showError: false })
        .then((response) => {
          if (response?.code !== 0) {
            return {};
          }
          this.config = response.data || {};
          this.loaded = true;
          this.loadedAt = Date.now();
          return this.config;
        })
        .catch(() => ({}))
        .finally(() => {
          tradeConfigRequest = undefined;
        });

      return tradeConfigRequest;
    },
  },
});

export default tradeConfig;
