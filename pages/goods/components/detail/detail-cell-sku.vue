<template>
  <!-- SKU 选择的提示框 -->
  <detail-cell :label="label" :value="value" />
</template>

<script setup>
  import { computed } from 'vue';
  import detailCell from './detail-cell.vue';

  const props = defineProps({
    modelValue: {
      type: Array,
      default() {
        return [];
      },
    },
    sku: {
      type: Object,
    },
    label: {
      type: String,
      default: '规格',
    },
  });
  const value = computed(() => {
    if (!props.sku?.id) {
      return '选择';
    }
    if (!props.sku.properties?.length) {
      return '选择';
    }
    let str = '';
    props.sku.properties.forEach((property) => {
      str += property.propertyName + ':' + property.valueName + ' ';
    });
    return str;
  });
</script>
