'use client';

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
  if (!problem) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-gray-400 text-sm">
        문항을 선택하세요
      </div>
    );
  }

  const imageFile = problem.images?.[0]?.replace('images/', '');
  const imageSrc = imageFile ? `${BASE_PATH}/images/${imageFile}` : null;

  return (
    <div className="flex flex-col h-full overflow-hidden gap-3 p-3">
      {/* Image */}
      <div
        className="shrink-0 bg-gray-50 rounded-lg border border-gray-200 overflow-hidden flex items-center justify-center"
        style={{ flex: '0.9' }}
      >
        {imageSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageSrc}
            alt={`문제 ${problem.problem_name}`}
            className="object-contain p-2 w-full h-full"
          />
        ) : (
          <span className="text-gray-400 text-sm">이미지 없음</span>
        )}
      </div>

      {/* Text rendering */}
      <div
        className="bg-white rounded-lg border border-gray-200 overflow-y-auto p-4 min-h-0"
        style={{ flex: '1.1' }}
      >
        {/* 문제 */}
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

        {/* 해설 */}
        {problem.solution && (
          <div className="border-t border-gray-100 pt-4">
            <SectionTag label="해설" />
            <KatexText text={problem.solution} className="leading-relaxed text-sm" />
          </div>
        )}
      </div>
    </div>
  );
}
