export interface Category {
  category_id: number;
  category_name: string;
}

export interface UnitCandidate {
  unit_id: number;
  confidence_score: number;
  valid_categories: Category[];
}

export interface Problem {
  exam_id: string;
  problem_id: number;
  problem_name: string;
  original_problem_name: string;
  parent_problem_name: string;
  is_subproblem: boolean;
  problem_description: string;
  problem_type: string;
  score: string;
  choices: string[];
  bbox_ids: string[];
  images: string[];
  solution: string;
  answer: string;
  difficulty: number;
  behavior_area: string;
  behavior_reason: string;
  unit_candidates: UnitCandidate[];
}

export interface UnitKnowledge {
  unit_id: number;
  unit_name: string;
  knowledge_id: number;
  knowledge_name: string;
  curriculum_name: string;
}

export interface ExamInfo {
  exam_id: string;
  exam_name: string;
  curriculum_id: string;
}

// CSV row: curriculum → 대단원 → 중단원 → 소단원 → 유형
export interface CurriRow {
  curriculum_id: string;
  curriculum_name: string;
  unit_id_1: string;
  unit_name_1: string;
  unit_id_2: string;
  unit_name_2: string;
  unit_id_3: string;
  unit_name_3: string;
  category_id: string;
  category_name: string;
}

export type TreeNodeType = 'unit1' | 'unit2' | 'unit3' | 'category';

export interface TreeNode {
  id: string;
  label: string;
  count: number;
  children: TreeNode[];
  type: TreeNodeType;
  unit3Id?: number;
  categoryName?: string;
}
