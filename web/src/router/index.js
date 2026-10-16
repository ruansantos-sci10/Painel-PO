// Rotas com "#" (hash): funcionam no GitHub Pages sem configuração extra de servidor.

import { createRouter, createWebHashHistory } from "vue-router";
import { useSessaoStore } from "@/stores/sessao";
import { abaSalva, salvarAba } from "@/utils/abas";
import LoginView from "@/views/LoginView.vue";
import PainelLayout from "@/layouts/PainelLayout.vue";
import HojeView from "@/views/HojeView.vue";
import ConfigView from "@/views/ConfigView.vue";

const router = createRouter({
  history: createWebHashHistory(),
  // Trocar de aba volta ao topo; voltar/avançar no navegador mantém a posição
  scrollBehavior: (to, from, salva) => salva ?? { top: 0 },
  routes: [
    { path: "/login", name: "login", component: LoginView },
    {
      path: "/",
      component: PainelLayout,
      children: [
        { path: "", redirect: () => ({ name: abaSalva() }) },
        { path: "hoje", name: "hoje", component: HojeView },
        { path: "configuracoes", name: "config", component: ConfigView },
      ],
    },
    { path: "/:caminho(.*)*", redirect: "/" },
  ],
});

router.beforeEach(async (to) => {
  const sessao = useSessaoStore();
  await sessao.aguardar();
  if (!sessao.usuario && to.name !== "login") return { name: "login" };
  if (sessao.usuario && to.name === "login") return { name: abaSalva() };
  return true;
});

router.afterEach((to) => {
  if (to.name === "hoje" || to.name === "config") salvarAba(to.name);
});

export default router;
