<script setup>
// Moldura do painel logado: barra superior, avisos, assinaturas de dados e atualização automática.
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { Info, TriangleAlert, X } from "lucide-vue-next";
import BarraTopo from "@/components/layout/BarraTopo.vue";
import PainelPersonalizar from "@/components/personalizar/PainelPersonalizar.vue";
import { aplicarAparencia } from "@/services/aparencia";
import { DEMO } from "@/services/backend";
import { useRelogio } from "@/composables/useRelogio";
import { useDadosStore } from "@/stores/dados";
import { useSessaoStore } from "@/stores/sessao";
import { useUiStore } from "@/stores/ui";

const ATUALIZACAO_MIN = 5;

const router = useRouter();
const sessao = useSessaoStore();
const dados = useDadosStore();
const ui = useUiStore();
const relogio = useRelogio();

const atualizando = ref(false);
const personalizando = ref(false);

// Reassina todas as coleções (útil se a conexão caiu) e atualiza o relógio.
function atualizar() {
  atualizando.value = true;
  ui.limparErro();
  relogio.atualizar();
  dados.iniciar();
  ui.toast("Atualizado");
  setTimeout(() => { atualizando.value = false; }, 600);
}

// Os dados (inclusive a agenda) chegam em tempo real; aqui só renovamos o que depende do relógio.
function atualizarSozinho() {
  if (document.hidden) return;
  relogio.atualizar();
  dados.renovarSeMudouODia();
}

async function sair() {
  if (DEMO) {
    ui.toast("Modo demonstração");
    return;
  }
  await sessao.sair();
}

let timer;
onMounted(() => {
  dados.abrir();
  timer = setInterval(atualizarSozinho, ATUALIZACAO_MIN * 60 * 1000);
  document.addEventListener("visibilitychange", atualizarSozinho);
});
onBeforeUnmount(() => {
  clearInterval(timer);
  document.removeEventListener("visibilitychange", atualizarSozinho);
  dados.parar();
});

// Cores, densidade e cache da aparência, assim que chegam do Firestore
watch(() => dados.aparenciaPronta && dados.aparencia, (ap) => { if (ap) aplicarAparencia(ap); }, { immediate: true });

watch(() => sessao.usuario, (u) => {
  if (!u) router.replace({ name: "login" });
});
</script>

<template>
  <BarraTopo
    :atualizando="atualizando"
    :email="DEMO ? '' : sessao.usuario?.email ?? ''"
    @atualizar="atualizar"
    @sair="sair"
    @personalizar="personalizando = true"
  />

  <main class="wrap">
    <div v-if="DEMO" class="alert info">
      <Info />
      <div class="texto">
        <strong>Modo demonstração.</strong> Os dados são exemplos e nada é salvo.
      </div>
    </div>
    <div v-if="ui.erro" class="alert danger" role="alert">
      <TriangleAlert />
      <div class="texto">{{ ui.erro }}</div>
      <button class="btn ghost icon sm fechar" type="button" aria-label="Fechar aviso" @click="ui.limparErro()"><X /></button>
    </div>

    <RouterView />
  </main>

  <PainelPersonalizar :aberto="personalizando" @fechar="personalizando = false" />
</template>

<style scoped>
.wrap { max-width: 1240px; margin: 0 auto; padding: 26px 20px 56px; }
.wrap > .alert { margin-bottom: var(--gap); }
.fechar { color: inherit; margin: -5px -6px -5px 0; }
@media (max-width: 560px) { .wrap { padding: 18px 12px 40px; } }
</style>
