# Como dar Deploy no Bookzinhos 🚀

Siga estes passos para colocar seu app online e funcionando no celular!

## 1. Servidor (Backend) 🌐
Vá para o [Railway](https://railway.app/) e:
1. Conecte seu repositório do GitHub.
2. O Railway detectará automaticamente a pasta `server` e usará o `Procfile` que eu criei.
3. Nas variáveis de ambiente do Railway, adicione:
   - `PORT`: `3001`
4. Copie a URL gerada (ex: `https://bookzinhos-production.up.railway.app`).

## 2. Frontend (Web App) 📱
Atualize o arquivo `repositorio/Bookdahelo/src/app/lib/config.ts` com a URL do seu servidor Railway.

Depois, você pode usar o **Vercel** ou **Netlify** para dar deploy na pasta `repositorio/Bookdahelo`.
*   Comando de Build: `npm run build`
*   Pasta de Saída: `dist`

## 3. App Android / iOS 🤖🍎
Como configuramos o **Expo**, você pode gerar o APK assim:
1. Instale o EAS CLI: `npm install -g eas-cli`
2. Faça login: `eas login`
3. Configure o projeto: `eas build:configure`
4. Gere o APK (Android): `eas build --platform android --profile production`

### ✨ Dica para Atualizações em Tempo Real:
O app já está configurado como **PWA**. Isso significa que se você abrir o site do app no navegador do celular (Chrome no Android ou Safari no iOS) e clicar em **"Adicionar à Tela de Início"**, ele vai se comportar como um aplicativo nativo com o ícone que você escolheu, e sempre estará atualizado com as últimas mudanças do site!

---
Feito com amor para o **Bookzinhos**! 🐼💕
