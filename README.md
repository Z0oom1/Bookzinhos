# myBooks

Rede social de leitura: um acervo de PDFs compartilhado, notas e resenhas públicas,
perfis com seguidores e um feed do que a comunidade está lendo.

## Estrutura

```
Bookzinhos-main/
├── server/            ← API Node/Express + SQLite (ou Turso) — a fonte da verdade
├── frontend/          ← Web app (React + Vite + Tailwind) — o app em si
├── Livros/            ← Solte PDFs aqui: o watcher importa sozinho para o acervo
├── AppWebView.tsx     ← Casca Expo/Android que abre o web app
└── scripts/copy-web.js
```

Tudo o que aparece no app mora no servidor. Não existe estado só-local: uma resenha,
um banner ou um livro novo aparece para todos os leitores na próxima carga da tela.

## Rodando localmente

Dois terminais, na raiz do projeto:

```bash
npm run dev:server
```

```bash
npm run dev:web
```

O app abre em `http://localhost:5173` e fala com a API em `http://localhost:3001`.
(`npm run dev` sobe os dois de uma vez.)

Antes de subir mudanças, vale rodar:

```bash
npm run typecheck --prefix frontend
```

## Contas

| Conta   | Senha    | O que faz                                                     |
| ------- | -------- | ------------------------------------------------------------- |
| `Admin` | `537942` | Painel completo — banners, mural, acervo e leitores (emote 🐶) |
| `Caio`  | `1234`   | Leitor comum                                                   |
| `Helo`  | `1234`   | Leitor comum                                                   |

Qualquer pessoa pode criar a própria conta pela tela de entrada.
Detalhes do painel: [ADMIN.md](ADMIN.md).

## O que o app faz

**Leitura**
- Acervo compartilhado de PDFs, com importação automática da pasta `Livros/`
- Leitor próprio com progresso, capítulos, temas e zoom — ou o visualizador do aparelho
- Diário privado por livro, separado das resenhas públicas

**Social**
- Nota de 1 a 5 estrelas + resenha pública, uma por leitor em cada livro
- Curtidas e respostas encadeadas em cada resenha, com marcação de spoiler
- Perfis públicos: bio, estante em destaque, resenhas, lidos, favoritos
- Seguir leitores e um feed com "tudo" ou "quem eu sigo"
- Chat privado com indicação de livros (Pandinhas de Amor)

**Descoberta**
- Banners no topo da home, montados pelo Admin
- Mural com recados e indicações da curadoria
- Rankings automáticos: **Mais lidos** e **Melhores avaliados**
- Biblioteca com busca, filtros por status e gênero, ordenação e visão em grade ou lista

## Publicando

Deploy do servidor e geração do APK: [COMO_DAR_DEPLOY.md](COMO_DAR_DEPLOY.md) e
[COMO_USAR.md](COMO_USAR.md).

## Observações de produto

- O app aceita livro privado ou compartilhado.
- Para conteúdo público, use apenas material com permissão de distribuição
  (domínio público ou autoria própria).
