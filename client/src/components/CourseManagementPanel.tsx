import { FormEvent, useEffect, useState } from "react";
import { BookOpen, ExternalLink, Link2 } from "lucide-react";
import type { CourseExamQuestion } from "@shared/course";
import { CourseExamEditor } from "./CourseExamEditor";

type CourseSummary = { id: number; title: string; slug: string; description: string; hours: number; lessonUrl: string; active: number };
type CourseForm = { title: string; slug: string; description: string; hours: string; lessonUrl: string; examQuestions: CourseExamQuestion[] };

type Props = {
  courses: CourseSummary[];
  loading: boolean;
  form: CourseForm;
  setForm: (form: CourseForm) => void;
  creating: boolean;
  onCreate: (event: FormEvent<HTMLFormElement>) => void;
  onUpdateLink: (id: number, lessonUrl: string) => void;
  updating: boolean;
};

function CourseLinkCard({ course, onUpdateLink, updating }: Pick<Props, "onUpdateLink" | "updating"> & { course: CourseSummary }) {
  const [link, setLink] = useState(course.lessonUrl);
  useEffect(() => setLink(course.lessonUrl), [course.lessonUrl]);
  const changed = link.trim() !== course.lessonUrl;
  return (
    <article className="rounded-2xl border border-blue-100 bg-[#f8fbff] p-5 dark:border-white/10 dark:bg-white/5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0"><h3 className="font-display text-lg font-black">{course.title}</h3><p className="mt-1 text-xs text-slate-500">{course.slug} · {course.hours} horas</p></div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${course.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>{course.active ? "Em execução" : "Inativo"}</span>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{course.description}</p>
      <form className="mt-4" onSubmit={event => { event.preventDefault(); if (changed) onUpdateLink(course.id, link.trim()); }}>
        <label className="text-xs font-bold text-slate-500"><Link2 className="mr-1 inline h-3.5 w-3.5" /> Link das aulas deste curso
          <input className="field-input mt-2" type="url" pattern="https?://.*" title="Introduza um endereço HTTP ou HTTPS" value={link} onChange={event => setLink(event.target.value)} required />
        </label>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <button disabled={!changed || updating} className="rounded-full bg-[#0b45ad] px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">Guardar link</button>
          <a href={course.lessonUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 break-all text-sm font-bold text-[#0b45ad] underline dark:text-blue-200">Abrir aulas <ExternalLink className="h-3.5 w-3.5 shrink-0" /></a>
        </div>
      </form>
    </article>
  );
}

export function CourseManagementPanel({ courses, loading, form, setForm, creating, onCreate, onUpdateLink, updating }: Props) {
  const activeCount = courses.filter(course => course.active).length;
  return (
    <section className="mt-8 grid gap-8 lg:grid-cols-[1fr_1fr]" aria-labelledby="course-management-heading">
      <div className="rounded-[2rem] border border-blue-100 bg-white p-6 dark:border-white/10 dark:bg-white/5">
        <p className="eyebrow">Catálogo da formação</p><h2 id="course-management-heading" className="mt-2 font-display text-2xl font-black">Gestão de cursos</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">Cada formando recebe o link da aula e o teste do curso em que se inscreveu. É possível ter até três cursos ativos; não é necessário cadastrar outro agora.</p>
        <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm font-bold text-[#0b45ad] dark:bg-white/10 dark:text-blue-100"><BookOpen className="h-4 w-4" /> {activeCount} de 3 cursos ativos</div>
        <div className="mt-6 space-y-4">{loading ? <p className="text-sm text-slate-500">A carregar cursos…</p> : courses.length ? courses.map(course => <CourseLinkCard key={course.id} course={course} onUpdateLink={onUpdateLink} updating={updating} />) : <p className="text-sm text-slate-500">Ainda não existem cursos cadastrados.</p>}</div>
      </div>
      <form onSubmit={onCreate} className="rounded-[2rem] border border-blue-100 bg-white p-6 dark:border-white/10 dark:bg-white/5">
        <p className="eyebrow">Expansão preparada</p><h2 className="mt-2 font-display text-2xl font-black">Cadastrar novo curso</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">Quando estiver pronto para abrir outro curso, preencha os dados, o link próprio das aulas e dez questões com o respetivo gabarito. Os cursos atuais não são alterados.</p>
        {activeCount >= 3 && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-800">A plataforma já tem três cursos em execução. Não é possível cadastrar outro ativo neste momento.</p>}
        <fieldset disabled={activeCount >= 3 || creating} className="mt-6 space-y-4 disabled:opacity-60">
          <label className="block text-sm font-bold">Nome do curso<input className="field-input mt-1" value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} required minLength={3} /></label>
          <label className="block text-sm font-bold">Identificador único (slug)<input className="field-input mt-1" value={form.slug} onChange={event => setForm({ ...form, slug: event.target.value })} pattern="[a-z0-9-]+" placeholder="ex.: instalacoes-industriais" required minLength={3} /></label>
          <label className="block text-sm font-bold">Descrição<textarea className="field-input mt-1 min-h-24" value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} required minLength={10} /></label>
          <div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm font-bold">Duração (horas)<input className="field-input mt-1" type="number" min="1" value={form.hours} onChange={event => setForm({ ...form, hours: event.target.value })} required /></label><label className="block text-sm font-bold">Link das aulas<input className="field-input mt-1" type="url" pattern="https?://.*" value={form.lessonUrl} onChange={event => setForm({ ...form, lessonUrl: event.target.value })} required /></label></div>
          <CourseExamEditor questions={form.examQuestions} onChange={examQuestions => setForm({ ...form, examQuestions })} />
          <button className="rounded-full bg-[#0b45ad] px-5 py-3 font-extrabold text-white disabled:opacity-50">{creating ? "A cadastrar…" : "Cadastrar curso"}</button>
        </fieldset>
      </form>
    </section>
  );
}
