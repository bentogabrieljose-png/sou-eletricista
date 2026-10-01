import {
  CheckCircle2,
  Clock3,
  ExternalLink,
  FolderOpen,
  LockKeyhole,
  PlayCircle,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export function MaterialProgressPanel({
  accessCode,
  courseStarted,
  courseUrl,
  libraryUrl,
}: {
  accessCode: string;
  courseStarted: boolean;
  courseUrl?: string;
  libraryUrl?: string;
}) {
  const progressQuery = trpc.student.materialProgress.useQuery(
    { accessCode },
    { enabled: Boolean(accessCode), staleTime: 10000 }
  );
  const markViewed = trpc.student.markMaterialViewed.useMutation({
    onSuccess: () => progressQuery.refetch(),
  });
  const progress = progressQuery.data ?? [];
  const courseViewed =
    courseStarted || progress.some(item => item.materialKey === "course-core");
  const libraryViewed = progress.some(
    item => item.materialKey === "drive-library"
  );
  const viewedCount = Number(courseViewed) + Number(libraryViewed);
  const percent = Math.round((viewedCount / 2) * 100);

  const openMaterial = (key: string, title: string, url: string) => {
    markViewed.mutate({
      accessCode,
      materialKey: key,
      materialTitle: title,
      resourceUrl: url,
    });
    window.open(url, "_blank", "noopener,noreferrer");
    toast.success(`${title} registado no seu progresso.`);
  };

  return (
    <section className="mt-8 rounded-[2rem] border border-blue-100 bg-white p-7 shadow-sm dark:border-white/10 dark:bg-white/5">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="eyebrow">Acompanhe a sua evolução</p>
          <h2 className="mt-3 font-display text-2xl font-black">
            Progresso dos materiais
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            Consulte os materiais e encontre aqui o histórico do que já abriu.
          </p>
        </div>
        <div className="min-w-44 rounded-2xl bg-[#eef5ff] p-4 dark:bg-[#0e2a56]">
          <div className="flex items-center justify-between text-xs font-bold">
            <span>{viewedCount} de 2 consultados</span>
            <span className="text-[#0b45ad] dark:text-[#ffd326]">
              {percent}%
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-blue-100 dark:bg-white/10">
            <div
              className="h-full rounded-full bg-[#f3bd08] transition-[width] duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <button
          type="button"
          onClick={() =>
            courseUrl ? openMaterial("course-core", "Formação principal", courseUrl) : toast.error("O material deste curso não está disponível. Contacte a Coordenação.")
          }
          className="group flex items-start gap-4 rounded-2xl border border-blue-100 p-5 text-left transition duration-200 hover:-translate-y-0.5 hover:border-[#0b45ad] hover:shadow-md dark:border-white/10"
        >
          <span className="rounded-2xl bg-[#0b45ad] p-3 text-white">
            <PlayCircle className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center justify-between gap-3 font-bold">
              <span>Formação principal</span>
              {courseViewed ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
              ) : (
                <LockKeyhole className="h-4 w-4 shrink-0 text-slate-400" />
              )}
            </span>
            <span className="mt-1 block text-sm text-slate-500">
              Vídeo e material-base do curso.
            </span>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-extrabold text-[#0b45ad] dark:text-[#ffd326]">
              {courseViewed ? "Consultado" : "Abrir material"}{" "}
              <ExternalLink className="h-3 w-3" />
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => libraryUrl ? openMaterial("drive-library", "Drive Biblioteca", libraryUrl) : toast.error("Biblioteca indisponível. Aguarde a autorização de acesso ou contacte a Coordenação.")}
          className="group flex items-start gap-4 rounded-2xl border border-[#f3bd08]/60 bg-[#fffaf0] p-5 text-left transition duration-200 hover:-translate-y-0.5 hover:border-[#e0a900] hover:shadow-md dark:bg-[#2b250b]/30"
        >
          <span className="rounded-2xl bg-[#f3bd08] p-3 text-[#082d70]">
            <FolderOpen className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center justify-between gap-3 font-bold">
              <span>Drive Biblioteca</span>
              {libraryViewed ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
              ) : (
                <Clock3 className="h-4 w-4 shrink-0 text-[#b27d00]" />
              )}
            </span>
            <span className="mt-1 block text-sm text-slate-600 dark:text-slate-300">
              Vídeos práticos e livros em PDF.
            </span>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-extrabold text-[#0b45ad] dark:text-[#ffd326]">
              {libraryViewed ? "Consultado" : "Abrir biblioteca"}{" "}
              <ExternalLink className="h-3 w-3" />
            </span>
          </span>
        </button>
      </div>
    </section>
  );
}
