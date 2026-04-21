import { useState } from "react";

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallback?: React.ReactNode;
}

export function ImageWithFallback({
  src,
  alt = "",
  fallback,
  ...props
}: ImageWithFallbackProps) {
  const [error, setError] = useState(false);

  if (error && fallback) {
    return <>{fallback}</>;
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setError(true)}
      {...props}
    />
  );
}
