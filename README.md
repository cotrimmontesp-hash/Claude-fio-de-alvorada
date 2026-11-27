# Fio de Alvorada

RPG de ação 3D (fantasia realista) feito com o Claude a partir do GDD.

- **App:** React Native + Expo + TypeScript. O jogo (motor 3D próprio em WebGL2) roda numa WebView no celular e num iframe no site.
- **Site (PWA):** `npx expo export -p web` → pasta `dist` (Vercel usa o `vercel.json`).
- **APK Android:** gerado automaticamente pelo GitHub Actions a cada envio (aba **Releases**). Também dá para gerar pelo **EAS** (`eas build -p android --profile preview`).
- **Personagens:** Mixamo (convertidos com `fonte-do-jogo/tools/fbx2glb.py`).
- **Código do jogo:** `fonte-do-jogo/src` → `python3 fonte-do-jogo/build.py` gera o `.html`, que é copiado para `assets/jogo.html` e `public/jogo/index.html`.

Conteúdo: Capítulo 1 (O rasgo de Orlavento) e Capítulo 2 (Serra das Costuras).
