<template>
  <s-layout title="退货物流">
    <view class="apply-return">
      <view v-if="state.shipment && state.shipment.status" class="shipment-card borRadius14">
        <view class="shipment-title ss-flex ss-row-between">
          <text>上门取件</text>
          <text class="shipment-status">{{ statusText(state.shipment.status) }}</text>
        </view>
        <view class="shipment-row" v-if="state.shipment.provider"
          >服务商：{{ state.shipment.provider }}</view
        >
        <view class="shipment-row" v-if="state.shipment.waybillNo"
          >运单号：{{ state.shipment.waybillNo }}</view
        >
        <view class="shipment-row" v-if="state.shipment.appointmentTime"
          >预约时间：{{ state.shipment.appointmentTime }}</view
        >
        <view class="shipment-row"
          >费用承担：{{ feePayerText(state.shipment.feePayer)
          }}<text v-if="state.shipment.actualFee"
            >（￥{{ fen2yuan(state.shipment.actualFee) }}）</text
          ></view
        >
        <view class="trace-link" @tap="showTraces">查看物流轨迹</view>
        <button v-if="canCancelShipment" class="cancel-btn ss-reset-button" @tap="cancelShipment"
          >取消取件</button
        >
      </view>

      <view
        v-if="
          !state.shipment || !state.shipment.status || state.shipment.status === 'CREATE_FAILED'
        "
        class="list borRadius14"
      >
        <view class="pickup-hint">顺丰上门取件，填写信息后即可预约</view>
        <view class="item acea-row row-between-wrapper" style="display: flex; align-items: center">
          <view>取件地址</view>
          <view v-if="state.addresses.length" style="flex: 1">
            <picker
              mode="selector"
              :value="state.addressIndex"
              :range="state.addresses"
              range-key="addressText"
              @change="bindAddressChange"
            >
              <view
                class="picker acea-row row-between-wrapper"
                style="display: flex; justify-content: space-between"
              >
                <view class="reason">{{ state.addresses[state.addressIndex].addressText }}</view>
                <text class="iconfont _icon-forward" />
              </view>
            </picker>
          </view>
          <view v-else class="address-empty" @tap="chooseAddress">请选择地址</view>
        </view>
        <view class="item textarea acea-row row-between" style="display: flex; align-items: center">
          <view>联系人</view>
          <input v-model="state.contactName" placeholder="请输入联系人" class="num" />
        </view>
        <view class="item textarea acea-row row-between" style="display: flex; align-items: center">
          <view>手机号</view>
          <input
            v-model="state.contactMobile"
            type="number"
            maxlength="11"
            placeholder="请输入手机号"
            class="num"
          />
        </view>
        <view class="item textarea acea-row row-between" style="display: flex; align-items: center">
          <view>包裹重量</view>
          <input v-model="state.weight" type="digit" placeholder="请输入重量（kg）" class="num" />
        </view>
        <view class="item acea-row row-between-wrapper" style="display: flex; align-items: center">
          <view>预约日期</view>
          <picker
            mode="date"
            :value="state.appointmentDate"
            :start="state.minDate"
            @change="(e) => (state.appointmentDate = e.detail.value)"
          >
            <view class="picker">{{ state.appointmentDate || '请选择日期' }}</view>
          </picker>
        </view>
        <view class="item acea-row row-between-wrapper" style="display: flex; align-items: center">
          <view>预约时间</view>
          <picker
            mode="time"
            :value="state.appointmentTime"
            @change="(e) => (state.appointmentTime = e.detail.value)"
          >
            <view class="picker">{{ state.appointmentTime || '请选择时间' }}</view>
          </picker>
        </view>
        <view class="estimate" v-if="state.preview"
          >预计费用：{{ feePayerText(state.preview.feePayer)
          }}<text v-if="state.preview.estimatedFee"
            >，约 ￥{{ fen2yuan(state.preview.estimatedFee) }}</text
          ></view
        >
        <button
          class="returnBnt bg-color ss-reset-button ui-BG-Main-Gradient sub-btn"
          :loading="state.submitting"
          :disabled="state.submitting"
          @tap="createShipment"
          >预约顺丰上门取件</button
        >
        <view class="manual-entry" @tap="state.showManual = !state.showManual"
          >无法上门取件？填写其他物流单号</view
        >
      </view>

      <view
        v-if="state.showManual || (state.shipment && state.shipment.status === 'CREATE_FAILED')"
        class="list borRadius14 manual-list"
      >
        <view class="manual-title">人工寄回</view>
        <form @submit="subRefund" report-submit="true">
          <view
            class="item acea-row row-between-wrapper"
            style="display: flex; align-items: center"
          >
            <view>物流公司</view>
            <view v-if="state.expresses.length > 0" style="flex: 1">
              <picker
                mode="selector"
                class="num"
                @change="bindPickerChange"
                :value="state.expressIndex"
                :range="state.expresses"
                range-key="name"
              >
                <view
                  class="picker acea-row row-between-wrapper"
                  style="display: flex; justify-content: space-between"
                >
                  <view class="reason">{{ state.expresses[state.expressIndex].name }}</view>
                  <text class="iconfont _icon-forward" />
                </view>
              </picker>
            </view>
          </view>
          <view
            class="item textarea acea-row row-between"
            style="display: flex; align-items: center"
          >
            <view>物流单号</view>
            <input
              placeholder="请填写物流单号"
              class="num"
              name="logisticsNo"
              placeholder-class="placeholder"
            />
          </view>
          <button
            class="returnBnt bg-color ss-reset-button ui-BG-Main-Gradient sub-btn"
            form-type="submit"
            style="
              background: linear-gradient(
                90deg,
                var(--ui-BG-Main),
                var(--ui-BG-Main-gradient)
              ) !important;
            "
            >提交物流单号</button
          >
        </form>
      </view>
    </view>
  </s-layout>
