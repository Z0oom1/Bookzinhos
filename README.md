# Books da Helo

Aplicativo mobile/tablet para leitura de livros em PDF com foco em jornada emocional, descoberta social e gamificacao.

## Stack

- Expo + React Native + TypeScript
- React Navigation (tabs + stack)
- AsyncStorage para persistencia local/offline
- `react-native-pdf` para leitura de PDF

## Funcionalidades implementadas

- Autenticacao (cadastro/login simplificado por nome)
- Home com busca, "Em alta", "Queridinhos", "Recentes" e recomendacoes
- Biblioteca publica com filtros, ordenacao e seguir leitores
- Upload de PDF com metadados e visibilidade publica/privada
- My Books com status (Lendo, Finalizado, Pausado), progresso e tempo
- Leitor PDF com:
  - salvamento automatico de pagina
  - tema Claro/Escuro/Sepia
  - paginas favoritas
  - menu minimalista ocultavel
- Notinhas com pandas (1 a 5 pandas = 2 a 10), emocao rapida e historico de versoes
- Tela de detalhes do livro com comentarios
- Perfil com estatisticas, estante, historico e conquistas
- Base para gamificacao e insights

## Como rodar

1. Instale Node.js LTS: https://nodejs.org
2. No projeto:
   - `npm install`
   - `npx expo start`
3. Rode no Android/iOS via Expo Go, emulador, ou web.

## Observacoes legais e de produto

- O app suporta livro privado ou compartilhado.
- Para conteudo publico, use apenas materiais com permissao de distribuicao (dominio publico ou autoria propria).
- Monetizacao premium esta preparada como extensao futura (estatisticas avancadas, temas, backup ilimitado).
