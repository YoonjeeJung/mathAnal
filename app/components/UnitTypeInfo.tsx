'use client';

import { useMemo } from 'react';
import { Problem } from '../types';
import KatexText from './KatexText';

interface Props {
  problem: Problem | null;
  csvRaw: string;
}

interface UnitMeta {
  curriculum_name: string;
  unit_name_1: string;
  unit_name_2: string;
  unit_name_3: string;
}

function parseCsvForUnitMeta(csvRaw: string): Map<number, UnitMeta> {
  const map = new Map<number, UnitMeta>();
  const lines = csvRaw.trim().split('\n').slice(1);
  for (const line of lines) {
    const cols: string[] = [];
    let current = '';
    let inQuote = false;
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote; }
      else if (ch === ',' && !inQuote) { cols.push(current.trim()); current = ''; }
      else { current += ch; }
    }
    cols.push(current.trim());
    const uid3 = parseInt(cols[6]);
    if (!isNaN(uid3) && !map.has(uid3)) {
      map.set(uid3, {
        curriculum_name: cols[1],
        unit_name_1: cols[3],
        unit_name_2: cols[5],
        unit_name_3: cols[7],
      });
    }
  }
  return map;
}

export default function UnitTypeInfo({ problem, csvRaw }: Props) {
  const unitMetaMap = useMemo(() => parseCsvForUnitMeta(csvRaw), [csvRaw]);

  if (!problem) {
    return (
      <div className="flex h-full items-center justify-center text-gray-400 text-sm p-4">
        문항을 선택하세요
      </div>
    );
  }

  const candidates = problem.unit_candidates;

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 gap-4">
      {/* Behavior area */}
      <div>
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
          행동 영역
        </div>
        <span className="inline-block bg-violet-50 text-violet-700 px-2.5 py-1 rounded text-sm font-medium">
          {problem.behavior_area}
        </span>
        {problem.behavior_reason && (
          <KatexText text={problem.behavior_reason} className="mt-2 text-xs text-gray-500 leading-relaxed" />
        )}
      </div>

      {/* Unit candidates */}
      <div>
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          단원 / 유형
        </div>
        <div className="space-y-3">
          {candidates.map((uc, i) => {
            const meta = unitMetaMap.get(uc.unit_id);
            return (
              <div key={i} className="rounded-lg border border-gray-200 p-3">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex-1 min-w-0">
                    {meta && (
                      <div className="text-xs text-gray-400 mb-0.5">
                        {meta.curriculum_name} · {meta.unit_name_1} · {meta.unit_name_2}
                      </div>
                    )}
                    <KatexText
                      text={meta?.unit_name_3 ?? `unit #${uc.unit_id}`}
                      className="text-sm font-medium text-gray-800"
                    />
                  </div>
                  <span className="shrink-0 text-xs bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded">
                    {(uc.confidence_score * 100).toFixed(1)}%
                  </span>
                </div>
                {uc.valid_categories.length > 0 ? (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {uc.valid_categories.map((cat, j) => (
                      <span
                        key={j}
                        className="inline-flex items-center text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
                      >
                        <KatexText text={cat.category_name} />
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="inline-block mt-2 text-xs text-gray-400 italic">유형 없음</span>
                )}
              </div>
            );
          })}
          {candidates.length === 0 && (
            <p className="text-sm text-gray-400">단원 정보 없음</p>
          )}
        </div>
      </div>

      {/* Meta */}
      <div>
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          문항 정보
        </div>
        <div className="space-y-1 text-sm text-gray-600">
          <div className="flex gap-2">
            <span className="text-gray-400 w-14 shrink-0">정답</span>
            <KatexText text={`$${String(problem.answer)}$`} className="font-medium" />
          </div>
          <div className="flex gap-2">
            <span className="text-gray-400 w-14 shrink-0">배점</span>
            <span>{problem.score}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-gray-400 w-14 shrink-0">난이도</span>
            <span>{problem.difficulty}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
