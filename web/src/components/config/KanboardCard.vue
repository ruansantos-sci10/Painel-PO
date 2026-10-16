<script setup>
import { computed, ref, watch } from "vue";
import { Copy, SquareKanban } from "lucide-vue-next";
import PainelCard from "@/components/ui/PainelCard.vue";
import { useDadosStore } from "@/stores/dados";
import { useUiStore } from "@/stores/ui";

const dados = useDadosStore();
const ui = useUiStore();

const coluna = ref("");
const webApp = ref("");
watch(() => dados.config.coluna_po, (v) => { coluna.value = v ?? ""; }, { immediate: true });
watch(() => dados.config.url_web_app, (v) => { webApp.value = v ?? ""; }, { immediate: true });

const salvarColuna = () => dados.setConfig("coluna_po", coluna.value.trim(), "Coluna salva");

function salvarWebApp() {
  const url = webApp.value.trim().replace(/\?.*$/, "");
  if (url && !/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(url)) {
    ui.toast("Cole a URL do web app (termina em /exec)");
    return;
  }
  dados.setConfig("url_web_app", url, "URL salva");
}

// Endereço que vai na ação automática do Kanboard
const urlWebhook = computed(() => (dados.config.url_web_app ? `${dados.config.url_web_app}?token=SEU-TOKEN` : null));

async function copiar() {
  try {
    await navigator.clipboard.writeText(urlWebhook.value);
    ui.toast("URL copiada");
  } catch {
    ui.toast("Não foi possível copiar");
  }
}
</script>

<template>
  <PainelCard titulo="Kanboard" :icone="SquareKanban" tom="sky" descricao="Como o painel reconhece os cards que chegam para você.">
    <label class="rotulo" for="cfg-coluna">Nome da coluna do PO (exatamente como aparece na mensagem)</label>
    <form class="form-row campo" @submit.prevent="salvarColuna">
      <input id="cfg-coluna" v-model="coluna" type="text">
      <button class="btn primary" type="submit">Salvar</button>
    </form>

    <label class="rotulo bloco" for="cfg-webapp">URL do web app do Apps Script</label>
    <form class="form-row campo" @submit.prevent="salvarWebApp">
      <input id="cfg-webapp" v-model="webApp" type="url" placeholder="https://script.google.com/macros/s/…/exec">
      <button class="btn" type="submit">Salvar</button>
    </form>

    <template v-if="urlWebhook">
      <div class="rotulo bloco">URL do webhook para o Kanboard</div>
      <div class="url">
        <code>{{ urlWebhook }}</code>
        <button class="btn icon sm" type="button" title="Copiar" aria-label="Copiar URL do webhook" @click="copiar"><Copy /></button>
      </div>
      <p class="help nota">Troque <code>SEU-TOKEN</code> pela propriedade <code>WEBHOOK_TOKEN</code> do Apps Script.</p>
    </template>
  </PainelCard>
</template>

<style scoped>
.rotulo { display: block; font-size: 12px; font-weight: 500; color: var(--muted); margin-top: 6px; }
.rotulo.bloco { margin-top: 18px; }
.campo { margin-top: 6px; }
.url { display: flex; align-items: center; gap: 6px; margin-top: 6px; }
.url code { flex: 1; min-width: 0; padding: 7px 10px; border-radius: 9px; word-break: break-all; font-size: 11.5px; }
.nota { margin: 8px 0 0; }
</style>
