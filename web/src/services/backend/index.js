// Escolhe o backend: Firebase quando firebase.config.js está preenchido, senão demonstração.
// As duas implementações expõem a mesma interface (veja firebase.js).

import { firebaseConfig } from "@/firebase.config";
import { criarBackendDemo } from "./demo";
import { criarBackendFirebase } from "./firebase";

// Também dá para forçar a demonstração localmente com "npm run dev:demo" (modo do Vite "demo").
export const DEMO = import.meta.env.MODE === "demo" || !firebaseConfig.apiKey || !firebaseConfig.projectId;

export const backend = DEMO ? criarBackendDemo() : criarBackendFirebase(firebaseConfig);
