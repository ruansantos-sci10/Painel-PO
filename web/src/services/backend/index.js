// Escolhe o backend: Firebase quando firebase.config.js está preenchido, senão demonstração.
// As duas implementações expõem a mesma interface (veja firebase.js).

import { firebaseConfig, REGIAO_FUNCOES } from "@/firebase.config";
import { criarBackendDemo } from "./demo";
import { criarBackendFirebase } from "./firebase";

export const DEMO = !firebaseConfig.apiKey || !firebaseConfig.projectId;

export const backend = DEMO ? criarBackendDemo() : criarBackendFirebase(firebaseConfig, REGIAO_FUNCOES);
