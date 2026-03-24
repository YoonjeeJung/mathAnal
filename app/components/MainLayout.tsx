'use client';

import { useState, useMemo } from 'react';
import { Problem, ExamInfo, TreeNode } from '../types';
import {
  buildTreeForCurriculum,
  filterProblems,
  getUnit3IdsForCurriculum,
} from '../utils/treeBuilder';
import TreeSidebar from './TreeSidebar';
import ProblemList from './ProblemList';
import ProblemDetail from './ProblemDetail';
import UnitTypeInfo from './UnitTypeInfo';

interface Props {
  problems: Problem[];
  csvRaw: string;
  exams: ExamInfo[];
}

export default function MainLayout({ problems, csvRaw, exams }: Props) {
  const examMap = useMemo(
    () => new Map(exams.map((e) => [e.exam_id, e])),
    [exams]
  );

  const curriIdToName = useMemo(() => {
    const map = new Map<string, string>();
    for (const line of csvRaw.trim().split('\n').slice(1)) {
      const cols = line.split(',');
      const cid = cols[0]?.trim();
      const cname = cols[1]?.trim();
      if (cid && cname && !map.has(cid)) map.set(cid, cname);
    }
    return map;
  }, [csvRaw]);

  const curricula = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const exam of exams) {
      const cname = curriIdToName.get(exam.curriculum_id);
      if (cname && !seen.has(cname)) {
        seen.add(cname);
        result.push(cname);
      }
    }
    return result;
  }, [exams, curriIdToName]);

  const [selectedExamIds, setSelectedExamIds] = useState<string[]>([]);
  const [selectedCurriculum, setSelectedCurriculum] = useState<string>(curricula[0] ?? '');
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);

  const curriculumProblems = useMemo(() => {
    if (!selectedCurriculum) return problems;
    const unit3Ids = getUnit3IdsForCurriculum(selectedCurriculum, csvRaw);
    return problems.filter((p) =>
      p.unit_candidates.some((uc) => unit3Ids.has(uc.unit_id))
    );
  }, [selectedCurriculum, problems, csvRaw]);

  const examFilteredProblems = useMemo(() => {
    if (selectedExamIds.length === 0) return curriculumProblems;
    return curriculumProblems.filter((p) => selectedExamIds.includes(p.exam_id));
  }, [curriculumProblems, selectedExamIds]);

  const tree = useMemo(
    () => buildTreeForCurriculum(selectedCurriculum, examFilteredProblems, csvRaw),
    [selectedCurriculum, examFilteredProblems, csvRaw]
  );

  const filteredProblems = useMemo(
    () => filterProblems(examFilteredProblems, selectedNode),
    [examFilteredProblems, selectedNode]
  );

  const handleToggleExam = (examId: string) => {
    setSelectedExamIds((prev) => {
      const next = prev.includes(examId) ? prev.filter((id) => id !== examId) : [...prev, examId];
      // Auto-select curriculum from first selected exam
      if (next.length > 0) {
        const exam = examMap.get(next[0]);
        if (exam) {
          const cname = curriIdToName.get(exam.curriculum_id);
          if (cname) setSelectedCurriculum(cname);
        }
      }
      return next;
    });
    setSelectedNode(null);
    setSelectedProblem(null);
  };

  const handleClearExams = () => {
    setSelectedExamIds([]);
    setSelectedNode(null);
    setSelectedProblem(null);
  };

  const handleSelectCurriculum = (c: string) => {
    setSelectedCurriculum(c);
    setSelectedExamIds([]);
    setSelectedNode(null);
    setSelectedProblem(null);
  };

  const handleSelectNode = (node: TreeNode) => {
    setSelectedNode(node);
    setSelectedProblem(null);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50 px-5 pt-4">
      {/* Header */}
      <div className="shrink-0 pb-3">
        <h1 className="text-lg font-semibold text-gray-800 tracking-tight">내신기출 유형 분석</h1>
      </div>

      {/* Main content */}
      <div className="flex flex-1 min-h-0 overflow-hidden rounded-t-xl border border-gray-200 bg-white">
      {/* Col 1: Tree sidebar */}
      <div className="w-96 shrink-0 border-r border-gray-200 flex flex-col overflow-hidden">
        <TreeSidebar
          exams={exams}
          selectedExamIds={selectedExamIds}
          onToggleExam={handleToggleExam}
          onClearExams={handleClearExams}
          curricula={curricula}
          selectedCurriculum={selectedCurriculum}
          onSelectCurriculum={handleSelectCurriculum}
          tree={tree}
          selectedNode={selectedNode}
          onSelect={handleSelectNode}
          onClearSelection={() => { setSelectedNode(null); setSelectedProblem(null); }}
        />
      </div>

      {/* Col 2: Problem list */}
      <div className="w-[390px] shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
        <ProblemList
          problems={filteredProblems}
          examMap={examMap}
          selectedId={selectedProblem?.problem_id ?? null}
          onSelect={setSelectedProblem}
        />
      </div>

      {/* Col 3: Problem detail */}
      <div className="flex-1 min-w-0 border-r border-gray-200 overflow-hidden">
        <ProblemDetail problem={selectedProblem} />
      </div>

      {/* Col 4: Unit/type info */}
      <div className="w-72 shrink-0 bg-white overflow-hidden">
        <UnitTypeInfo problem={selectedProblem} csvRaw={csvRaw} />
      </div>
    </div>
    </div>
  );
}