</template>

<script setup>
  import { onLoad, onUnload } from '@dcloudio/uni-app';
  import { computed, reactive } from 'vue';
  import sheep from '@/sheep';
  import AfterSaleApi from '@/sheep/api/trade/afterSale';
  import DeliveryApi from '@/sheep/api/trade/delivery';
  import AddressApi from '@/sheep/api/member/address';

  const state = reactive({
    id: 0, // 售后编号
    expressIndex: 0, // 选中的 expresses 下标
    expresses: [], // 可选的快递列表
    addresses: [],
    addressIndex: 0,
    preview: null,
    shipment: null,
    weight: '1',
    contactName: '',
    contactMobile: '',
    appointmentDate: '',
    appointmentTime: '',
    minDate: new Date().toISOString().slice(0, 10),
    submitting: false,
    showManual: false,
    requestNo: '',
  });

  const selectedAddress = computed(() => state.addresses[state.addressIndex] || {});
  const canCancelShipment = computed(() =>
    ['CREATING', 'PICKUP_PENDING'].includes(state.shipment?.status),
  );

  function fen2yuan(value) {
    return ((Number(value) || 0) / 100).toFixed(2);
  }

  function statusText(status) {
    return (
      {
        CREATING: '创建中',
        UNKNOWN: '处理中',
        PICKUP_PENDING: '待取件',
        PICKED_UP: '已揽收',
        IN_TRANSIT: '运输中',
        DELIVERED: '已签收',
        CREATE_FAILED: '创建失败',
        CANCELLED: '已取消',
        EXCEPTION: '异常',
      }[status] ||
      status ||
      '未知'
    );
  }

  function feePayerText(value) {
    return (
      {
        MERCHANT: '商家承担',
        BUYER_PAY_ON_DELIVERY: '用户到付',
        BUYER_DEDUCT_REFUND: '从退款扣除',
        USER_PAY: '用户到付',
        REFUND_DEDUCT: '从退款扣除',
      }[value] ||
      value ||
      '以实际结算为准'
    );
  }

  function bindPickerChange(e) {
    state.expressIndex = e.detail.value;
  }

  async function subRefund(e) {
    let data = {
      id: state.id,
      logisticsId: state.expresses[state.expressIndex].id,
      logisticsNo: e.detail.value.logisticsNo,
    };
    const { code } = await AfterSaleApi.deliveryAfterSale(data);
    if (code !== 0) {
      return;
    }
    await sheep.$store('user').refreshOrderCount();
    uni.showToast({
      title: '填写退货成功',
    });
    sheep.$router.go('/pages/order/aftersale/detail', { id: state.id });
  }

  function normalizeAddress(item) {
    const name = item.name || item.consignee || item.receiverName || '';
    const mobile = item.mobile || item.receiverMobile || '';
    const addressText =
      item.addressText ||
      [item.provinceName, item.cityName, item.districtName, item.detailAddress || item.address]
        .filter(Boolean)
        .join(' ');
    return { ...item, name, mobile, addressText };
  }

  async function loadPickup() {
    const addressRes = await AddressApi.getAddressList();
    if (addressRes.code === 0) {
      state.addresses = (addressRes.data || []).map(normalizeAddress);
      const defaultIndex = state.addresses.findIndex((item) => item.defaultStatus);
      state.addressIndex = defaultIndex >= 0 ? defaultIndex : 0;
      state.contactName = selectedAddress.value.name || '';
      state.contactMobile = selectedAddress.value.mobile || '';
    }
    try {
      const previewRes = await AfterSaleApi.previewReturnShipment(state.id);
      if (previewRes.code === 0) {
        state.preview = previewRes.data || {};
        const previewAddressIndex = state.addresses.findIndex(
          (item) =>
            item.detailAddress &&
            state.preview.pickupAddress &&
            item.detailAddress === state.preview.pickupAddress,
        );
        if (previewAddressIndex >= 0) {
          state.addressIndex = previewAddressIndex;
          state.contactName = selectedAddress.value.name || '';
          state.contactMobile = selectedAddress.value.mobile || '';
        }
        state.weight = String(state.preview.defaultWeight || state.preview.packageWeight || 1);
        if (state.preview.appointmentTime) {
          state.appointmentDate = String(state.preview.appointmentTime).slice(0, 10);
          state.appointmentTime = String(state.preview.appointmentTime).slice(11, 16);
        }
      }
    } catch {
      state.preview = null;
    }
    try {
      const shipmentRes = await AfterSaleApi.getReturnShipment(state.id);
      if (shipmentRes.code === 0) state.shipment = shipmentRes.data;
    } catch {
      state.shipment = null;
    }
  }

  function bindAddressChange(e) {
    state.addressIndex = Number(e.detail.value);
    state.contactName = selectedAddress.value.name || '';
    state.contactMobile = selectedAddress.value.mobile || '';
  }

  function chooseAddress() {
    sheep.$router.go('/pages/user/address/list', { type: 'select' });
  }

  async function createShipment() {
    if (!selectedAddress.value.id) {
      sheep.$helper.toast('请选择取件地址');
      return;
    }
    if (!(Number(state.weight) > 0)) {
      sheep.$helper.toast('请输入有效的包裹重量');
      return;
    }
    if (!state.contactName || !/^1\d{10}$/.test(state.contactMobile)) {
      sheep.$helper.toast('请填写正确的联系人和手机号');
      return;
    }
    if (!state.appointmentDate || !state.appointmentTime) {
      sheep.$helper.toast('请选择预约取件时间');
      return;
    }
    state.submitting = true;
    if (!state.requestNo) {
      state.requestNo = `mini-${state.id}-${Date.now()}`;
      uni.setStorageSync(`return-shipment-request-${state.id}`, state.requestNo);
    }
    const address = selectedAddress.value;
    try {
      const { code, data } = await AfterSaleApi.createReturnShipment(state.id, {
        requestNo: state.requestNo,
        addressId: address.id,
        contactName: state.contactName,
        contactMobile: state.contactMobile,
        provinceName: address.provinceName,
        cityName: address.cityName,
        districtName: address.districtName,
        detailAddress: address.detailAddress || address.address,
        packageWeight: Number(state.weight),
        appointmentTime: `${state.appointmentDate}T${state.appointmentTime}:00`,
      });
      if (code !== 0) {
        state.showManual = true;
        state.requestNo = '';
        uni.removeStorageSync(`return-shipment-request-${state.id}`);
        sheep.$helper.toast('上门取件创建失败，请填写其他物流单号');
        return;
      }
      state.shipment = data || {};
      if (state.shipment.status === 'CREATE_FAILED') {
        state.showManual = true;
        state.requestNo = '';
        uni.removeStorageSync(`return-shipment-request-${state.id}`);
        sheep.$helper.toast('上门取件创建失败，请填写其他物流单号');
        return;
      }
      if (state.shipment.status === 'UNKNOWN') {
        sheep.$helper.toast('正在确认取件结果，请稍后查看状态');
        return;
      }
      state.requestNo = '';
      uni.removeStorageSync(`return-shipment-request-${state.id}`);
      uni.showToast({ title: '预约成功' });
    } catch (error) {
      state.showManual = true;
      sheep.$helper.toast('上门取件创建失败，请填写其他物流单号');
    } finally {
      state.submitting = false;
    }
  }

  async function cancelShipment() {
    const result = await uni.showModal({ title: '提示', content: '确定取消本次上门取件吗？' });
    if (!result.confirm) return;
    const { code } = await AfterSaleApi.cancelReturnShipment(state.id);
    if (code === 0) {
      state.shipment = { ...state.shipment, status: 'CANCELLED' };
      uni.showToast({ title: '已取消' });
    }
  }

  async function showTraces() {
    const { code, data } = await AfterSaleApi.getReturnShipmentTraces(state.id);
    if (code !== 0) return;
    const traces = data || [];
    if (!traces.length) {
      sheep.$helper.toast('暂无物流轨迹');
      return;
    }
    uni.showModal({
      title: '物流轨迹',
      content: traces
        .map(
          (item) =>
            `${item.occurredTime || item.operateTime || item.time || ''} ${
              item.description || item.content || ''
            }`,
        )
        .join('\n'),
      showCancel: false,
    });
  }

  // 获得快递物流列表
  async function getExpressList() {
    const { code, data } = await DeliveryApi.getDeliveryExpressList();
    if (code !== 0) {
      return;
    }
    state.expresses = data;
  }

  onLoad((options) => {
    if (!options.id) {
      sheep.$helper.toast(`缺少订单信息，请检查`);
      return;
    }
    state.id = options.id;
    state.requestNo = uni.getStorageSync(`return-shipment-request-${state.id}`) || '';
    // 获得快递物流列表
    getExpressList();
    loadPickup();
    uni.$on('SELECT_ADDRESS', onAddressSelected);
  });

  function onAddressSelected(event = {}) {
    if (!event.addressInfo) return;
    const address = normalizeAddress(event.addressInfo);
    const index = state.addresses.findIndex((item) => item.id === address.id);
    if (index >= 0) state.addressIndex = index;
    else {
      state.addresses.push(address);
      state.addressIndex = state.addresses.length - 1;
    }
    state.contactName = address.name || '';
    state.contactMobile = address.mobile || '';
  }

  onUnload(() => uni.$off('SELECT_ADDRESS', onAddressSelected));
