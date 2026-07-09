<!-- SignalStrength.vue -->
<template>
  <svg class="signal" viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet"
       :aria-label="`信号强度 ${level}/4`">
    <rect v-for="(h, i) in bars" :key="i"
          :x="2 + i * 6" y="22 - h" width="4" :height="h"
          :fill="i < level ? activeColor : '#dcdfe6'"
          rx="1" :class="{ 'bar-pulse': i < level && pulse }" />
  </svg>
</template>

<script setup>
defineProps({
  level: { type: Number, default: 0 },   // 0-4
  pulse: { type: Boolean, default: true },
  activeColor: { type: String, default: '#67c23a' }
})
const bars = [6, 10, 14, 18]             // 四根柱子的高度
</script>

<style scoped>
.signal { width: 100%; height: 100%; max-width: 32px; }
.bar-pulse { transform-box: fill-box; transform-origin: bottom;
  animation: breathe 1.6s ease-in-out infinite; }
@keyframes breathe {
  0%, 100% { opacity: 1; transform: scaleY(1); }
  50%      { opacity: 0.55; transform: scaleY(0.85); }
}
</style>