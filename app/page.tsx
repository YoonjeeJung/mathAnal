import { readFileSync } from 'fs';
import { join } from 'path';
import { Problem, ExamInfo } from './types';
import MainLayout from './components/MainLayout';

function loadData() {
  const problemsRaw = readFileSync(join(process.cwd(), 'public/data/problems.json'), 'utf-8');
  const csvRaw = readFileSync(join(process.cwd(), 'public/data/curriUnitCategory.csv'), 'utf-8');
  const examsRaw = readFileSync(join(process.cwd(), 'public/data/exams.json'), 'utf-8');

  const curriIdToName = new Map<string, string>();
  for (const line of csvRaw.trim().split('\n').slice(1)) {
    const cols = line.split(',');
    const cid = cols[0]?.trim();
    const cname = cols[1]?.trim();
    if (cid && cname && !curriIdToName.has(cid)) curriIdToName.set(cid, cname);
  }

  const exams: ExamInfo[] = (JSON.parse(examsRaw) as ExamInfo[]).map((e) => ({
    ...e,
    curriculum_name: curriIdToName.get(e.curriculum_id) ?? '',
  }));

  return {
    problems: JSON.parse(problemsRaw) as Problem[],
    csvRaw,
    exams,
  };
}

export default function Home() {
  const { problems, csvRaw, exams } = loadData();
  return <MainLayout problems={problems} csvRaw={csvRaw} exams={exams} />;
}
