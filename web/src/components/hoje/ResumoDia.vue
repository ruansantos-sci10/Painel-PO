<script setup>
// Abertura da tela Hoje: capa personalizável, saudação com o seu nome, números do dia e links rápidos.
import { computed } from "vue";
import { CalendarDays, Inbox, ListTodo } from "lucide-vue-next";
import LinksRapidos from "./LinksRapidos.vue";
import { useRelogio } from "@/composables/useRelogio";
import { useDadosStore } from "@/stores/dados";
import { dataPorExtenso, fmtHora, idade, saudacao } from "@/utils/datas";

const dados = useDadosStore();
const { agora, hoje } = useRelogio();

const ap = computed(() => dados.aparencia);
const comCapa = computed(() => ap.value.capa !== "nenhuma");

const titulo = computed(() => {
  const nome = ap.value.nome?.trim();
  return `${saudacao(agora.value)}${nome ? `, ${nome}` : ""}`;
});

const pendencias = computed(() => {
  const total = dados.pendenciasAbertas.length;
  const velhas = dados.pendenciasAbertas.filter((p) => idade(p.entrou_em, agora.value.getTime()).dias >= 2).length;
  return { total, detalhe: total ? (velhas ? `${velhas} há 2+ dias` : "tudo recente") : "tudo em dia", alerta: velhas > 0 };
});

const reunioes = computed(() => {
  const eventos = dados.agenda?.eventos;
  if (!eventos) return null;
  const ms = agora.value.getTime();
  const restantes = eventos.filter((e) => !e.dia_inteiro && new Date(e.fim).getTime() > ms);
  const proxima = restantes.find((e) => new Date(e.inicio).getTime() > ms);
  const agoraEm = restantes.find((e) => new Date(e.inicio).getTime() <= ms);
  let detalhe = "agenda livre";
  if (agoraEm) detalhe = "uma acontecendo agora";
  else if (proxima) detalhe = `próxima às ${fmtHora(proxima.inicio)}`;
  return { total: restantes.length, detalhe };
});

const combinados = computed(() => {
  const abertos = dados.combinados.filter((c) => c.status !== "feito");
  const atrasados = abertos.filter((c) => c.prazo && c.prazo < hoje.value).length;
  const deHoje = abertos.filter((c) => c.prazo === hoje.value).length;
  return {
    total: atrasados + deHoje,
    detalhe: atrasados ? `${atrasados} atrasado${atrasados > 1 ? "s" : ""}` : `${abertos.length} em aberto`,
    alerta: atrasados > 0,
  };
});

// Rolagem até o cartão (as rotas usam "#", então não dá para usar âncoras)
const irPara = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
</script>

<template>
  <section class="hero" :class="[`capa--${ap.capa}`, { 'sem-capa': !comCapa }]">
    <div class="topo">
      <div class="texto">
        <p class="data">{{ dataPorExtenso(agora) }}</p>
        <h1>{{ titulo }} <span v-if="ap.emoji" class="emoji" aria-hidden="true">{{ ap.emoji }}</span></h1>
      </div>
      <LinksRapidos v-if="ap.blocos.links" :vidro="comCapa" />
    </div>

    <div class="numeros">
      <button type="button" class="numero" :class="{ alerta: pendencias.alerta }" @click="irPara('pendencias')">
        <span class="ic"><Inbox /></span>
        <span><strong>{{ dados.carregando ? "–" : pendencias.total }}</strong> aguardando você<small>{{ pendencias.detalhe }}</small></span>
      </button>
      <button v-if="reunioes && ap.blocos.agenda" type="button" class="numero" @click="irPara('agenda')">
        <span class="ic"><CalendarDays /></span>
        <span><strong>{{ reunioes.total }}</strong> {{ reunioes.total === 1 ? "reunião" : "reuniões" }} pela frente<small>{{ reunioes.detalhe }}</small></span>
      </button>
      <button v-if="ap.blocos.combinados" type="button" class="numero" :class="{ alerta: combinados.alerta }" @click="irPara('combinados')">
        <span class="ic"><ListTodo /></span>
        <span><strong>{{ combinados.total }}</strong> {{ combinados.total === 1 ? "combinado" : "combinados" }} para hoje<small>{{ combinados.detalhe }}</small></span>
      </button>
    </div>
  </section>
</template>

<style scoped>
.hero {
  position: relative; overflow: hidden; isolation: isolate;
  border-radius: 22px; padding: 26px 28px 22px; margin-bottom: var(--gap);
  color: #fff; box-shadow: var(--shadow-hover);
}
/* Textura sutil de pontos por cima da capa */
.hero::after {
  content: ""; position: absolute; inset: 0; z-index: -1; pointer-events: none; opacity: .35;
  background-image: radial-gradient(rgba(255, 255, 255, .22) 1px, transparent 1px);
  background-size: 18px 18px;
  mask-image: linear-gradient(to left, #000, transparent 70%);
}
.hero.sem-capa { color: var(--text); border: 1px solid var(--border); box-shadow: var(--shadow); }
.hero.sem-capa::after { display: none; }

.topo { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; flex-wrap: wrap; }
.texto { min-width: 0; }
.data { margin: 0; font-size: 13px; font-weight: 600; letter-spacing: .02em; opacity: .85; }
h1 { margin: 2px 0 0; font-size: 34px; font-weight: 800; letter-spacing: -.025em; line-height: 1.15; }
.emoji { display: inline-block; animation: aceno 1.8s ease-in-out 1; transform-origin: 70% 70%; }
@keyframes aceno { 0%, 60%, 100% { transform: rotate(0); } 10%, 30% { transform: rotate(14deg); } 20%, 40% { transform: rotate(-8deg); } }

.numeros { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 10px; margin-top: 22px; }
.numero {
  display: flex; align-items: center; gap: 12px; padding: 12px 14px; text-align: left; cursor: pointer;
  border-radius: 14px; border: 1px solid rgba(255, 255, 255, .22); color: inherit; font: inherit; font-size: 13.5px;
  background: rgba(255, 255, 255, .12); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
  transition: background .15s, transform .15s;
}
.numero:hover { background: rgba(255, 255, 255, .2); transform: translateY(-1px); }
.numero strong { font-size: 22px; font-weight: 800; margin-right: 2px; letter-spacing: -.02em; }
.numero small { display: block; font-size: 12px; opacity: .8; margin-top: 1px; }
.numero .ic { width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center; background: rgba(255, 255, 255, .18); flex: none; }
.numero .ic :deep(svg) { width: 17px; height: 17px; }
.numero.alerta .ic { background: #fbbf24; color: #422006; }

.sem-capa .numero { border-color: var(--border); background: var(--surface-2); backdrop-filter: none; }
.sem-capa .numero:hover { background: var(--surface-3); }
.sem-capa .numero .ic { background: var(--accent-soft); color: var(--accent-text); }
.sem-capa .numero.alerta .ic { background: var(--warn-soft); color: var(--warn); }
.sem-capa .numero small { color: var(--muted); opacity: 1; }

@media (max-width: 560px) {
  .hero { padding: 20px 16px 16px; border-radius: 18px; }
  h1 { font-size: 26px; }
  /* Celular: os três números lado a lado, só com o essencial */
  .numeros { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-top: 18px; }
  .numero { flex-direction: column; align-items: flex-start; gap: 6px; padding: 10px; font-size: 12px; line-height: 1.25; }
  .numero strong { display: block; font-size: 22px; }
  .numero small { display: none; }
  .numero .ic { width: 28px; height: 28px; border-radius: 8px; }
  .numero .ic :deep(svg) { width: 15px; height: 15px; }
}
</style>
