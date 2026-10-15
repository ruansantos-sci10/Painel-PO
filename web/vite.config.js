import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  // Caminhos relativos + rotas com "#": funciona em https://<usuario>.github.io/<repositorio>/
  // sem precisar saber o nome do repositório.
  base: "./",
  plugins: [vue()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
