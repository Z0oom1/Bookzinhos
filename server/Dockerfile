FROM node:18-slim

WORKDIR /app

# Instala dependências do sistema necessárias para o SQLite
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install --production

COPY . .

# Expõe a porta que o Railway vai usar
EXPOSE 3001

CMD ["node", "index.js"]
