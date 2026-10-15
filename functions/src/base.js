// Inicialização compartilhada: Admin SDK, região e verificação de acesso.

import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { setGlobalOptions } from "firebase-functions/v2";
import { HttpsError } from "firebase-functions/v2/https";

// São Paulo. Crie o banco Firestore na mesma região (southamerica-east1).
export const REGIAO = "southamerica-east1";

// Limite de segurança contra custos: o painel tem um único usuário.
setGlobalOptions({ region: REGIAO, maxInstances: 5 });

initializeApp();
export const db = getFirestore();

// As funções "callable" só atendem quem está logado e liberado em autorizados/{uid}.
export async function exigirAutorizado(request) {
  if (!request.auth) throw new HttpsError("unauthenticated", "Faça login para continuar.");
  const doc = await db.doc(`autorizados/${request.auth.uid}`).get();
  if (!doc.exists) throw new HttpsError("permission-denied", "Usuário sem acesso ao painel.");
}
