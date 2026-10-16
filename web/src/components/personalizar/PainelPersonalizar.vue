<script setup>
// Gaveta "Personalizar": tudo o que deixa o painel com a sua cara.
// As escolhas são salvas na hora em config/aparencia (valem em qualquer dispositivo);
// só o tema claro/escuro fica por navegador.
import { nextTick, onBeforeUnmount, ref, watch } from "vue";
import {
  Check, Monitor, Moon, PanelLeft, PanelRight, Rows2, Rows3, RotateCcw, Sun, X,
} from "lucide-vue-next";
import ControleSegmentado from "@/components/ui/ControleSegmentado.vue";
import ToggleSwitch from "@/components/ui/ToggleSwitch.vue";
import { useTema } from "@/composables/useTema";
import { BLOCOS, CAPAS, CORES, EMOJIS } from "@/services/aparencia";
import { useDadosStore } from "@/stores/dados";

const props = defineProps({ aberto: { type: Boolean, default: false } });
const emit = defineEmits(["fechar"]);

const dados = useDadosStore();
const { tema, definir: definirTema } = useTema();

const OPCOES_TEMA = [
  { valor: "sistema", rotulo: "Sistema", icone: Monitor },
  { valor: "claro", rotulo: "Claro", icone: Sun },
  { valor: "escuro", rotulo: "Escuro", icone: Moon },
];
const OPCOES_DENSIDADE = [
  { valor: "confortavel", rotulo: "Confortável", icone: Rows2 },
  { valor: "compacta", rotulo: "Compacta", icone: Rows3 },
];
const OPCOES_LADO = [
  { valor: "esquerda", rotulo: "À esquerda", icone: PanelLeft },
  { valor: "direita", rotulo: "À direita", icone: PanelRight },
];

const salvar = (campos) => dados.setAparencia(campos);

// Nome: salva depois de uma pausa na digitação, para a saudação atualizar sem salvar a cada letra
const nome = ref("");
let timerNome;
watch(() => dados.aparencia.nome, (v) => { if (v !== nome.value.trim()) nome.value = v; }, { immediate: true });
function digitarNome() {
  clearTimeout(timerNome);
  timerNome = setTimeout(() => salvar({ nome: nome.value.trim() }), 500);
}

// Abrir/fechar: foco no botão de fechar, Esc fecha, página de trás não rola
const botaoFechar = ref(null);
const tecla = (e) => { if (e.key === "Escape") emit("fechar"); };
watch(() => props.aberto, async (aberto) => {
  document.body.style.overflow = aberto ? "hidden" : "";
  document[aberto ? "addEventListener" : "removeEventListener"]("keydown", tecla);
  if (aberto) { await nextTick(); botaoFechar.value?.focus(); }
});
onBeforeUnmount(() => {
  document.body.style.overflow = "";
  document.removeEventListener("keydown", tecla);
  clearTimeout(timerNome);
});
</script>

