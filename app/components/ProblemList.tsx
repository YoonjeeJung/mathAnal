'use client';

import { useMemo } from 'react';
import { Problem, ExamInfo } from '../types';

interface Props {
  problems: Problem[];
  examMap: Map<string, ExamInfo>;
  selectedId: number | null;
  onSelect: (problem: Problem) => void;
}

const TYPE_LABEL: Record<string, string> = {
  multiple_choice: '객관식',
  subjective: '주관식',
  descriptive: '서술형',
};

const TYPE_ORDER: Record<string, number> = {
  multiple_choice: 0,
  subjective: 1,
  descriptive: 2,
};

function extractSortKey(name: string): [number, string] {
  const match = name.match(/(\d+)/);
  return [match ? parseInt(match[1]) : 999, name];
}

function CategoryTag({ problem }: { problem: Problem }) {
  const totalCategories = problem.unit_candidates.reduce(
    (sum, uc) => sum + uc.valid_categories.length, 0
  );
  if (totalCategories === 0) {
    return (
      <span
        className="px-1 py-0 rounded-full text-white whitespace-nowrap opacity-90"
        style={{ fontSize: '9px', backgroundColor: 'hsl(25, 90%, 53%)' }}
      >
        없음
      </span>
    );
  }
  if (totalCategories > 1) {
    return (
      <span
        className="px-1 py-0 rounded-full text-white whitespace-nowrap opacity-90"
        style={{ fontSize: '9px', backgroundColor: 'hsl(0, 86%, 58%)' }}
      >
        복합
      </span>
    );
  }
  return null;
}

export default function ProblemList({ problems, examMap, selectedId, onSelect }: Props) {
  const sorted = useMemo(
    () =>
      [...problems].sort((a, b) => {
        const examA = examMap.get(a.exam_id)?.exam_name ?? a.exam_id;
        const examB = examMap.get(b.exam_id)?.exam_name ?? b.exam_id;
        const examCmp = examA.localeCompare(examB, 'ko');
        if (examCmp !== 0) return examCmp;
        const typeCmp = (TYPE_ORDER[a.problem_type] ?? 9) - (TYPE_ORDER[b.problem_type] ?? 9);
        if (typeCmp !== 0) return typeCmp;
        const [na, sa] = extractSortKey(a.original_problem_name);
        const [nb, sb] = extractSortKey(b.original_problem_name);
        return na !== nb ? na - nb : sa.localeCompare(sb, 'ko');
      }),
    [problems, examMap]
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 px-2 py-2 border-b border-gray-100 text-[10.8px] text-gray-500">
        {problems.length}개 문항
      </div>
      <div className="flex-1 overflow-y-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-gray-50 z-10">
            <tr className="text-[10.8px] text-gray-500 border-b border-gray-200">
              <th className="text-left px-3 py-2 font-medium w-[22%]">번호</th>
              <th className="text-left px-3 py-2 font-medium">시험</th>
              <th className="px-0 py-2 w-8" />
              <th className="text-left px-3 py-2 font-medium w-12">타입</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => {
              const exam = examMap.get(p.exam_id);
              return (
                <tr
                  key={p.problem_id}
                  className={`border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                    selectedId === p.problem_id ? 'bg-indigo-50 border-l-2 border-l-indigo-500' : ''
                  }`}
                  onClick={() => onSelect(p)}
                >
                  <td className="px-3 py-2 font-mono text-[10.8px] text-gray-500 w-[22%] whitespace-nowrap">
                    {p.original_problem_name}
                  </td>
                  <td className="pl-3 pr-0 py-2 text-[10.8px] text-gray-600 whitespace-nowrap max-w-0">
                    {exam?.exam_name ?? p.exam_id}
                  </td>
                  <td className="pl-0 pr-4 py-2 w-7 text-right">
                    <CategoryTag problem={p} />
                  </td>
                  <td className="px-3 py-2 w-12">
                    <span
                      className={`px-1.5 py-0.5 rounded whitespace-nowrap ${
                        p.problem_type === 'multiple_choice'
                          ? 'bg-blue-50 text-blue-600'
                          : p.problem_type === 'descriptive'
                          ? 'bg-orange-50 text-orange-600'
                          : 'bg-green-50 text-green-600'
                      }`}
                      style={{ fontSize: '10.8px' }}
                    >
                      {TYPE_LABEL[p.problem_type] ?? p.problem_type}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
