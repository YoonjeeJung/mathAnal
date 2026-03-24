'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Problem } from '../types';
import KatexText from './KatexText';

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

interface Props {
  problem: Problem | null;
}

function SectionTag({ label }: { label: string }) {
  return (
    <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-500 mb-2">
      {label}
    </span>
  );
}

export default function ProblemDetail({ problem }: Props) {
  const imgContainerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [relativeZoom, setRelativeZoom] = useState(1);
  const imgDimsRef = useRef<({ w: number; h: number } | null)[]>([]);

  const dragging = useRef(false);
  const dragOrigin = useRef({ x: 0, y: 0, sl: 0, st: 0 });

  const imageSrcs = (problem?.images ?? []).map(
    (img) => `${BASE_PATH}/images/${img.replace('images/', '')}`
  );

  // imgContainerRef는 항상 DOM에 존재 → [] 의존성 안전
  useEffect(() => {
    const el = imgContainerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(() =>
      setContainerSize({ w: el.clientWidth, h: el.clientHeight })
    );
    obs.observe(el);
    setContainerSize({ w: el.clientWidth, h: el.clientHeight });
    return () => obs.disconnect();
  }, []);

  // Ctrl+scroll / pinch zoom
  useEffect(() => {
    const el = imgContainerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const sensitivity = Math.abs(e.deltaY) < 10 ? 0.01 : 0.001;
      const factor = Math.exp(-e.deltaY * sensitivity);
      setRelativeZoom((prev) => Math.max(0.1, Math.min(10, prev * factor)));
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, []);

  // Reset on problem change
  useEffect(() => {
    setNaturalSize(null);
    setRelativeZoom(1);
    imgDimsRef.current = new Array(imageSrcs.length).fill(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problem?.problem_id]);

  const handleImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>, idx: number) => {
      const img = e.currentTarget;
      imgDimsRef.current[idx] = { w: img.naturalWidth, h: img.naturalHeight };
      if (imgDimsRef.current.every((d) => d !== null)) {
        const dims = imgDimsRef.current as { w: number; h: number }[];
        const maxW = Math.max(...dims.map((d) => d.w));
        const totalH = dims.reduce((s, d) => s + (d.h * maxW) / d.w, 0);
        setNaturalSize({ w: maxW, h: totalH });
      }
    },
    []
  );

  const onMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    dragging.current = true;
    dragOrigin.current = {
      x: e.clientX, y: e.clientY,
      sl: imgContainerRef.current?.scrollLeft ?? 0,
      st: imgContainerRef.current?.scrollTop ?? 0,
    };
  }, []);
  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragging.current || !imgContainerRef.current) return;
    imgContainerRef.current.scrollLeft = dragOrigin.current.sl - (e.clientX - dragOrigin.current.x);
    imgContainerRef.current.scrollTop = dragOrigin.current.st - (e.clientY - dragOrigin.current.y);
  }, []);
  const onMouseUp = useCallback(() => { dragging.current = false; }, []);

  // fitScale: 패딩(8px*2) 제외한 실제 가용 영역 기준으로 맞춤
  const PAD = 8;
  const fitScale =
    naturalSize && containerSize.w > 0 && containerSize.h > 0
      ? Math.min(
          (containerSize.w - PAD * 2) / naturalSize.w,
          (containerSize.h - PAD * 2) / naturalSize.h
        )
      : null;

  const actualScale = fitScale !== null ? fitScale * relativeZoom : null;
  const displayWidth = actualScale !== null && naturalSize
    ? Math.round(naturalSize.w * actualScale)
    : undefined;

  return (
    <div className="flex flex-col h-full overflow-hidden gap-3 p-3">

      {/* 이미지 섹션 — 높이 45% 고정 */}
      <div
        className="shrink-0 flex flex-col bg-gray-50 rounded-lg border border-gray-200 overflow-hidden"
        style={{ height: '45%' }}
      >
        {/* Zoom controls */}
        <div className="flex items-center gap-1 px-2 py-1 border-b border-gray-100 shrink-0">
          <button
            className="w-6 h-6 flex items-center justify-center rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-100 text-sm"
            onClick={() => setRelativeZoom((v) => Math.max(0.1, v / 1.25))}
          >−</button>
          <button
            className="text-xs text-gray-500 w-12 text-center hover:text-gray-700 tabular-nums"
            onClick={() => setRelativeZoom(1)}
            title="클릭하면 100%로 초기화"
          >
            {fitScale !== null ? `${Math.round(relativeZoom * 100)}%` : '…'}
          </button>
          <button
            className="w-6 h-6 flex items-center justify-center rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-100 text-sm"
            onClick={() => setRelativeZoom((v) => Math.min(10, v * 1.25))}
          >+</button>
          <span className="text-xs text-gray-400 ml-1">Ctrl+스크롤 · 드래그</span>
        </div>

        {/* 뷰포트 — imgContainerRef 항상 DOM에 존재 */}
        <div
          ref={imgContainerRef}
          className="flex-1 min-h-0 select-none"
          style={{ cursor: 'grab', overflow: relativeZoom > 1 ? 'auto' : 'hidden' }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        >
          {/* min-width/height 100% + flex center → 이미지가 작으면 상하좌우 가운데, 크면 스크롤 */}
          <div style={{ minWidth: '100%', minHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box', padding: 8 }}>
            {!problem ? (
              <span className="text-gray-400 text-sm">문항을 선택하세요</span>
            ) : imageSrcs.length === 0 ? (
              <span className="text-gray-400 text-sm">이미지 없음</span>
            ) : (
              <div style={{ width: displayWidth ?? '100%', flexShrink: 0 }}>
                {imageSrcs.map((src, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={src}
                    src={src}
                    alt={`문제 ${problem.problem_name} 이미지 ${i + 1}`}
                    style={{ width: '100%', display: 'block', pointerEvents: 'none' }}
                    onLoad={(e) => handleImageLoad(e, i)}
                    draggable={false}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 텍스트 섹션 — 자체 스크롤, flex-1로 나머지 높이 차지 */}
      <div className="flex-1 min-h-0 bg-white rounded-lg border border-gray-200 overflow-y-auto p-4">
        {problem ? (
          <>
            <div className="mb-4">
              <SectionTag label="문제" />
              <KatexText text={problem.problem_description} className="leading-relaxed text-sm" />
              {problem.choices && problem.choices.length > 0 && (
                <div className="space-y-1.5 mt-3">
                  {problem.choices.map((choice, i) => (
                    <KatexText key={i} text={choice} className="text-sm leading-relaxed pl-2" />
                  ))}
                </div>
              )}
            </div>
            {problem.solution && (
              <div className="border-t border-gray-100 pt-4">
                <SectionTag label="해설" />
                <KatexText text={problem.solution} className="leading-relaxed text-sm" />
              </div>
            )}
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-gray-400 text-sm">
            문항을 선택하세요
          </div>
        )}
      </div>

    </div>
  );
}
