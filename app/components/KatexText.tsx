'use client';

import { useEffect, useRef, memo } from 'react';
import renderMathInElement from 'katex/contrib/auto-render';

const DELIMITERS = [
  { left: '$$', right: '$$', display: true },
  { left: '$', right: '$', display: false },
  { left: '\\(', right: '\\)', display: false },
  { left: '\\[', right: '\\]', display: true },
];

interface Props {
  text: string;
  className?: string;
}

const KatexText = memo(function KatexText({ text, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.textContent = text;
    try {
      renderMathInElement(ref.current, {
        delimiters: DELIMITERS,
        throwOnError: false,
        trust: true,
        ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'],
      });
    } catch (e) {
      console.error('KaTeX error:', e);
    }
  }, [text]);

  return <div ref={ref} className={`text-black ${className ?? ''}`} />;
});

export default KatexText;
