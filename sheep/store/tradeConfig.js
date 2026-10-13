import { defineStore } from 'pinia';
import TradeConfigApi from '@/sheep/api/trade/config';

let tradeConfigRequest;

const tradeConfig = defineStore('tradeConfig', {
  state: () => ({
    config: null,
    loaded: false,
  }),
  actions: {
    async getTradeConfig() {
      if (this.loaded) {
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
