FROM node:18-slim

WORKDIR /app

# Instala dependências do sistema necessárias para o SQLite
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copia o package.json de DENTRO da pasta server para a raiz do container
COPY server/package*.json ./
RUN npm install --production

# Copia todo o conteúdo da pasta server para a raiz do container
COPY server/ .

# Expõe a porta
EXPOSE 3001

CMD ["node", "index.js"]
