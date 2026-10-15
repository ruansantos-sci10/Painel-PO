<script setup>
// Moldura do painel logado: barra superior, avisos, assinaturas de dados e atualização automática.
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Info, TriangleAlert, X } from "lucide-vue-next";
import BarraTopo from "@/components/layout/BarraTopo.vue";
import { DEMO } from "@/services/backend";
import { useRelogio } from "@/composables/useRelogio";
import { useAgendaStore } from "@/stores/agenda";
import { useDadosStore } from "@/stores/dados";
import { useSessaoStore } from "@/stores/sessao";
import { useUiStore } from "@/stores/ui";

const ATUALIZACAO_MIN = 5;

const route = useRoute();
const router = useRouter();
const sessao = useSessaoStore();
const dados = useDadosStore();
const agenda = useAgendaStore();
const ui = useUiStore();
const relogio = useRelogio();

const atualizando = ref(false);

async function atualizar() {
  atualizando.value = true;
  ui.limparErro();
  relogio.atualizar();
  dados.iniciar();
  try {
    if (route.name === "hoje") await agenda.carregar(true);
    ui.toast("Atualizado");
  } finally {
    atualizando.value = false;
  }
}

// Os dados chegam em tempo real; aqui só renovamos o que depende do relógio e a agenda.
function atualizarSozinho() {
  if (document.hidden) return;
  relogio.atualizar();
  dados.renovarSeMudouODia();
  if (route.name === "hoje") agenda.carregar();
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
  />

  <main class="wrap">
    <div v-if="DEMO" class="alert info">
      <Info />
      <div class="texto">
        <strong>Modo demonstração.</strong> Os dados são exemplos e nada é salvo.
        Preencha <code>web/src/firebase.config.js</code> para conectar ao seu Firebase.
      </div>
    </div>
    <div v-if="ui.erro" class="alert danger" role="alert">
      <TriangleAlert />
      <div class="texto">{{ ui.erro }}</div>
      <button class="btn ghost icon sm fechar" type="button" aria-label="Fechar aviso" @click="ui.limparErro()"><X /></button>
    </div>

    <RouterView />
  </main>
</template>

<style scoped>
.wrap { max-width: 1240px; margin: 0 auto; padding: 26px 20px 56px; }
.fechar { color: inherit; margin: -5px -6px -5px 0; }
@media (max-width: 560px) { .wrap { padding: 18px 12px 40px; } }
</style>
