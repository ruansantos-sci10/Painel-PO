<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { Lock, Mail } from "lucide-vue-next";
import MarcaPainel from "@/components/ui/MarcaPainel.vue";
import { abaSalva } from "@/utils/abas";
import { useSessaoStore } from "@/stores/sessao";

const router = useRouter();
const sessao = useSessaoStore();

const email = ref("");
const senha = ref("");
const erro = ref("");
const entrando = ref(false);

async function entrar() {
  erro.value = "";
  entrando.value = true;
  try {
    await sessao.entrar(email.value.trim(), senha.value);
    router.replace({ name: abaSalva() });
  } catch (e) {
    erro.value = e.message;
  } finally {
    entrando.value = false;
  }
}
</script>

<template>
  <main class="pagina">
    <div class="login">
      <MarcaPainel :tamanho="52" />
      <h1>Painel do <strong>PO</strong></h1>
      <p class="muted">Entre com o usuário criado no Firebase.</p>

      <form @submit.prevent="entrar">
        <label class="campo">
          <Mail />
          <input v-model="email" type="email" placeholder="E-mail" autocomplete="username" required>
        </label>
        <label class="campo">
          <Lock />
          <input v-model="senha" type="password" placeholder="Senha" autocomplete="current-password" required>
        </label>
        <p v-if="erro" class="erro" role="alert">{{ erro }}</p>
        <button class="btn primary entrar" type="submit" :disabled="entrando">
          {{ entrando ? "Entrando…" : "Entrar" }}
        </button>
      </form>
    </div>
  </main>
</template>

<style scoped>
.pagina {
  min-height: 100vh; display: grid; place-items: center; padding: 24px 16px;
  background:
    radial-gradient(600px 300px at 50% 0%, color-mix(in srgb, var(--accent) 14%, transparent), transparent 70%),
    var(--bg);
}
.login {
  width: 100%; max-width: 380px; background: var(--surface); border: 1px solid var(--border);
  border-radius: 20px; padding: 32px 28px 28px; box-shadow: var(--shadow-lg);
}
h1 { margin: 18px 0 4px; font-size: 24px; font-weight: 600; letter-spacing: -.02em; }
h1 strong { font-weight: 800; color: var(--accent-text); }
.muted { margin: 0; font-size: 13.5px; }
form { display: grid; gap: 10px; margin-top: 22px; }
.campo { position: relative; display: block; }
.campo svg { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); width: 16px; height: 16px; color: var(--faint); pointer-events: none; }
.campo input { height: 42px; padding-left: 38px; }
.entrar { height: 42px; margin-top: 6px; font-size: 14px; }
.erro { margin: 2px 0 0; color: var(--danger); font-size: 13px; }
</style>