<template>
  <Teleport to="body">
    <Transition name="gaveta">
      <div v-if="aberto" class="fundo" @click.self="emit('fechar')">
        <aside class="gaveta" role="dialog" aria-modal="true" aria-labelledby="titulo-personalizar">
          <header class="topo">
            <div>
              <h2 id="titulo-personalizar">Personalizar</h2>
              <p>Deixe o painel com a sua cara. Tudo é salvo na hora.</p>
            </div>
            <button ref="botaoFechar" class="btn ghost icon" type="button" aria-label="Fechar" @click="emit('fechar')"><X /></button>
          </header>

          <div class="corpo">
            <section>
              <h3>Você</h3>
              <label class="campo">
                <span>Nome para a saudação</span>
                <input v-model="nome" type="text" maxlength="30" placeholder="Seu nome" @input="digitarNome">
              </label>
              <div class="campo">
                <span>Emoji da saudação</span>
                <div class="emojis" role="radiogroup" aria-label="Emoji da saudação">
                  <button
                    v-for="e in EMOJIS"
                    :key="e || 'nenhum'"
                    type="button"
                    role="radio"
                    :aria-checked="dados.aparencia.emoji === e"
                    :class="{ on: dados.aparencia.emoji === e }"
                    :title="e ? e : 'Sem emoji'"
                    @click="salvar({ emoji: e })"
                  >
                    <span v-if="e">{{ e }}</span><X v-else class="sem" />
                  </button>
                </div>
              </div>
            </section>

            <section>
              <h3>Tema</h3>
              <ControleSegmentado :model-value="tema" :opcoes="OPCOES_TEMA" rotulo="Tema" @update:model-value="definirTema" />
              <p class="nota">O tema vale só para este navegador.</p>
            </section>

            <section>
              <h3>Cor de destaque</h3>
              <div class="cores" role="radiogroup" aria-label="Cor de destaque">
                <button
                  v-for="c in CORES"
                  :key="c.id"
                  type="button"
                  role="radio"
                  class="cor"
                  :aria-checked="dados.aparencia.cor_destaque === c.id"
                  :aria-label="c.nome"
                  :title="c.nome"
                  :style="{ '--c': c.hex }"
                  @click="salvar({ cor_destaque: c.id })"
                >
                  <Check v-if="dados.aparencia.cor_destaque === c.id" />
                </button>
              </div>
            </section>

            <section>
              <h3>Capa da tela Hoje</h3>
              <div class="capas" role="radiogroup" aria-label="Capa da tela Hoje">
                <button
                  v-for="c in CAPAS"
                  :key="c.id"
                  type="button"
                  role="radio"
                  class="capa"
                  :aria-checked="dados.aparencia.capa === c.id"
                  :class="{ on: dados.aparencia.capa === c.id }"
                  @click="salvar({ capa: c.id })"
                >
                  <span class="amostra" :class="`capa--${c.id}`"></span>
                  <span class="nome">{{ c.nome }}</span>
                </button>
              </div>
            </section>

            <section>
              <h3>Cores dos times</h3>
              <div v-for="t in dados.times" :key="t.time" class="time">
                <span class="nome-time"><span class="dot" :class="`t${t.time}`"></span>{{ t.nome }}</span>
                <div class="cores mini" role="radiogroup" :aria-label="`Cor do ${t.nome}`">
                  <button
                    v-for="c in CORES"
                    :key="c.id"
                    type="button"
                    role="radio"
                    class="cor"
                    :aria-checked="dados.aparencia.cores_times[t.time] === c.id"
                    :aria-label="c.nome"
                    :title="c.nome"
                    :style="{ '--c': c.hex }"
                    @click="salvar({ cores_times: { [t.time]: c.id } })"
                  >
                    <Check v-if="dados.aparencia.cores_times[t.time] === c.id" />
                  </button>
                </div>
              </div>
            </section>

            <section>
              <h3>Tela Hoje</h3>
              <div class="blocos">
                <div v-for="b in BLOCOS" :key="b.id" class="bloco">
                  <span>{{ b.nome }}</span>
                  <ToggleSwitch
                    :model-value="dados.aparencia.blocos[b.id]"
                    :rotulo="`Mostrar ${b.nome}`"
                    @update:model-value="salvar({ blocos: { [b.id]: $event } })"
                  />
                </div>
              </div>
              <div class="campo">
                <span>Coluna de pendências</span>
                <ControleSegmentado
                  :model-value="dados.aparencia.pendencias_lado"
                  :opcoes="OPCOES_LADO"
                  rotulo="Coluna de pendências"
                  @update:model-value="salvar({ pendencias_lado: $event })"
                />
              </div>
              <div class="campo">
                <span>Densidade</span>
                <ControleSegmentado
                  :model-value="dados.aparencia.densidade"
                  :opcoes="OPCOES_DENSIDADE"
                  rotulo="Densidade"
                  @update:model-value="salvar({ densidade: $event })"
                />
              </div>
            </section>
          </div>

          <footer class="rodape">
            <button class="btn ghost sm" type="button" @click="dados.restaurarAparencia()"><RotateCcw /> Restaurar padrão</button>
            <span><Check /> Salvo automaticamente</span>
          </footer>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fundo {
  position: fixed; inset: 0; z-index: 30; display: flex; justify-content: flex-end;
  background: rgba(8, 10, 15, .38); backdrop-filter: blur(2px);
}
.gaveta {
  width: min(440px, 100vw); height: 100%; display: flex; flex-direction: column;
  background: var(--surface); border-left: 1px solid var(--border); box-shadow: var(--shadow-lg);
}
.topo { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 20px 20px 14px; border-bottom: 1px solid var(--border); }
.topo h2 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -.02em; }
.topo p { margin: 2px 0 0; font-size: 13px; color: var(--muted); }

