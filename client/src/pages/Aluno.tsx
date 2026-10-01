import { FormEvent, useEffect, useState } from "react";
import { Link } from "wouter";
import { formatExamCountdown } from "@shared/course";
import {
  Bot,
  BookOpen,
  CheckCircle2,
  Clock3,
  Download,
  ExternalLink,
  FileBadge2,
  FolderOpen,
  LockKeyhole,
  NotebookPen,
  LogOut,
  MessageCircle,
  Send,
  Sparkles,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { LoadingState } from "@/components/PageLoader";
import { MaterialProgressPanel } from "@/components/MaterialProgressPanel";
import { NotebookPanel } from "@/components/NotebookPanel";
import { StudentRankingPanel } from "@/components/StudentRankingPanel";
import { StudentCertificatePanel } from "@/components/StudentCertificatePanel";

const LOGO = "/manus-storage/sou-eletricista-logo_a1bfc7b7.png";

export default function Aluno() {
  const [accessCode, setAccessCode] = useState(
    () => localStorage.getItem("sou-eletricista-access") || ""
  );
  const [draftCode, setDraftCode] = useState(accessCode);
  const [lookupTimedOut, setLookupTimedOut] = useState(false);
  const [studentSession, setStudentSession] = useState<any>(null);
  const [showExam, setShowExam] = useState(false);
  const [clockNow, setClockNow] = useState(() => Date.now());
  const [answers, setAnswers] = useState<number[]>(Array(10).fill(-1));
  const [activeTab, setActiveTab] = useState<
    "overview" | "messages" | "assistant" | "notebook" | "certificates" | "ranking"
  >("overview");
  const [chat, setChat] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);
  const [question, setQuestion] = useState("");
  const [messageSubject, setMessageSubject] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const studentQuery = trpc.student.getByCode.useQuery(
    { accessCode: accessCode || "invalid" },
    {
      enabled: Boolean(accessCode),
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: 30000,
      refetchInterval: 15000,
    }
  );
  const studentLogin = trpc.student.login.useMutation({
    onSuccess: data => {
      const code =
        data.application.accessCode || data.application.applicationNumber;
      setStudentSession(data);
      setAccessCode(code);
      setDraftCode(code);
      localStorage.setItem("sou-eletricista-access", code);
      setShowExam(false);
      toast.success("Acesso confirmado. Bem-vindo à sua sala de aprendizagem.");
    },
    onError: error => toast.error(error.message),
  });
  const student = studentQuery.data || studentSession;
  const courseQuery = trpc.student.course.useQuery({ accessCode: accessCode || "invalid" }, { enabled: Boolean(accessCode) && Boolean(student) });
  const courseUrl = courseQuery.data?.lessonUrl;
  const libraryQuery = trpc.student.library.useQuery({ accessCode: accessCode || "invalid" }, { enabled: Boolean(accessCode) && Boolean(student), retry: false, staleTime: 30000 });
  const libraryUrl = libraryQuery.data?.url;
  const examQuery = trpc.student.exam.useQuery(
    { accessCode: accessCode || "invalid" },
    { enabled: showExam && Boolean(accessCode) }
  );
  const messagesQuery = trpc.student.messages.useQuery(
    { accessCode: accessCode || "invalid" },
    { enabled: activeTab === "messages" && Boolean(accessCode) }
  );
  const startCourse = trpc.student.startCourse.useMutation({
    onSuccess: data => {
      studentQuery.refetch();
      toast.success(
        "Início da formação registado. O teste abre 12 horas após a aprovação da inscrição."
      );
    },
  });
  const submitExam = trpc.student.submitExam.useMutation({
    onSuccess: data => {
      studentQuery.refetch();
      setShowExam(false);
      setAnswers(Array(10).fill(-1));
      toast.success(
        `Teste submetido. Nota: ${data?.progress?.latestScore ?? 0}%`
      );
    },
    onError: error => toast.error(error.message),
  });
  const sendMessage = trpc.student.sendMessage.useMutation({
    onSuccess: () => {
      setMessageBody("");
      setMessageSubject("");
      messagesQuery.refetch();
      toast.success("Mensagem enviada à Coordenação.");
    },
  });
  const assistant = trpc.student.assistant.useMutation({
    onSuccess: data => {
      setChat(items => [...items, { role: "assistant", content: data.answer }]);
    },
    onError: error => toast.error(error.message),
  });

  useEffect(() => {
    if (student?.application?.accessCode)
      localStorage.setItem(
        "sou-eletricista-access",
        student.application.accessCode
      );
  }, [student]);
  useEffect(() => {
    if (!accessCode || !studentQuery.isLoading) {
      setLookupTimedOut(false);
      return;
    }
    const timer = window.setTimeout(() => setLookupTimedOut(true), 8000);
    return () => window.clearTimeout(timer);
  }, [accessCode, studentQuery.isLoading]);
  const unlockAt = student?.progress?.accessUnlockAt
    ? new Date(student.progress.accessUnlockAt)
    : null;
  const remaining = unlockAt ? Math.max(0, unlockAt.getTime() - clockNow) : 0;
  const isUnlocked = Boolean(unlockAt && remaining === 0);
  const remainingText = formatExamCountdown(remaining);
  const accessExpiresAt = student?.progress?.accessExpiresAt
    ? new Date(student.progress.accessExpiresAt)
    : null;
  useEffect(() => {
    if (!unlockAt || isUnlocked) return;
    setClockNow(Date.now());
    const timer = window.setInterval(() => setClockNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [unlockAt?.getTime(), isUnlocked]);

  const login = (event: FormEvent) => {
    event.preventDefault();
    const normalized = draftCode.replace(/\s+/g, "").toUpperCase();
    if (normalized.length < 5)
      return toast.error("Introduza um código válido.");
    studentLogin.mutate({ accessCode: normalized });
  };
  const doStart = () => {
    if (student?.application.accessCode && courseUrl) {
      window.open(courseUrl, "_blank", "noopener,noreferrer");
      startCourse.mutate({ accessCode: student.application.accessCode });
    } else toast.error("O material deste curso está temporariamente indisponível. Contacte a Coordenação.");
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (answers.some(answer => answer < 0))
      return toast.error("Responda a todas as questões.");
    submitExam.mutate({ accessCode, answers });
  };
  const askAssistant = (event: FormEvent) => {
    event.preventDefault();
    if (!question.trim()) return;
    const userMessage = question.trim();
    setQuestion("");
    setChat(items => [...items, { role: "user", content: userMessage }]);
    assistant.mutate({ question: userMessage, history: chat });
  };
  const send = (event: FormEvent) => {
    event.preventDefault();
    if (!messageSubject || !messageBody)
      return toast.error("Preencha o assunto e a mensagem.");
    sendMessage.mutate({
      accessCode,
      subject: messageSubject,
      body: messageBody,
    });
  };

  const lookupProblem =
    studentQuery.isError ||
    lookupTimedOut ||
    (studentQuery.isFetched && !student);
  if (!accessCode || lookupProblem)
    return (
      <div className="min-h-screen bg-[#f8fbff] px-4 py-10 text-[#12213a] dark:bg-[#07111f] dark:text-white">
        <div className="mx-auto max-w-md rounded-[2rem] border border-blue-100 bg-white p-8 text-center shadow-xl dark:border-white/10 dark:bg-white/5">
          <img
            src={LOGO}
            alt="Sou Eletricista"
            className="mx-auto h-24 w-24 rounded-full object-cover"
          />
          <p className="eyebrow mt-8">Sala de aula virtual</p>
          <h1 className="section-title mt-3">Aceda à Área do Aluno.</h1>
          {lookupProblem && accessCode && (
            <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm leading-6 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
              Não foi possível validar este código agora. Confirme o código e
              tente novamente.
            </p>
          )}
          <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Use o código gerado na inscrição. A entrada será ativada depois da
            aprovação da sua candidatura pela Coordenação.
          </p>
          <form onSubmit={login} className="mt-7 space-y-3">
            <input
              className="field-input text-center font-mono uppercase"
              value={draftCode}
              onChange={e => setDraftCode(e.target.value)}
              placeholder="SE-2026-ABC123"
            />
            <button
              disabled={studentLogin.isPending}
              className="w-full rounded-full bg-[#0b45ad] px-5 py-3.5 font-extrabold text-white disabled:opacity-60"
            >
              {studentLogin.isPending
                ? "A validar o código…"
                : "Entrar na sala de aula"}
            </button>
          </form>
          <Link
            href="/"
            className="mt-6 inline-flex text-sm font-bold text-[#0b45ad] dark:text-[#ffd326]"
          >
            Voltar ao site
          </Link>
        </div>
      </div>
    );
  if (studentQuery.isLoading && !studentSession)
    return <LoadingState label="A validar o código da inscrição…" />;
  if (!student) return null;

  return (
    <div className="min-h-screen bg-[#f8fbff] text-[#12213a] dark:bg-[#07111f] dark:text-white">
      <header className="border-b border-blue-100 bg-white/90 dark:border-white/10 dark:bg-[#07111f]/90">
        <div className="container flex h-20 items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <img
              src={LOGO}
              alt="Sou Eletricista"
              className="h-12 w-12 rounded-full object-cover"
            />
            <div>
              <p className="font-display font-black text-[#0b45ad] dark:text-white">
                Sou Eletricista
              </p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#e0a900]">
                Área do aluno
              </p>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-right sm:block">
              <span className="block text-xs text-slate-500">Aluno</span>
              <strong className="text-sm">
                {student.application.fullName}
              </strong>
            </span>
            <button
              onClick={() => {
                localStorage.removeItem("sou-eletricista-access");
                setAccessCode("");
              }}
              className="rounded-full border border-blue-100 p-2.5 text-slate-500 hover:bg-blue-50 dark:border-white/10 dark:hover:bg-white/10"
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>
      <main className="container py-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="eyebrow">Boas-vindas personalizadas</p>
            <h1 className="section-title mt-3">
              Olá, {student.application.fullName}.
            </h1>
            <p className="mt-3 text-slate-600 dark:text-slate-300">
              A sua matrícula foi confirmada. Esta é a sua sala de aprendizagem.
            </p>
          </div>
          <span className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
            <CheckCircle2 className="mr-2 inline h-4 w-4" /> Matrícula aprovada
          </span>
        </div>
        <div className="mb-8 rounded-[2rem] border border-blue-100 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="eyebrow">Os seus dados</p>
              <h2 className="mt-2 font-display text-2xl font-black">
                Tudo pronto para começar.
              </h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                {student.application.email} · NIF {student.application.nif}
              </p>
            </div>
            <div className="rounded-2xl bg-[#eef5ff] px-4 py-3 text-right dark:bg-[#0e2a56]">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Código de acesso
              </p>
              <p className="mt-1 font-mono text-sm font-black text-[#0b45ad] dark:text-white">
                {student.application.applicationNumber}
              </p>
            </div>
          </div>
          <p className="mt-5 text-sm font-bold text-[#0b45ad] dark:text-[#ffd326]">
            Curso: {student.application.courseTitle}
          </p>
          {accessExpiresAt && (
            <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
              Acesso à sala virtual até {accessExpiresAt.toLocaleDateString("pt-PT")}. Depois dessa data, os dados operacionais serão eliminados e ficará disponível apenas a consulta do certificado por QR Code.
            </p>
          )}
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          <div className="rounded-3xl bg-[#0b45ad] p-6 text-white shadow-lg">
            <BookOpen className="h-8 w-8 text-[#ffd326]" />
            <p className="mt-8 text-sm text-blue-100">Curso atual</p>
            <p className="mt-2 font-display text-xl font-extrabold">
              {student.application.courseTitle}
            </p>
          </div>
          <div className="rounded-3xl border border-blue-100 bg-white p-6 dark:border-white/10 dark:bg-white/5">
            <Clock3 className="h-8 w-8 text-[#e0a900]" />
            <p className="mt-8 text-sm text-slate-500">Estado do teste</p>
            <p className="mt-2 font-display text-xl font-extrabold">
              {student.progress?.latestScore !== null &&
              student.progress?.latestScore !== undefined
                ? `${student.progress.latestScore}%`
                : isUnlocked
                  ? "Disponível"
                  : "A aguardar"}
            </p>
          </div>
          <div className="rounded-3xl border border-blue-100 bg-white p-6 dark:border-white/10 dark:bg-white/5">
            <FileBadge2 className="h-8 w-8 text-[#e0a900]" />
            <p className="mt-8 text-sm text-slate-500">Certificado</p>
            <p className="mt-2 font-display text-xl font-extrabold">
              {student.progress?.certificateStatus === "approved"
                ? "Disponível"
                : student.progress?.certificateStatus === "pending"
                  ? "Em análise"
                  : student.progress?.certificateStatus === "rejected"
                    ? "Não autorizado"
                    : "Ainda não solicitado"}
            </p>
          </div>
        </div>
        <div className="mt-8 flex flex-wrap gap-2 border-b border-blue-100 dark:border-white/10">
          <button
            onClick={() => setActiveTab("overview")}
            className={`tab-button ${activeTab === "overview" ? "tab-active" : ""}`}
          >
            <BookOpen className="h-4 w-4" /> Formação
          </button>
          <button
            onClick={() => setActiveTab("messages")}
            className={`tab-button ${activeTab === "messages" ? "tab-active" : ""}`}
          >
            <MessageCircle className="h-4 w-4" /> Coordenação
          </button>
          <button
            onClick={() => setActiveTab("notebook")}
            className={`tab-button ${activeTab === "notebook" ? "tab-active" : ""}`}
          >
            <NotebookPen className="h-4 w-4" /> Caderno
          </button>
          <button
            onClick={() => setActiveTab("certificates")}
            className={`tab-button ${activeTab === "certificates" ? "tab-active" : ""}`}
          >
            <FileBadge2 className="h-4 w-4" /> Meus certificados
          </button>
          <button onClick={() => setActiveTab("ranking")} className={`tab-button ${activeTab === "ranking" ? "tab-active" : ""}`}><Trophy className="h-4 w-4" /> Ranking da turma</button>
          <button
            onClick={() => setActiveTab("assistant")}
            className={`tab-button ${activeTab === "assistant" ? "tab-active" : ""}`}
          >
            <Bot className="h-4 w-4" /> Sou Eletricista IA
          </button>
        </div>
        {activeTab === "overview" && (
          <>
            <section className="mt-8 grid gap-8 lg:grid-cols-[1.2fr_.8fr]">
              <div className="rounded-[2rem] border border-blue-100 bg-white p-7 shadow-sm dark:border-white/10 dark:bg-white/5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="eyebrow">Sala de aula</p>
                    <h2 className="mt-3 font-display text-2xl font-black">
                      {student.application.courseTitle}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                      Aceda ao material oficial e avance para a avaliação quando
                      se sentir preparado, após 12 horas da aprovação da inscrição.
                    </p>
                  </div>
                  <BookOpen className="h-10 w-10 text-[#e0a900]" />
                </div>
                <button
                  onClick={doStart}
                  disabled={startCourse.isPending}
                  className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#0b45ad] px-6 py-3.5 font-extrabold text-white disabled:opacity-60"
                >
                  <ExternalLink className="h-4 w-4" />{" "}
                  Começar agora
                </button>
                {student.progress?.accessUnlockAt && (
                  <div className="mt-7 rounded-2xl bg-[#eef5ff] p-5 dark:bg-[#0e2a56]">
                    <div className="flex items-start gap-3">
                      {isUnlocked ? (
                        <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
                      ) : (
                        <LockKeyhole className="mt-0.5 h-5 w-5 text-[#0b45ad] dark:text-[#ffd326]" />
                      )}
                      <div>
                        <p className="font-bold">
                          {isUnlocked
                            ? "O teste está disponível."
                            : "O teste será desbloqueado em breve."}
                        </p>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                          {isUnlocked
                            ? "Quando se sentir preparado, clique em Já Sou Eletricista para responder às 10 questões."
                            : `Tempo restante até ao teste: ${remainingText}`}
                        </p>
                      </div>
                    </div>
                    {student.progress?.examStatus !== "passed" && (
                        <>
                        {!isUnlocked && <div role="progressbar" aria-label="Tempo decorrido até desbloquear o teste" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, Math.max(0, Math.round((1 - remaining / (12 * 60 * 60 * 1000)) * 100)))} className="mt-4 h-2 overflow-hidden rounded-full bg-blue-200 dark:bg-white/15"><div className="h-full rounded-full bg-[#e0a900] transition-[width] duration-1000" style={{ width: `${Math.min(100, Math.max(0, (1 - remaining / (12 * 60 * 60 * 1000)) * 100))}%` }} /></div>}
                        <button
                          onClick={() => { if (isUnlocked) setShowExam(true); }}
                          disabled={!isUnlocked}
                          className="mt-5 inline-flex flex-wrap items-center gap-2 rounded-full bg-emerald-600 px-5 py-3 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:bg-[#0b45ad] disabled:opacity-90"
                        >
                          {isUnlocked ? <CheckCircle2 className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
                          {isUnlocked ? "Já Sou Eletricista · Fazer teste" : `Já Sou Eletricista · ${remainingText}`}
                        </button>
                        </>
                      )}
                    {student.progress?.examStatus === "passed" && (
                      <p className="mt-5 inline-flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 className="h-4 w-4" /> Avaliação concluída
                      </p>
                    )}
                  </div>
                )}
              </div>
              <div className="rounded-[2rem] border border-blue-100 bg-white p-7 dark:border-white/10 dark:bg-white/5">
                <p className="eyebrow">Próximo objetivo</p>
                <h2 className="mt-3 font-display text-2xl font-black">
                  {student.progress?.certificateStatus === "approved"
                    ? "Descarregar certificado"
                    : student.progress?.certificateStatus === "pending"
                      ? "Aguardar autorização"
                      : "Concluir avaliação"}
                </h2>
                <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                  {student.progress?.certificateStatus === "approved"
                    ? "O seu certificado está pronto. Abra a versão imprimível e guarde-o em PDF."
                    : student.progress?.certificateStatus === "pending"
                      ? "A inspeção automática confirmou o modelo e os dados. O certificado aguarda agora apenas a autorização do Diretor."
                      : "Responda ao teste com atenção. Precisa de nota superior a 50% para solicitar o certificado."}
                </p>
                {student.progress?.certificateStatus === "approved" &&
                  student.progress.qrToken && (
                    <div className="mt-6 flex flex-wrap gap-3">
                      <a href={`/api/download/certificate/${student.progress.qrToken}`} download className="inline-flex items-center gap-2 rounded-full bg-[#f3bd08] px-5 py-3 font-extrabold text-[#082d70]">
                        Descarregar PDF final <Download className="h-4 w-4" />
                      </a>
                      <Link href={`/validar/${student.progress.qrToken}`} className="inline-flex items-center gap-2 rounded-full border border-blue-200 px-5 py-3 font-extrabold text-[#0b45ad] dark:border-white/20 dark:text-white">
                        Ver certificado
                      </Link>
                    </div>
                  )}
              </div>
            </section>
            <MaterialProgressPanel
              accessCode={
                student.application.accessCode ||
                student.application.applicationNumber
              }
              courseStarted={Boolean(student.progress?.startedAt)}
              courseUrl={courseUrl}
              libraryUrl={libraryUrl}
            />
          </>
        )}
        {activeTab === "notebook" && (
          <NotebookPanel
            accessCode={
              student.application.accessCode ||
              student.application.applicationNumber
            }
            studentName={student.application.fullName}
          />
        )}
        {activeTab === "ranking" && <StudentRankingPanel accessCode={student.application.accessCode || student.application.applicationNumber} />}
        {activeTab === "certificates" && <StudentCertificatePanel courseTitle={student.application.courseTitle} progress={student.progress} />}
        {activeTab === "messages" && (
          <section className="mt-8 grid gap-8 lg:grid-cols-[.8fr_1.2fr]">
            <div className="rounded-[2rem] border border-blue-100 bg-white p-7 dark:border-white/10 dark:bg-white/5">
              <p className="eyebrow">Falar com a Coordenação</p>
              <h2 className="mt-3 font-display text-2xl font-black">
                Envie uma dúvida.
              </h2>
              <form onSubmit={send} className="mt-6 space-y-4">
                <input
                  className="field-input"
                  placeholder="Assunto"
                  value={messageSubject}
                  onChange={e => setMessageSubject(e.target.value)}
                />
                <textarea
                  className="field-input min-h-32"
                  placeholder="Escreva a sua mensagem"
                  value={messageBody}
                  onChange={e => setMessageBody(e.target.value)}
                />
                <button className="inline-flex items-center gap-2 rounded-full bg-[#0b45ad] px-5 py-3 font-extrabold text-white">
                  <Send className="h-4 w-4" /> Enviar mensagem
                </button>
              </form>
            </div>
            <div className="rounded-[2rem] border border-blue-100 bg-white p-7 dark:border-white/10 dark:bg-white/5">
              <p className="eyebrow">Histórico</p>
              <div className="mt-6 space-y-4">
                {messagesQuery.data?.length ? (
                  messagesQuery.data.map(message => (
                    <div
                      key={message.id}
                      className="rounded-2xl bg-[#f8fbff] p-5 dark:bg-white/5"
                    >
                      <div className="flex justify-between gap-3">
                        <p className="font-bold">{message.subject}</p>
                        <span className="text-xs text-slate-500">
                          {new Date(message.createdAt).toLocaleDateString(
                            "pt-PT"
                          )}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                        {message.body}
                      </p>
                      <p className="mt-3 text-xs font-bold uppercase tracking-widest text-[#e0a900]">
                        {message.fromRole === "coordination"
                          ? "Coordenação"
                          : "Você"}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">
                    Ainda não existem mensagens.
                  </p>
                )}
              </div>
            </div>
          </section>
        )}
        {activeTab === "assistant" && (
          <section className="mt-8 rounded-[2rem] border border-blue-100 bg-white p-7 dark:border-white/10 dark:bg-white/5">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-[#0b45ad] p-3">
                <Sparkles className="h-6 w-6 text-[#ffd326]" />
              </div>
              <div>
                <p className="eyebrow">Assistente de aprendizagem</p>
                <h2 className="mt-2 font-display text-2xl font-black">
                  Sou Eletricista IA
                </h2>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  Pergunte sobre eletricidade básica, segurança ou os temas do
                  curso.
                </p>
              </div>
            </div>
            <div className="mt-8 min-h-64 space-y-4 rounded-2xl bg-[#f8fbff] p-5 dark:bg-[#07111f]">
              {chat.length === 0 && (
                <div className="flex h-48 items-center justify-center text-center text-sm text-slate-500">
                  <div>
                    <Bot className="mx-auto mb-3 h-8 w-8 text-[#0b45ad] dark:text-[#ffd326]" />
                    <p>Ex.: “Como funciona um disjuntor?”</p>
                  </div>
                </div>
              )}
              {chat.map((item, index) => (
                <div
                  key={index}
                  className={`max-w-2xl rounded-2xl p-4 text-sm leading-6 ${item.role === "user" ? "ml-auto bg-[#0b45ad] text-white" : "bg-white text-slate-700 shadow-sm dark:bg-white/10 dark:text-slate-200"}`}
                >
                  {item.content}
                </div>
              ))}
            </div>
            <form onSubmit={askAssistant} className="mt-4 flex gap-3">
              <input
                className="field-input"
                value={question}
                onChange={e => setQuestion(e.target.value)}
                placeholder="Escreva a sua pergunta…"
              />
              <button
                disabled={assistant.isPending}
                className="rounded-full bg-[#f3bd08] px-5 font-extrabold text-[#082d70]"
              >
                {assistant.isPending ? "…" : <Send className="h-4 w-4" />}
              </button>
            </form>
          </section>
        )}
        {showExam && examQuery.isLoading && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#07111f]/80 p-4"><div className="rounded-2xl bg-white p-6 text-[#12213a]" role="status">A preparar o teste do seu curso…</div></div>}
        {showExam && examQuery.isError && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#07111f]/80 p-4"><div className="max-w-md rounded-2xl bg-white p-6 text-[#12213a]" role="alert"><h2 className="text-lg font-bold">Teste indisponível</h2><p className="mt-2 text-sm">{examQuery.error.message}</p><button onClick={() => setShowExam(false)} className="mt-4 rounded-full bg-[#0b45ad] px-5 py-2 text-white">Fechar</button></div></div>}
        {showExam && examQuery.data && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-[#07111f]/80 p-4 backdrop-blur">
            <div className="mx-auto my-8 max-w-3xl rounded-[2rem] bg-white p-7 text-[#12213a] shadow-2xl dark:bg-[#102541] dark:text-white sm:p-10">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="eyebrow">Avaliação final</p>
                  <h2 className="mt-2 font-display text-3xl font-black">
                    10 questões · 100%
                  </h2>
                </div>
                <button
                  onClick={() => setShowExam(false)}
                  className="rounded-full border px-3 py-1 text-sm"
                >
                  Fechar
                </button>
              </div>
              <form onSubmit={submit} className="mt-8 space-y-7">
                {examQuery.data.questions.map((item, index) => (
                  <fieldset
                    key={item.id}
                    className="rounded-2xl border border-blue-100 p-5 dark:border-white/10"
                  >
                    <legend className="px-2 font-bold">
                      {item.id}. {item.question}
                    </legend>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {item.options.map((option, optionIndex) => (
                        <label
                          key={option}
                          className={`cursor-pointer rounded-xl border p-3 text-sm transition ${answers[index] === optionIndex ? "border-[#0b45ad] bg-blue-50 dark:bg-[#0b45ad]/30" : "border-slate-200 dark:border-white/10"}`}
                        >
                          <input
                            type="radio"
                            name={`q-${item.id}`}
                            className="mr-2 accent-[#0b45ad]"
                            checked={answers[index] === optionIndex}
                            onChange={() =>
                              setAnswers(current =>
                                current.map((answer, i) =>
                                  i === index ? optionIndex : answer
                                )
                              )
                            }
                          />
                          {option}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                ))}
                <button className="w-full rounded-full bg-[#0b45ad] px-6 py-4 font-extrabold text-white">
                  Enviar respostas
                </button>
              </form>
            </div>
          </div>
        )}
        {libraryUrl && <a
          href={libraryUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Biblioteca: vídeos práticos e livros em PDF"
          aria-label="Abrir Drive Biblioteca com vídeos práticos e livros em PDF"
          className="group fixed bottom-5 right-4 z-40 inline-flex items-center gap-3 rounded-full bg-[#f3bd08] px-4 py-3 text-sm font-extrabold text-[#082d70] shadow-[0_12px_30px_rgba(11,69,173,0.25)] ring-4 ring-white/80 transition duration-200 hover:-translate-y-1 hover:bg-[#ffd326] active:scale-[0.97] dark:ring-[#07111f]/80 sm:bottom-7 sm:right-7 sm:px-5"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0b45ad] text-white">
            <FolderOpen className="h-4 w-4" />
          </span>
          <span className="max-w-28 leading-tight sm:max-w-none">
            Explorar a biblioteca
          </span>
          <ExternalLink className="h-4 w-4 opacity-70 transition group-hover:translate-x-0.5" />
        </a>}
      </main>
    </div>
  );
}
