# Painel do Admin 🐶

A conta **`Admin`** (senha **`537942`**, emote 🐶) é a única que enxerga o item
**Admin** no menu e a rota `/admin`. Ela é recriada a cada boot do servidor, com a
senha e o emote corretos — então nunca fica perdida.

Tudo que é editado no painel vai direto para o banco do servidor. Não existe cópia
local: assim que a home ou a biblioteca de outro leitor recarregar, a mudança já está lá.

## Banners

Aba **Banners** → **Novo banner**.

- **Imagem**: a arte que você montar. Proporção recomendada **3:1** (ex.: 1500 × 500 px).
  Sem imagem, o banner usa um gradiente e mostra só o texto.
- **Título / subtítulo**: opcionais; aparecem sobre a imagem, com um degradê escuro
  atrás para o texto continuar legível em qualquer arte.
- **Levar para um livro** ou **link/rota**: torna o banner clicável. Uma rota interna
  (`/library`) navega dentro do app; um endereço `https://…` abre em outra aba.
- **Ordem**: menor número aparece primeiro no carrossel.
- O ícone de olho **oculta** o banner sem apagá-lo — útil para preparar uma campanha
  antes da hora.

O carrossel gira sozinho a cada 6 segundos, para quando o mouse está em cima e
aceita arrastar para o lado no celular.

## Postagens (mural da home)

Aba **Postagens** → **Nova postagem**.

Serve para recado, indicação ou desafio de leitura. Aceita título, texto, imagem e um
livro relacionado (vira um cartão clicável no fim da postagem). O alfinete **fixa** a
postagem no topo do mural; o olho publica ou oculta. Qualquer leitor pode curtir.

## Livros

Aba **Livros**: busca no acervo, edição (título, autor, gênero, sinopse, capa) e
exclusão.

> Excluir um livro apaga junto as resenhas, as respostas, o progresso de leitura, as
> anotações e os capítulos daquele livro — para todos os leitores. Não tem desfazer.

Para adicionar livros há dois caminhos: **Enviar livro** (upload pelo app) ou soltar o
PDF na pasta `Livros/`, que o watcher do servidor importa sozinho — o nome do arquivo
no formato `Título - Autor.pdf` já preenche os dados.

## Leitores

Aba **Leitores**: todas as contas, com seguidores e número de resenhas. Clicar abre o
perfil público da pessoa.

## Moderação

Fora do painel, a conta Admin também pode **apagar qualquer resenha ou resposta**
direto na página do livro — os botões de lixeira aparecem em todos os comentários, não
só nos seus.

## Rankings

**Mais lidos** e **Melhores avaliados** não são editáveis: o servidor os calcula a
partir do uso real (quantas pessoas abriram e estão lendo o livro, quantas concluíram,
quantas avaliaram e a média das notas). Para destacar algo à mão, use um banner ou uma
postagem fixada.

## Uma nota sobre segurança

O servidor identifica quem está pedindo pelo header `x-user-id`, o mesmo esquema que o
app já usava. As rotas de administração verificam se esse usuário é o Admin, mas alguém
que conheça a API consegue forjar o header. Para uso entre amigos está de bom tamanho;
se um dia o app for aberto ao público, o próximo passo é trocar isso por login com
token (JWT) e senha com hash.
