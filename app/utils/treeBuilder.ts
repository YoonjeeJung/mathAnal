import { Problem, CurriRow, TreeNode } from '../types';

function parseCsv(raw: string): CurriRow[] {
  const lines = raw.trim().split('\n');
  const headers = lines[0].split(',').map((h) => h.replace(/"/g, '').trim());
  return lines.slice(1).map((line) => {
    // Handle quoted fields
    const cols: string[] = [];
    let current = '';
    let inQuote = false;
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote; }
      else if (ch === ',' && !inQuote) { cols.push(current.trim()); current = ''; }
      else { current += ch; }
    }
    cols.push(current.trim());
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = cols[i] ?? ''; });
    return {
      curriculum_id: obj['curriculum_id'],
      curriculum_name: obj['curriculum_name'],
      unit_id_1: obj['unit_id_1'],
      unit_name_1: obj['unit_name_1'],
      unit_id_2: obj['unit_id_2'],
      unit_name_2: obj['unit_name_2'],
      unit_id_3: obj['unit_id_3'],
      unit_name_3: obj['unit_name_3'],
      category_id: obj['categry_id'],  // typo in CSV
      category_name: obj['category_name'],
    } as CurriRow;
  });
}

export function buildTreeForCurriculum(
  curriculum: string,
  problems: Problem[],
  csvRaw: string
): TreeNode[] {
  const rows = parseCsv(csvRaw).filter((r) => r.curriculum_name === curriculum);

  // Count problems per unit3 and per (unit3 + category)
  const unit3ProblemIds = new Map<number, Set<number>>();
  const catProblemIds = new Map<number, Map<string, Set<number>>>();

  for (const prob of problems) {
    for (const uc of prob.unit_candidates) {
      const uid = uc.unit_id;
      if (!unit3ProblemIds.has(uid)) unit3ProblemIds.set(uid, new Set());
      unit3ProblemIds.get(uid)!.add(prob.problem_id);

      if (uc.valid_categories.length === 0) {
        // "유형 없음" bucket
        if (!catProblemIds.has(uid)) catProblemIds.set(uid, new Map());
        const m = catProblemIds.get(uid)!;
        if (!m.has('__none__')) m.set('__none__', new Set());
        m.get('__none__')!.add(prob.problem_id);
      } else {
        for (const cat of uc.valid_categories) {
          if (!catProblemIds.has(uid)) catProblemIds.set(uid, new Map());
          const m = catProblemIds.get(uid)!;
          if (!m.has(cat.category_name)) m.set(cat.category_name, new Set());
          m.get(cat.category_name)!.add(prob.problem_id);
        }
      }
    }
  }

  // Build: unit1 → unit2 → unit3 → category
  // Use ordered Maps to preserve first-seen order from CSV (which is already sorted)
  type Unit3Entry = { id: string; name: string; uid3: number };
  type Unit2Entry = { id: string; name: string; unit3s: Map<number, Unit3Entry> };
  type Unit1Entry = { id: string; name: string; unit2s: Map<string, Unit2Entry> };
  const unit1Map = new Map<string, Unit1Entry>();

  for (const row of rows) {
    const uid3 = parseInt(row.unit_id_3);
    // Only include unit3s that appear in problems
    if (!unit3ProblemIds.has(uid3)) continue;

    const u1key = row.unit_id_1;
    if (!unit1Map.has(u1key)) {
      unit1Map.set(u1key, { id: `u1-${u1key}`, name: row.unit_name_1, unit2s: new Map() });
    }
    const u1 = unit1Map.get(u1key)!;

    const u2key = row.unit_id_2;
    if (!u1.unit2s.has(u2key)) {
      u1.unit2s.set(u2key, { id: `u2-${u2key}`, name: row.unit_name_2, unit3s: new Map() });
    }
    const u2 = u1.unit2s.get(u2key)!;

    if (!u2.unit3s.has(uid3)) {
      u2.unit3s.set(uid3, { id: `u3-${uid3}`, name: row.unit_name_3, uid3 });
    }
  }

  // Build TreeNode list
  const tree: TreeNode[] = [];

  for (const u1 of unit1Map.values()) {
    const u2Nodes: TreeNode[] = [];
    let u1Count = 0;

    for (const u2 of u1.unit2s.values()) {
      const u3Nodes: TreeNode[] = [];
      let u2Count = 0;

      for (const u3 of u2.unit3s.values()) {
        const uid3 = u3.uid3;
        const u3Count = unit3ProblemIds.get(uid3)?.size ?? 0;
        const catMap = catProblemIds.get(uid3) ?? new Map();

        const catNodes: TreeNode[] = [];
        const sortedCats = Array.from(catMap.entries()).sort(([a], [b]) => {
          if (a === '__none__') return 1;
          if (b === '__none__') return -1;
          return a.localeCompare(b);
        });
        for (const [catName, catSet] of sortedCats) {
          catNodes.push({
            id: catName === '__none__' ? `cat-none-${uid3}` : `cat-${uid3}-${catName}`,
            label: catName === '__none__' ? '유형 없음' : catName,
            count: catSet.size,
            children: [],
            type: 'category',
            unit3Id: uid3,
            categoryName: catName === '__none__' ? undefined : catName,
          });
        }

        u3Nodes.push({
          id: u3.id,
          label: u3.name,
          count: u3Count,
          children: catNodes,
          type: 'unit3',
          unit3Id: uid3,
        });
        u2Count += u3Count;
      }

      u2Nodes.push({
        id: u2.id,
        label: u2.name,
        count: u2Count,
        children: u3Nodes,
        type: 'unit2',
      });
      u1Count += u2Count;
    }

    tree.push({
      id: u1.id,
      label: u1.name,
      count: u1Count,
      children: u2Nodes,
      type: 'unit1',
    });
  }

  return tree;
}

