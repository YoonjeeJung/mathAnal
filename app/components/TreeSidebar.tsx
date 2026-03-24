'use client';

import { useState } from 'react';
import { TreeNode, ExamInfo } from '../types';

interface Props {
  exams: ExamInfo[];
  selectedExamIds: string[];
  onToggleExam: (examId: string) => void;
  onClearExams: () => void;
  curricula: string[];
  selectedCurriculum: string;
  onSelectCurriculum: (c: string) => void;
  tree: TreeNode[];
  selectedNode: TreeNode | null;
  onSelect: (node: TreeNode) => void;
  onClearSelection: () => void;
}

function TreeItem({
  node,
  depth,
  selectedNode,
  onSelect,
  forceOpen,
}: {
  node: TreeNode;
  depth: number;
  selectedNode: TreeNode | null;
  onSelect: (node: TreeNode) => void;
  forceOpen: boolean | null;
}) {
  const [localOpen, setLocalOpen] = useState(depth < 1);
  const isOpen = forceOpen !== null ? forceOpen : localOpen;
  const hasChildren = node.children.length > 0;
  const isSelected = selectedNode?.id === node.id;
  const isLeaf = node.type === 'category';

  const paddingLeft = depth * 14 + 8;

  return (
    <div>
      <div
        className={`flex items-center gap-1 py-[3px] pr-2 rounded text-sm hover:bg-gray-100 ${
          isSelected ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700'
        }`}
        style={{ paddingLeft }}
      >
        {hasChildren && (
          <span
            className="text-[10px] text-gray-400 w-3 shrink-0 leading-none cursor-pointer"
            onClick={(e) => { e.stopPropagation(); setLocalOpen((v) => !v); }}
          >
            {isOpen ? '▾' : '▸'}
          </span>
        )}
        {!hasChildren && <span className="w-3 shrink-0" />}
        <span
          className={`flex-1 truncate cursor-pointer ${isLeaf ? 'text-gray-500' : ''}`}
          onClick={() => onSelect(node)}
        >{node.label}</span>
        <span className={`text-xs shrink-0 ${isLeaf ? 'text-gray-600' : 'text-gray-400'}`}>({node.count})</span>
      </div>
      {hasChildren && isOpen && (
        <div>
          {node.children.map((child) => (
            <TreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedNode={selectedNode}
              onSelect={onSelect}
              forceOpen={forceOpen}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DropdownToggle({
  label,
  isOpen,
  onClick,
}: {
  label: string;
  isOpen: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
      onClick={onClick}
    >
      <span>{label}</span>
      <span className="text-xs text-gray-400">{isOpen ? '▲' : '▼'}</span>
    </button>
  );
}

export default function TreeSidebar({
  exams,
  selectedExamIds,
  onToggleExam,
  onClearExams,
  curricula,
  selectedCurriculum,
  onSelectCurriculum,
  tree,
  selectedNode,
  onSelect,
  onClearSelection,
}: Props) {
  const [forceOpen, setForceOpen] = useState<boolean | null>(null);
  const [showExamMenu, setShowExamMenu] = useState(false);
  const [showCurriculumMenu, setShowCurriculumMenu] = useState(false);

  // curriculum_id of selected exams (all same once locked)
  const lockedCurriculumId = selectedExamIds.length > 0
    ? exams.find((e) => e.exam_id === selectedExamIds[0])?.curriculum_id ?? null
    : null;

  const examLabel =
    selectedExamIds.length === 0
      ? '시험지 선택'
      : selectedExamIds.length === 1
      ? (exams.find((e) => e.exam_id === selectedExamIds[0])?.exam_name ?? '시험지 선택')
      : `시험지 ${selectedExamIds.length}개 선택`;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Exam selector */}
      <div className="shrink-0 border-b border-gray-200">
        <DropdownToggle
          label={examLabel}
          isOpen={showExamMenu}
          onClick={() => {
            setShowExamMenu((v) => !v);
            setShowCurriculumMenu(false);
          }}
        />
        {showExamMenu && (
          <div className="border-t border-gray-100 max-h-52 overflow-y-auto">
            <button
              className={`w-full text-left px-4 py-1.5 text-sm hover:bg-gray-50 ${
                selectedExamIds.length === 0 ? 'text-indigo-600 font-medium bg-indigo-50' : 'text-gray-400'
              }`}
              onClick={() => {
                onClearExams();
              }}
            >
              전체
            </button>
            {exams.map((e) => {
              const isChecked = selectedExamIds.includes(e.exam_id);
              const isDisabled = lockedCurriculumId !== null && e.curriculum_id !== lockedCurriculumId;
              return (
                <label
                  key={e.exam_id}
                  className={`flex items-center gap-2 px-4 py-1.5 text-sm cursor-pointer ${
                    isDisabled
                      ? 'text-gray-300 cursor-not-allowed'
                      : isChecked
                      ? 'text-indigo-600 font-medium bg-indigo-50 hover:bg-indigo-50'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    disabled={isDisabled}
                    onChange={() => !isDisabled && onToggleExam(e.exam_id)}
                    className="shrink-0 accent-indigo-600"
                  />
                  {e.exam_name}
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* Curriculum selector */}
      <div className="shrink-0 border-b border-gray-200">
        <DropdownToggle
          label={selectedCurriculum || '과목 선택'}
          isOpen={showCurriculumMenu}
          onClick={() => {
            setShowCurriculumMenu((v) => !v);
            setShowExamMenu(false);
          }}
        />
        {showCurriculumMenu && (
          <div className="border-t border-gray-100 max-h-48 overflow-y-auto">
            {curricula.map((c) => (
              <button
                key={c}
                className={`w-full text-left px-4 py-1.5 text-sm hover:bg-gray-50 ${
                  c === selectedCurriculum ? 'text-indigo-600 font-medium bg-indigo-50' : 'text-gray-600'
                }`}
                onClick={() => {
                  onSelectCurriculum(c);
                  setShowCurriculumMenu(false);
                }}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tree controls */}
      <div className="flex justify-end gap-3 px-2 py-1.5 border-b border-gray-100 shrink-0">
        <button className="text-xs text-gray-400 hover:text-gray-600" onClick={() => setForceOpen(true)}>
          전체열기
        </button>
        <button className="text-xs text-gray-400 hover:text-gray-600" onClick={() => setForceOpen(false)}>
          전체닫기
        </button>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto py-1">
        {selectedCurriculum && (
          <button
            className={`w-full text-left px-3 py-2 text-sm font-semibold hover:bg-gray-50 ${
              selectedNode === null ? 'text-indigo-600' : 'text-gray-700'
            }`}
            onClick={onClearSelection}
          >
            {selectedCurriculum}
          </button>
        )}
        {tree.map((node) => (
          <TreeItem
            key={node.id}
            node={node}
            depth={0}
            selectedNode={selectedNode}
            onSelect={onSelect}
            forceOpen={forceOpen}
          />
        ))}
      </div>
    </div>
  );
}
