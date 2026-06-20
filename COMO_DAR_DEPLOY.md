# Como dar Deploy no myBooks (Grátis, Sem Repouso e Persistente) 🚀

Siga estes passos para colocar seu aplicativo no ar utilizando serviços 100% gratuitos que não entram em repouso e garantem a persistência de todos os seus dados e livros!

---

## 1. Banco de Dados (SQLite Remoto com Turso) 🗄️

O Turso oferece um banco de dados SQLite na nuvem que **nunca apaga seus dados** e disponibiliza **9 GB de armazenamento gratuito**.

1. Crie uma conta em [Turso.tech](https://turso.tech/).
2. Instale a CLI do Turso no seu computador ou crie o banco diretamente pelo painel web deles.
3. Crie um banco de dados chamado `bookzinhos-db`.
4. Obtenha os seguintes dados:
   - **URL de Conexão**: Terá o formato `libsql://bookzinhos-db-seuusuario.turso.io`.
   - **Auth Token**: Um token de acesso gerado para autenticação.
5. Guarde esses valores. Eles serão as variáveis `TURSO_DATABASE_URL` e `TURSO_AUTH_TOKEN`.

---

## 2. Armazenamento de Livros (10 GB+ Grátis com S3) 📦

Para salvar seus arquivos PDF e capas sem limites baixos, use um dos serviços abaixo (ambos dão 10 GB gratuitos):

### Opção A: Backblaze B2 (Recomendada - Não pede cartão no cadastro)
1. Crie uma conta em [Backblaze B2](https://www.backblaze.com/cloud-storage).
2. Acesse **Buckets** -> **Create a Bucket**.
   - Dê um nome ao bucket (ex: `bookzinhos-bucket`).
   - Defina a privacidade como **Public** (importante para que o app consiga ler os PDFs).
3. Vá em **Application Keys** e clique em **Add a New Application Key**.
   - Gere uma chave com permissão de leitura e escrita para o seu bucket.
4. Você obterá:
   - `keyID` (será seu `S3_ACCESS_KEY_ID`).
   - `applicationKey` (será seu `S3_SECRET_ACCESS_KEY`).
   - `S3_ENDPOINT`: Será exibido na lista de buckets (ex: `https://s3.us-west-004.backblazeb2.com`).
   - `S3_BUCKET_NAME`: O nome do bucket que você criou.
   - `S3_PUBLIC_URL_PREFIX`: Formato `https://f004.backblazeb2.com/file/nome-do-seu-bucket` (ou o link "Friendly URL" do Backblaze).

### Opção B: Cloudflare R2 (Exige cartão para ativar, mas tem download ilimitado)
1. Crie uma conta na [Cloudflare](https://dash.cloudflare.com/).
2. Vá em **R2** -> **Create bucket** (ex: `bookzinhos`).
3. Nas configurações do bucket, ative um **Custom Domain** ou a **R2.dev Subdomain** pública para permitir o download dos PDFs pelo aplicativo.
4. Vá em **R2** -> **Manage R2 API Tokens** -> **Create API Token**.
   - Dê permissão de **Edit** (Read/Write).
5. Você obterá:
   - Access Key ID (será seu `S3_ACCESS_KEY_ID`).
   - Secret Access Key (será seu `S3_SECRET_ACCESS_KEY`).
   - Endpoint (será seu `S3_ENDPOINT`, ex: `https://<account-id>.r2.cloudflarestorage.com`).

---

## 3. Servidor (Backend na Vercel - Sem Repouso) 🌐

A Vercel hospedará o servidor como **funções serverless gratuitas** que não entram em repouso e respondem instantaneamente!

1. Instale a CLI da Vercel globalmente (se preferir deploy rápido por linha de comando):
   ```bash
   npm install -g vercel
   ```
2. Abra o terminal na pasta `/server` deste projeto e execute:
   ```bash
   vercel
   ```
   *Siga as instruções na tela para criar o projeto backend.*
3. No painel da Vercel (ou usando `vercel env add`), adicione as seguintes **variáveis de ambiente**:
   - `PORT`: `3001`
   - `TURSO_DATABASE_URL`: `libsql://...` (sua URL do Turso)
   - `TURSO_AUTH_TOKEN`: `...` (seu Token do Turso)
   - `S3_ACCESS_KEY_ID`: `...` (seu Access Key ID do S3)
   - `S3_SECRET_ACCESS_KEY`: `...` (sua Secret Key do S3)
   - `S3_ENDPOINT`: `...` (sua URL de Endpoint do S3)
   - `S3_BUCKET_NAME`: `...` (nome do seu bucket S3)
   - `S3_PUBLIC_URL_PREFIX`: `...` (prefixo da URL pública do seu S3, opcional)
4. Execute `vercel --prod` na pasta `/server` para colocar o servidor no ar em produção.
5. Copie a URL de produção gerada pela Vercel (ex: `https://seu-servidor.vercel.app`).

---

## 4. Frontend (Aplicativo Web) 📱

1. Abra o arquivo `frontend/src/app/lib/config.ts`.
2. Substitua o valor de `PROD_URL` pela URL que você copiou da Vercel:
   ```typescript
   const PROD_URL = "https://seu-servidor.vercel.app";
   ```
3. Crie um projeto na **Vercel** ou **Netlify** apontando para a pasta `frontend`.
   - **Comando de Build**: `npm run build`
   - **Diretório de Saída (Output)**: `dist`
4. Acesse o seu app web online e aproveite!

---

## 5. Aplicativo Android (Expo APK) 🤖

Como configuramos o **Expo**, você pode gerar o instalador do aplicativo (`.apk`) para o seu celular Android seguindo estes passos:

1. Vá para a pasta raiz do projeto.
2. Instale o EAS CLI:
   ```bash
   npm install -g eas-cli
   ```
3. Faça login na sua conta do Expo (crie uma em expo.dev se não tiver):
   ```bash
   eas login
   ```
4. Configure o projeto (responda "yes" para tudo):
   ```bash
   eas build:configure
   ```
5. Inicie a compilação do APK de produção na nuvem do Expo:
   ```bash
   npm run build:apk
   ```
6. O Expo gerará um link para download do arquivo `.apk` diretamente para você instalar no seu smartphone!
