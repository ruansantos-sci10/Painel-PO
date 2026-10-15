<script setup>
import { CircleCheck } from "lucide-vue-next";
import { useUiStore } from "@/stores/ui";

const ui = useUiStore();
</script>

<template>
  <Transition name="toast">
    <div v-if="ui.toastMsg" class="toast" role="status">
      <CircleCheck />
      {{ ui.toastMsg }}
    </div>
  </Transition>
</template>

<style scoped>
.toast {
  position: fixed; bottom: 22px; left: 50%; transform: translateX(-50%); z-index: 20;
  display: flex; align-items: center; gap: 8px; max-width: calc(100vw - 32px);
  background: var(--text); color: var(--bg); padding: 10px 16px 10px 13px; border-radius: 12px;
  font-size: 13px; font-weight: 500; box-shadow: var(--shadow-lg);
}
.toast svg { width: 16px; height: 16px; color: var(--ok); flex: none; }
.toast-enter-active, .toast-leave-active { transition: opacity .2s, transform .2s; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translate(-50%, 8px); }
</style>