export function filterProblems(problems: Problem[], node: TreeNode | null): Problem[] {
  if (!node) return problems;

  if (node.type === 'unit1') {
    // filter by all unit3Ids under this node
    const unit3Ids = collectUnit3Ids(node);
    return problems.filter((p) =>
      p.unit_candidates.some((uc) => unit3Ids.has(uc.unit_id))
    );
  }

  if (node.type === 'unit2') {
    const unit3Ids = collectUnit3Ids(node);
    return problems.filter((p) =>
      p.unit_candidates.some((uc) => unit3Ids.has(uc.unit_id))
    );
  }

  if (node.type === 'unit3') {
    return problems.filter((p) =>
      p.unit_candidates.some((uc) => uc.unit_id === node.unit3Id)
    );
  }

  if (node.type === 'category') {
    if (!node.categoryName) {
      // "유형 없음"
      return problems.filter((p) =>
        p.unit_candidates.some(
          (uc) => uc.unit_id === node.unit3Id && uc.valid_categories.length === 0
        )
      );
    }
    return problems.filter((p) =>
      p.unit_candidates.some(
        (uc) =>
          uc.unit_id === node.unit3Id &&
          uc.valid_categories.some((c) => c.category_name === node.categoryName)
      )
    );
  }

  return problems;
}

function collectUnit3Ids(node: TreeNode): Set<number> {
  const ids = new Set<number>();
  const visit = (n: TreeNode) => {
    if (n.unit3Id !== undefined && n.type === 'unit3') ids.add(n.unit3Id);
    for (const child of n.children) visit(child);
  };
  visit(node);
  return ids;
}

export function getCurriculaFromCsv(csvRaw: string): string[] {
  const rows = parseCsv(csvRaw);
  const seen = new Set<string>();
  const result: string[] = [];
  for (const row of rows) {
    if (!seen.has(row.curriculum_name)) {
      seen.add(row.curriculum_name);
      result.push(row.curriculum_name);
    }
  }
  return result;
}

export function getUnit3IdsForCurriculum(curriculum: string, csvRaw: string): Set<number> {
  const rows = parseCsv(csvRaw).filter((r) => r.curriculum_name === curriculum);
  return new Set(rows.map((r) => parseInt(r.unit_id_3)).filter(Boolean));
}

export function getCurriculaInData(problems: Problem[], csvRaw: string): string[] {
  const rows = parseCsv(csvRaw);
  const unit3ToCurriculum = new Map<number, string>();
  for (const row of rows) {
    const uid3 = parseInt(row.unit_id_3);
    if (!unit3ToCurriculum.has(uid3)) unit3ToCurriculum.set(uid3, row.curriculum_name);
  }

  const seen = new Set<string>();
  const result: string[] = [];
  const allCurricula = getCurriculaFromCsv(csvRaw);

  for (const prob of problems) {
    for (const uc of prob.unit_candidates) {
      const c = unit3ToCurriculum.get(uc.unit_id);
      if (c && !seen.has(c)) {
        seen.add(c);
      }
    }
  }

  // Return in CSV order
  return allCurricula.filter((c) => seen.has(c));
}
