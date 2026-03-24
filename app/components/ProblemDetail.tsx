'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Problem } from '../types';
import KatexText from './KatexText';

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
const PAD = 12;

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
  const viewportRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [relativeZoom, setRelativeZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const imgDimsRef = useRef<({ w: number; h: number } | null)[]>([]);
  const dragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  const imageSrcs = (problem?.images ?? []).map(
    (img) => `${BASE_PATH}/images/${img.replace('images/', '')}`
  );

  // 뷰포트 크기 측정 — overflow: hidden이므로 크기 안정적
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const obs = new ResizeObserver(() =>
      setContainerSize({ w: el.clientWidth, h: el.clientHeight })
    );
    obs.observe(el);
    setContainerSize({ w: el.clientWidth, h: el.clientHeight });
    return () => obs.disconnect();
  }, []);

  // Ctrl+스크롤 줌 / 두 손가락 스크롤 패닝
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const sensitivity = Math.abs(e.deltaY) < 10 ? 0.01 : 0.001;
        const factor = Math.exp(-e.deltaY * sensitivity);
        setRelativeZoom((prev) => Math.max(0.1, Math.min(10, prev * factor)));
      } else {
        // 두 손가락 스크롤 → 패닝
        setPan((prev) => ({ x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
      }
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, []);

  // 문항 변경 시 초기화
  useEffect(() => {
    setNaturalSize(null);
    setRelativeZoom(1);
    setPan({ x: 0, y: 0 });
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

  // 드래그 패닝
  const onMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    dragging.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
  }, []);
  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
  }, []);
  const onMouseUp = useCallback(() => { dragging.current = false; }, []);

  // fitScale: 너비·높이 모두 맞춤 (패딩 제외)
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

      {/* 이미지 섹션 — 높이 45% 고정, overflow hidden으로 스크롤바 없음 */}
      <div
        className="shrink-0 flex flex-col bg-gray-50 rounded-lg border border-gray-200"
        style={{ height: '45%' }}
      >
        {/* 줌 컨트롤 */}
        <div className="flex items-center gap-1 px-2 py-1 border-b border-gray-100 shrink-0">
          <button
            className="w-6 h-6 flex items-center justify-center rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-100 text-sm"
            onClick={() => setRelativeZoom((v) => Math.max(0.1, v / 1.25))}
          >−</button>
          <button
            className="text-xs text-gray-500 w-12 text-center hover:text-gray-700 tabular-nums"
            onClick={() => { setRelativeZoom(1); setPan({ x: 0, y: 0 }); }}
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

        {/* 뷰포트 — overflow hidden, 스크롤 없음 */}
        <div
          ref={viewportRef}
          className="flex-1 min-h-0 select-none"
          style={{ overflow: 'hidden', cursor: 'grab', position: 'relative' }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        >
          {!problem ? (
            <div className="flex items-center justify-center h-full">
              <span className="text-gray-400 text-sm">문항을 선택하세요</span>
            </div>
          ) : imageSrcs.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <span className="text-gray-400 text-sm">이미지 없음</span>
            </div>
          ) : (
            /* 절대 중앙 배치 + pan 오프셋 */
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px))`,
                width: displayWidth ?? '80%',
                flexShrink: 0,
              }}
            >
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

      {/* 텍스트 섹션 — 자체 스크롤 */}
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
