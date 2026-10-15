<script setup>
import { House, LogOut, RefreshCw, Settings } from "lucide-vue-next";
import MarcaPainel from "@/components/ui/MarcaPainel.vue";
import SeletorTema from "./SeletorTema.vue";

defineProps({
  atualizando: { type: Boolean, default: false },
  email: { type: String, default: "" },
});
defineEmits(["atualizar", "sair"]);
</script>

<template>
  <header class="barra">
    <div class="conteudo">
      <RouterLink :to="{ name: 'hoje' }" class="marca">
        <MarcaPainel :tamanho="28" />
        <span>Painel do PO</span>
      </RouterLink>

      <nav class="abas" aria-label="Seções">
        <RouterLink :to="{ name: 'hoje' }" active-class="on"><House /><span>Hoje</span></RouterLink>
        <RouterLink :to="{ name: 'config' }" active-class="on"><Settings /><span>Configurações</span></RouterLink>
      </nav>

      <div class="acoes">
        <span v-if="email" class="email" :title="email">{{ email }}</span>
        <button
          class="btn ghost icon"
          type="button"
          title="Atualizar agora"
          aria-label="Atualizar agora"
          :disabled="atualizando"
          @click="$emit('atualizar')"
        >
          <RefreshCw :class="{ girando: atualizando }" />
        </button>
        <SeletorTema />
        <button class="btn ghost icon" type="button" title="Sair" aria-label="Sair" @click="$emit('sair')">
          <LogOut />
        </button>
      </div>
    </div>
  </header>
</template>

<style scoped>
.barra {
  position: sticky; top: 0; z-index: 10;
  background: color-mix(in srgb, var(--bg) 82%, transparent);
  backdrop-filter: saturate(1.6) blur(12px); -webkit-backdrop-filter: saturate(1.6) blur(12px);
  border-bottom: 1px solid var(--border);
}
.conteudo {
  max-width: 1240px; margin: 0 auto; padding: 0 20px; height: 58px;
  display: flex; align-items: center; gap: 16px;
}
.marca { display: flex; align-items: center; gap: 10px; color: var(--text); font-weight: 650; font-size: 14.5px; letter-spacing: -.01em; }
.marca:hover { text-decoration: none; }

.abas { display: flex; gap: 2px; padding: 3px; margin: 0 auto; background: var(--surface-2); border: 1px solid var(--border); border-radius: 11px; }
.abas a {
  display: flex; align-items: center; gap: 7px; height: 30px; padding: 0 13px; border-radius: 8px;
  color: var(--muted); font-weight: 500; font-size: 13px; transition: color .15s, background .15s;
}
.abas a:hover { color: var(--text); text-decoration: none; }
.abas a.on { background: var(--surface); color: var(--text); box-shadow: var(--shadow-sm), 0 0 0 1px var(--border); }
.abas svg { width: 15px; height: 15px; }

.acoes { display: flex; align-items: center; gap: 2px; }
.email { color: var(--muted); font-size: 12.5px; margin-right: 6px; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.girando { animation: girar .8s linear infinite; }
@keyframes girar { to { transform: rotate(360deg); } }

@media (max-width: 860px) { .email { display: none; } }
@media (max-width: 560px) {
  .conteudo { padding: 0 12px; gap: 8px; }
  .marca span { display: none; }
  .abas a { padding: 0 10px; }
}
@media (max-width: 440px) { .abas a span { display: none; } }
</style>
