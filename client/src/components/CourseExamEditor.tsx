import type { CourseExamQuestion } from "@shared/course";

export const blankCourseExam = (): CourseExamQuestion[] => Array.from({ length: 10 }, () => ({ question: "", options: ["", "", "", ""] as [string, string, string, string], correctIndex: -1 }));

export function CourseExamEditor({ questions, onChange }: { questions: CourseExamQuestion[]; onChange: (questions: CourseExamQuestion[]) => void }) {
  const update = (index: number, patch: Partial<CourseExamQuestion>) => onChange(questions.map((question, position) => position === index ? { ...question, ...patch } : question));
  return <details className="rounded-2xl border border-blue-100 p-4 dark:border-white/10" open>
    <summary className="cursor-pointer font-extrabold text-[#0b45ad] dark:text-blue-100">Teste específico deste curso · 10 questões obrigatórias</summary>
    <p className="mt-2 text-xs leading-5 text-slate-500">Confirme as quatro respostas e a correta em cada questão. Este teste é usado apenas pelos alunos inscritos neste curso.</p>
    <div className="mt-4 max-h-[32rem] space-y-5 overflow-y-auto pr-1">{questions.map((item, index) => <fieldset key={index} className="rounded-xl border border-blue-100 p-3 dark:border-white/10"><legend className="px-1 text-sm font-bold">Questão {index + 1}</legend><input className="field-input" aria-label={`Questão ${index + 1}`} value={item.question} minLength={10} maxLength={500} placeholder="Enunciado da questão" required onChange={event => update(index, { question: event.target.value })} /><div className="mt-3 grid gap-2 sm:grid-cols-2">{item.options.map((option, choice) => <input key={choice} className="field-input" aria-label={`Questão ${index + 1}, opção ${choice + 1}`} value={option} maxLength={250} placeholder={`Opção ${choice + 1}`} required onChange={event => { const options = [...item.options] as [string, string, string, string]; options[choice] = event.target.value; update(index, { options }); }} />)}</div><label className="mt-3 block text-xs font-bold text-slate-500">Resposta correta<select className="field-input mt-1" value={item.correctIndex} onChange={event => update(index, { correctIndex: Number(event.target.value) })}><option value={-1} disabled>Escolha a opção correta</option>{item.options.map((_, choice) => <option key={choice} value={choice}>Opção {choice + 1}</option>)}</select></label></fieldset>)}</div>
  </details>;
}
