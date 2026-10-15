<script setup>
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { Check, Monitor, Moon, Sun } from "lucide-vue-next";
import { useTema } from "@/composables/useTema";

const { tema, definir } = useTema();

const OPCOES = [
  { valor: "sistema", rotulo: "Sistema", icone: Monitor },
  { valor: "claro", rotulo: "Claro", icone: Sun },
  { valor: "escuro", rotulo: "Escuro", icone: Moon },
];
const atual = computed(() => OPCOES.find((o) => o.valor === tema.value) ?? OPCOES[0]);

const aberto = ref(false);
const raiz = ref(null);

function escolher(valor) {
  definir(valor);
  aberto.value = false;
}

// Fecha ao clicar fora ou apertar Esc
const clicarFora = (e) => { if (!raiz.value?.contains(e.target)) aberto.value = false; };
const tecla = (e) => { if (e.key === "Escape") aberto.value = false; };
watch(aberto, (v) => {
  const acao = v ? "addEventListener" : "removeEventListener";
  document[acao]("pointerdown", clicarFora);
  document[acao]("keydown", tecla);
});
onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", clicarFora);
  document.removeEventListener("keydown", tecla);
});
</script>

<template>
  <div ref="raiz" class="seletor">
    <button
      class="btn ghost icon"
      type="button"
      :title="`Tema: ${atual.rotulo}`"
      :aria-label="`Tema: ${atual.rotulo}`"
      aria-haspopup="menu"
      :aria-expanded="aberto"
      @click="aberto = !aberto"
    >
      <component :is="atual.icone" />
    </button>
    <Transition name="menu">
      <div v-if="aberto" class="menu" role="menu" aria-label="Tema">
        <button
          v-for="o in OPCOES"
          :key="o.valor"
          type="button"
          role="menuitemradio"
          :aria-checked="tema === o.valor"
          class="opcao"
          :class="{ on: tema === o.valor }"
          @click="escolher(o.valor)"
        >
          <component :is="o.icone" class="ic" />
          <span>{{ o.rotulo }}</span>
          <Check v-if="tema === o.valor" class="marca" />
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.seletor { position: relative; }
.menu {
  position: absolute; right: 0; top: calc(100% + 6px); z-index: 20; min-width: 160px; padding: 4px;
  background: var(--surface); border: 1px solid var(--border); border-radius: 12px; box-shadow: var(--shadow-lg);
}
.opcao {
  width: 100%; display: flex; align-items: center; gap: 9px; height: 34px; padding: 0 10px;
  border: 0; border-radius: 8px; background: none; color: var(--text-2); font-size: 13px; cursor: pointer; text-align: left;
}
.opcao:hover { background: var(--surface-2); color: var(--text); }
.opcao.on { color: var(--text); font-weight: 600; }
.ic { width: 15px; height: 15px; color: var(--muted); }
.opcao span { flex: 1; }
.marca { width: 15px; height: 15px; color: var(--accent); }
.menu-enter-active, .menu-leave-active { transition: opacity .12s, transform .12s; }
.menu-enter-from, .menu-leave-to { opacity: 0; transform: translateY(-4px); }
</style>