.corpo { flex: 1; overflow-y: auto; padding: 6px 20px 20px; }
section { padding: 16px 0; border-bottom: 1px solid var(--border); }
section:last-child { border-bottom: 0; }
h3 { margin: 0 0 10px; font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: var(--muted); }
.campo { display: grid; gap: 6px; margin-top: 12px; }
.campo:first-of-type { margin-top: 0; }
.campo > span { font-size: 12.5px; font-weight: 500; color: var(--text-2); }
.nota { margin: 8px 0 0; font-size: 12px; color: var(--muted); }

.emojis { display: flex; gap: 6px; flex-wrap: wrap; }
.emojis button {
  width: 40px; height: 40px; border-radius: 12px; border: 1px solid var(--border); background: var(--surface-2);
  font-size: 19px; cursor: pointer; display: grid; place-items: center; transition: transform .12s, border-color .15s;
}
.emojis button:hover { transform: translateY(-1px); }
.emojis button.on { border-color: var(--accent); box-shadow: var(--ring); background: var(--accent-soft); }
.emojis .sem { width: 16px; height: 16px; color: var(--faint); }

.cores { display: flex; flex-wrap: wrap; gap: 8px; }
.cor {
  width: 30px; height: 30px; border-radius: 50%; border: 0; cursor: pointer; display: grid; place-items: center;
  background: var(--c); color: #fff; box-shadow: inset 0 0 0 1px rgba(0, 0, 0, .12);
  transition: transform .12s;
}
.cor:hover { transform: scale(1.1); }
.cor[aria-checked="true"] { box-shadow: 0 0 0 2px var(--surface), 0 0 0 4px var(--c); }
.cor svg { width: 15px; height: 15px; stroke-width: 3; }
.cores.mini .cor { width: 24px; height: 24px; }
.cores.mini .cor svg { width: 12px; height: 12px; }

.capas { display: grid; grid-template-columns: repeat(auto-fill, minmax(116px, 1fr)); gap: 10px; }
.capa { border: 0; background: none; padding: 0; cursor: pointer; text-align: left; color: var(--text-2); }
.amostra {
  display: block; height: 58px; border-radius: 12px; border: 1px solid var(--border);
  transition: transform .15s, box-shadow .15s;
}
.capa:hover .amostra { transform: translateY(-2px); }
.capa.on .amostra { box-shadow: 0 0 0 2px var(--surface), 0 0 0 4px var(--accent); }
.capa .nome { display: block; margin-top: 6px; font-size: 12.5px; font-weight: 600; }
.amostra.capa--nenhuma { background: repeating-linear-gradient(135deg, var(--surface-2) 0 8px, var(--surface) 8px 16px); }

.time { display: grid; gap: 8px; padding: 6px 0 10px; }
.nome-time { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; }

.blocos { display: grid; gap: 2px; margin-bottom: 14px; }
.bloco { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 0; font-size: 13.5px; font-weight: 500; }

.rodape {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 12px 20px; border-top: 1px solid var(--border); background: var(--surface-2);
}
.rodape > span { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; color: var(--ok); font-weight: 600; }
.rodape > span svg { width: 14px; height: 14px; }

.gaveta-enter-active, .gaveta-leave-active { transition: opacity .2s ease; }
.gaveta-enter-active .gaveta, .gaveta-leave-active .gaveta { transition: transform .25s cubic-bezier(.2, .8, .2, 1); }
.gaveta-enter-from, .gaveta-leave-to { opacity: 0; }
.gaveta-enter-from .gaveta, .gaveta-leave-to .gaveta { transform: translateX(32px); }
</style>
