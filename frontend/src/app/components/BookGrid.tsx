import { useEffect, useState } from "react";
import { BookCard } from "./BookCard";
import { EASE_OUT, type BookDisplay } from "./Book3D";
import type { Book, ReadingProgress } from "../lib/types";

/** Largura da capa conforme o espaço disponível. */
export function useCoverWidth(): number {
  const compute = () => {
    if (typeof window === "undefined") return 128;
    if (window.innerWidth < 400) return 92;
    if (window.innerWidth < 640) return 104;
    if (window.innerWidth < 1024) return 116;
    return 128;
  };
  const [width, setWidth] = useState(compute);

  useEffect(() => {
    const onResize = () => setWidth(compute());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return width;
}

interface Props {
  books: Book[];
  progressOf?: Map<string, ReadingProgress>;
  display?: BookDisplay;
  /** Numera os livros (usado no ranking "Mais lidos") */
  ranked?: boolean;
  onDeleted?: (id: string) => void;
  onEdited?: (book: Book) => void;
}

/**
 * Estante: os livros em fileiras.
 *
 * Os itens se alinham pelo topo, e não pela base: a legenda embaixo da capa
 * varia de uma para duas linhas, e alinhar por baixo fazia as capas ficarem
 * em alturas diferentes na mesma fileira — o desalinhamento que aparecia no
 * celular, onde os títulos quebram com mais frequência.
 *
 * As prateleiras desenhadas ao fundo só entram no modo lombada, onde a altura
 * de cada fileira é exatamente a altura do livro (a legenda some) e a tábua
 * cai sempre no lugar certo.
 */
export function BookGrid({ books, progressOf, display = "cover", ranked, onDeleted, onEdited }: Props) {
  const coverWidth = useCoverWidth();
  const height = Math.round(coverWidth * 1.5);
  const isShelf = display === "spine";

  const rowGap = isShelf ? 44 : 30;
  const rowHeight = height + rowGap;

  return (
    <div
      className="flex flex-wrap items-start"
      style={{
        columnGap: isShelf ? 3 : 18,
        rowGap,
        paddingBottom: isShelf ? 10 : 0,
        backgroundImage: isShelf
          ? `repeating-linear-gradient(to bottom,
              transparent 0px,
              transparent ${height + 4}px,
              color-mix(in srgb, var(--foreground) 14%, transparent) ${height + 4}px,
              color-mix(in srgb, var(--foreground) 14%, transparent) ${height + 8}px,
              transparent ${height + 8}px,
              transparent ${rowHeight}px)`
          : undefined,
        transition: `column-gap 0.6s ${EASE_OUT}`,
      }}
    >
      {books.map((book, i) => (
        <BookCard
          key={book.id}
          book={book}
          width={coverWidth}
          display={display}
          index={i}
          rank={ranked ? i + 1 : undefined}
          progress={progressOf?.get(book.id)}
          onDeleted={onDeleted}
          onEdited={onEdited}
        />
      ))}
    </div>
  );
}