</script>
<style lang="scss" scoped>
  .apply-return {
    padding: 20rpx 30rpx 70rpx 30rpx;
  }

  .shipment-card,
  .apply-return .list {
    background-color: #fff;
    margin-top: 18rpx;
    padding: 24rpx;
  }

  .shipment-title {
    font-size: 32rpx;
    font-weight: 500;
    color: #333;
    padding-bottom: 16rpx;
  }

  .shipment-status {
    color: var(--ui-BG-Main);
    font-size: 26rpx;
  }

  .shipment-row,
  .estimate,
  .pickup-hint {
    color: #666;
    font-size: 26rpx;
    line-height: 44rpx;
  }

  .trace-link,
  .manual-entry {
    color: var(--ui-BG-Main);
    font-size: 26rpx;
    margin-top: 14rpx;
  }

  .cancel-btn {
    color: #666;
    border: 1rpx solid #ddd;
    border-radius: 30rpx;
    padding: 0 24rpx;
    line-height: 56rpx;
    font-size: 26rpx;
    margin: 18rpx 0 0;
  }

  .manual-title {
    color: #333;
    font-size: 30rpx;
    margin-bottom: 10rpx;
  }

  .manual-list {
    padding-bottom: 40rpx !important;
  }

  .apply-return .list:not(.manual-list) {
    padding-bottom: 32rpx;
  }

  .apply-return .list .item {
    min-height: 90rpx;
    border-bottom: 1rpx solid #eee;
    font-size: 30rpx;
    color: #333;
  }

  .apply-return .list .item .num {
    color: #282828;
    margin-left: 27rpx;
    // width: 227rpx;
    // text-align: right;
  }

  .apply-return .list .item .num .picker .reason {
    width: 385rpx;
  }

  .apply-return .list .item .num .picker .iconfont {
    color: #666;
    font-size: 30rpx;
    margin-top: 2rpx;
  }

  .apply-return .list .item.textarea {
    padding: 24rpx 0;
  }

  .apply-return .list .item textarea {
    height: 100rpx;
    font-size: 30rpx;
  }

  .apply-return .list .item .placeholder {
    color: #bbb;
  }

  .apply-return .list .item .title {
    height: 95rpx;
    width: 100%;
  }

  .apply-return .list .item .title .tip {
    font-size: 30rpx;
    color: #bbb;
  }

  .apply-return .list .item .upload {
    padding-bottom: 36rpx;
  }

  .apply-return .list .item .upload .pictrue {
    border-radius: 14rpx;
    margin: 22rpx 23rpx 0 0;
    width: 156rpx;
    height: 156rpx;
    position: relative;
    font-size: 24rpx;
    color: #bbb;
  }

  .apply-return .list .item .upload .pictrue:nth-of-type(4n) {
    margin-right: 0;
  }

  .apply-return .list .item .upload .pictrue image {
    width: 100%;
    height: 100%;
    border-radius: 14rpx;
  }

  .apply-return .list .item .upload .pictrue .icon-guanbi1 {
    position: absolute;
    font-size: 45rpx;
    top: -10rpx;
    right: -10rpx;
  }

  .apply-return .list .item .upload .pictrue .icon-icon25201 {
    color: #bfbfbf;
    font-size: 50rpx;
  }

  .apply-return .list .item .upload .pictrue:nth-last-child(1) {
    border: 1rpx solid #ddd;
    box-sizing: border-box;
  }

  .apply-return .returnBnt {
    font-size: 32rpx;
    color: #fff;
    width: 100%;
    height: 86rpx;
    border-radius: 50rpx;
    text-align: center;
    line-height: 86rpx;
    margin: 43rpx auto;
  }
</style>
