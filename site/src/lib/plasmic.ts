// Plasmic loader instance — singleton.
// Чтение PROJECT_ID/TOKEN из env. На локалке — из site/.env, в CI — из GitHub Secrets.
import { initPlasmicLoader } from '@plasmicapp/loader-react';

const projectId = process.env.PLASMIC_PROJECT_ID;
const token = process.env.PLASMIC_API_TOKEN;

if (!projectId || !token) {
  console.warn('[plasmic] PLASMIC_PROJECT_ID/PLASMIC_API_TOKEN не заданы — Plasmic-страницы будут пустыми');
}

export const PLASMIC = initPlasmicLoader({
  projects: [
    {
      id: projectId ?? '',
      token: token ?? '',
    },
  ],
  // Production mode = берём только Published версии (то что нажал Publish в Studio).
  preview: false,
});
