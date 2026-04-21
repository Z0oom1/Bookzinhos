# 📚 Books da Helo — Como usar

## Estrutura do projeto

```
Books-da-Helo/
├── server/          ← Servidor Node.js (banco de dados)
├── repositorio/
│   └── Bookdahelo/  ← Web app (interface do app)
├── AppWebView.tsx   ← Expo app (shell Android)
├── eas.json         ← Configuração de build do APK
└── scripts/
    └── copy-web.js  ← Copia build para o APK
```

---

## PASSO 1 — Fazer Deploy do Servidor (Railway)

Você não precisa instalar o Railway no Windows globalmente, basta usar o `npx`.

1. Acesse [railway.app](https://railway.app) e faça login com seu GitHub.
2. Abra o terminal na pasta `server`:
   ```powershell
   cd c:\Users\caio\Desktop\Books-da-Helo\server
   ```
3. Faça login no Railway via terminal:
   ```powershell
   $env:Path += ";C:\Program Files\nodejs"
   npx @railway/cli login
   ```
   *(Isso abrirá o navegador para você confirmar o login).*
4. Inicie o projeto e faça deploy:
   ```powershell
   npx @railway/cli init
   # (Escolha "Empty Project" e dê um nome)
   npx @railway/cli up
   ```
5. No painel web do Railway (railway.app):
   - Vá em **Variables** e adicione: `DATA_DIR = /data`
   - Vá em **Volumes**, clique em **Add Volume** e defina o caminho como `/data`. (Isso garante que PDFs e o banco de dados não apaguem quando reiniciar).
6. Pegue a URL do seu servidor gerada (ex: `https://meu-app.up.railway.app`)

---

## PASSO 2 — Configurar a URL no App

Abra o arquivo `repositorio/Bookdahelo/src/app/lib/config.ts` e troque a URL:

```ts
// Se estiver usando o Railway, coloque a URL gerada:
export const API_BASE_URL = import.meta.env.VITE_API_URL || "https://SEU-APP.up.railway.app";
```

---

## PASSO 3 — Gerar o APK do Aplicativo

```powershell
# Abra o terminal na raiz do projeto:
cd c:\Users\caio\Desktop\Books-da-Helo
$env:Path += ";C:\Program Files\nodejs"

# 1. Login no Expo
npx eas-cli login

# 2. Iniciar projeto (apenas primeira vez)
npx eas-cli init

# 3. Gerar build Web e copiar para o Android:
npm run build:web
npm run copy:web

# 4. Gerar APK na nuvem:
npm run build:apk
```

O Expo vai gerar o APK na nuvem e no final do processo aparecerá um link para baixar o arquivo `.apk` no seu celular!

---

## Testar Localmente (Desenvolvimento)

Se quiser testar no PC antes de gerar o APK, abra 2 terminais:

**Terminal 1 (Servidor)**:
```powershell
cd c:\Users\caio\Desktop\Books-da-Helo\server
$env:Path += ";C:\Program Files\nodejs"
npm start
```

**Terminal 2 (Web App)**:
```powershell
cd c:\Users\caio\Desktop\Books-da-Helo\repositorio\Bookdahelo
$env:Path += ";C:\Program Files\nodejs"
npm run dev
```

Abra `http://localhost:5173` no navegador. Tudo pronto!
