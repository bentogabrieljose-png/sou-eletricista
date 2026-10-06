import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, ExternalLink, GraduationCap, Megaphone, Pause, Play, PlayCircle, Sparkles, Trophy } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { LoadingBar } from "@/components/PageLoader";
import { youtubeEmbedUrl } from "@shared/media";

const LOGO = "/manus-storage/sou-eletricista-logo_a1bfc7b7.png";
const isImage = (url?: string | null) => Boolean(url && /\.(png|jpe?g|gif|webp|svg)(\?|_|$)/i.test(url));
type BoardSlide = { id: string; badge: string; title: string; body: string; image?: string | null; kind: "course" | "update" | "achievement" };

function MediaPreview({ url, posterUrl, durationSeconds, processingStatus }: { url: string; posterUrl?: string | null; durationSeconds?: number | null; processingStatus?: string | null }) {
  const youtube = youtubeEmbedUrl(url);
  if (youtube) return <div className="relative aspect-video bg-black"><iframe className="h-full w-full" src={youtube} title="Vídeo da Vitrine" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /><a href={url} target="_blank" rel="noopener noreferrer" className="absolute bottom-3 left-3 rounded-full bg-white/95 px-3 py-2 text-xs font-bold text-[#073b1b] shadow">Abrir no YouTube</a></div>;
  const clean = url.toLowerCase().split("?")[0];
  if (/\.(mp3|wav|ogg|m4a|aac)(_|$)/.test(clean)) return <div className="flex aspect-video items-center justify-center bg-[#063b18] p-6"><audio className="w-full" controls src={url} /></div>;
  if (isImage(url)) return <div className="aspect-video bg-slate-100"><img className="h-full w-full object-cover" src={url} alt="Conteúdo publicado na Vitrine" /></div>;
  if (/\.pdf(_|$)/.test(clean)) return <div className="flex aspect-video items-center justify-center bg-[#063b18] p-6"><a className="rounded-full bg-[#ffd43b] px-5 py-3 font-extrabold text-[#17220c]" href={url} target="_blank" rel="noreferrer">Abrir PDF</a></div>;
  const direct = /\.(mp4|webm|ogv|ogg|mov|m4v|mkv|avi|mpeg|mpg|3gp)(_|$)/.test(clean) || url.startsWith("/manus-storage/");
  if (!direct) return <div className="flex aspect-video flex-col items-center justify-center gap-3 bg-[#063b18] p-5 text-center text-white"><PlayCircle className="h-12 w-12 text-[#ffd43b]" /><p className="text-sm">Este conteúdo abre no fornecedor original.</p><a className="rounded-full bg-[#ffd43b] px-5 py-3 font-bold text-[#17220c]" href={url} target="_blank" rel="noopener noreferrer">Abrir conteúdo</a></div>;
  return <div className="relative aspect-video bg-black"><video className="h-full w-full object-contain" controls playsInline preload="metadata" poster={posterUrl || undefined} src={url}>O navegador não suporta este vídeo. <a href={url}>Abrir ficheiro.</a></video><div className="absolute bottom-3 left-3 flex items-center gap-2"><span className="rounded-full bg-black/65 px-3 py-2 text-xs font-bold text-white">{durationSeconds ? `${Math.floor(durationSeconds / 60)}:${String(durationSeconds % 60).padStart(2, "0")}` : processingStatus === "processed" ? "Vídeo otimizado" : "Vídeo original"}</span><a className="rounded-full bg-white/90 px-3 py-2 text-xs font-extrabold text-[#073b1b] shadow" href={url} target="_blank" rel="noopener noreferrer">Abrir / descarregar</a></div></div>;
}

function BoardIcon({ kind }: { kind: BoardSlide["kind"] }) {
  if (kind === "achievement") return <Trophy className="h-7 w-7" aria-hidden="true" />;
  if (kind === "course") return <GraduationCap className="h-7 w-7" aria-hidden="true" />;
  return <Megaphone className="h-7 w-7" aria-hidden="true" />;
}

export default function Vitrine() {
  const { data: data, isLoading: contentLoading } = trpc.public.content.useQuery();
  const { data: courses, isLoading: coursesLoading } = trpc.public.courses.useQuery();
  const items = data ?? [];
  const [boardIndex, setBoardIndex] = useState(0);
  const [boardPaused, setBoardPaused] = useState(false);
  const slides = useMemo<BoardSlide[]>(() => {
    const courseSlides: BoardSlide[] = (courses ?? []).map(course => ({ id: `course-${course.id}`, kind: "course", badge: "Novo curso", title: course.title, body: course.description || "Formação profissional com acompanhamento e certificação.", image: null }));
    const publicationSlides: BoardSlide[] = items.map(item => {
      const text = `${item.title} ${item.body || ""}`.toLowerCase();
      return { id: `content-${item.id}`, kind: /100%|melhor aluno|aproveitamento máximo/.test(text) ? "achievement" : "update", badge: /100%|melhor aluno|aproveitamento máximo/.test(text) ? "Aluno em destaque" : item.kind === "update" ? "Atualização" : "Publicação", title: item.title, body: item.body || "Veja a novidade publicada pela Coordenação.", image: item.mediaPosterUrl || (isImage(item.mediaUrl) ? item.mediaUrl : null) };
    });
    return [...courseSlides, ...publicationSlides].length ? [...courseSlides, ...publicationSlides] : [{ id: "empty", kind: "update", badge: "Em breve", title: "Novidades do centro", body: "A Coordenação está a preparar novos cursos, projetos e histórias de sucesso para esta Vitrine.", image: null }];
  }, [courses, items]);
  const isLoading = contentLoading || coursesLoading;
  useEffect(() => { if (boardIndex >= slides.length) setBoardIndex(0); }, [boardIndex, slides.length]);
  useEffect(() => {
    if (boardPaused || slides.length < 2) return;
    const timer = window.setInterval(() => setBoardIndex(index => (index + 1) % slides.length), 5200);
    return () => window.clearInterval(timer);
  }, [boardPaused, slides.length]);
  const current = slides[boardIndex] || slides[0];
  const moveBoard = (direction: number) => setBoardIndex(index => (index + direction + slides.length) % slides.length);

  return <div className="site-lightning-bg vitrine-page min-h-screen text-white">
    <header className="home-site-header sticky top-0 z-40 border-b backdrop-blur"><div className="container flex min-h-20 items-center justify-between gap-4 py-3"><Link href="/" className="flex items-center gap-3"><img src={LOGO} alt="Sou Eletricista" className="h-12 w-12 rounded-full object-cover" /><span className="hidden font-display text-lg font-black sm:block">Sou Eletricista</span></Link><nav className="flex items-center gap-2"><Link href="/" className="home-nav-link"><ArrowLeft className="mr-1 h-4 w-4" /> Home</Link><Link href="/inscricao" className="home-nav-link bg-[#ffd43b]">Fazer inscrição <ExternalLink className="ml-1 h-4 w-4" /></Link></nav></div></header>
    <LoadingBar visible={isLoading} />
    <main className="container py-14 sm:py-20"><div className="mx-auto max-w-3xl text-center"><p className="eyebrow text-[#ffd43b]">Conteúdos do centro</p><h1 className="mt-3 font-display text-4xl font-black sm:text-6xl">Vitrine de projetos e cursos</h1><p className="mt-5 text-lg leading-8 text-emerald-50">Explore vídeos, atualizações, projetos e materiais publicados pela Coordenação.</p></div>
      <section className="vitrine-tablet-section mx-auto mt-12 max-w-5xl" aria-labelledby="board-title" onMouseEnter={() => setBoardPaused(true)} onMouseLeave={() => setBoardPaused(false)} onFocus={() => setBoardPaused(true)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setBoardPaused(false); }}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><p className="eyebrow text-[#ffd43b]">Quadro de novidades</p><h2 id="board-title" className="mt-1 font-display text-2xl font-black text-white sm:text-3xl">Tudo o que está a acontecer.</h2></div><span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-black/25 px-3 py-2 text-xs font-bold text-emerald-50"><Sparkles className="h-4 w-4 text-[#ffd43b]" /> {boardPaused ? "Pausado" : "Atualização automática"}</span></div>
        <div className="vitrine-tablet-shell rounded-[2rem] border-[10px] border-[#17222b] bg-[#293843] p-2 shadow-[0_28px_70px_rgba(0,0,0,.45)] sm:rounded-[2.7rem] sm:border-[14px] sm:p-3"><div className="vitrine-tablet-camera" aria-hidden="true" /><div className="vitrine-tablet-screen relative overflow-hidden rounded-[1.25rem] border border-white/20 bg-[#071f18] sm:rounded-[1.8rem]"><div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_18%,rgba(255,212,59,.32),transparent_22%),linear-gradient(135deg,#0c6a32,#052719_58%,#071b12)]" /><div key={current.id} className="vitrine-board-slide relative grid min-h-[300px] gap-6 p-6 sm:min-h-[360px] sm:grid-cols-[.9fr_1.1fr] sm:p-10"><div className="flex flex-col justify-center"><span className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-2 text-xs font-black uppercase tracking-widest ${current.kind === "achievement" ? "bg-[#b87333] text-white" : current.kind === "course" ? "bg-[#ffd43b] text-[#17220c]" : "bg-white/15 text-white"}`}><BoardIcon kind={current.kind} /> {current.badge}</span><h3 className="mt-5 max-w-xl font-display text-3xl font-black leading-tight text-white sm:text-5xl">{current.title}</h3><p className="mt-4 max-w-xl text-base leading-7 text-emerald-50 sm:text-lg">{current.body}</p>{current.kind === "achievement" && <p className="mt-5 inline-flex w-fit rounded-full border border-[#ffd43b]/50 bg-[#ffd43b]/15 px-4 py-2 text-sm font-black text-[#fff0a8]">100% de aproveitamento • Melhor aluno</p>}</div><div className="flex items-center justify-center">{current.image ? <img src={current.image} alt="Imagem da publicação em destaque" className="max-h-64 w-full rounded-2xl border border-white/20 object-cover shadow-2xl sm:max-h-72" /> : <div className="vitrine-tablet-illustration flex h-48 w-full max-w-sm items-center justify-center rounded-3xl border border-white/20 bg-white/10 shadow-2xl sm:h-64"><BoardIcon kind={current.kind} /><span className="sr-only">{current.badge}</span></div>}</div></div><div className="relative z-10 flex items-center justify-between gap-4 border-t border-white/15 bg-black/20 px-4 py-3"><span className="text-xs font-bold text-emerald-100" aria-live="polite">Destaque {boardIndex + 1} de {slides.length}</span><div className="flex items-center gap-2"><button type="button" onClick={() => moveBoard(-1)} aria-label="Destaque anterior" className="rounded-full border border-white/25 p-2 text-white hover:bg-white/15"><ChevronLeft className="h-4 w-4" /></button><button type="button" onClick={() => setBoardPaused(value => !value)} aria-label={boardPaused ? "Retomar animação" : "Pausar animação"} className="rounded-full border border-white/25 p-2 text-white hover:bg-white/15">{boardPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}</button><button type="button" onClick={() => moveBoard(1)} aria-label="Próximo destaque" className="rounded-full border border-white/25 p-2 text-white hover:bg-white/15"><ChevronRight className="h-4 w-4" /></button></div></div></div></div>
        <div className="mt-4 flex justify-center gap-2" role="tablist" aria-label="Destaques da Vitrine">{slides.map((slide, index) => <button key={slide.id} type="button" role="tab" aria-selected={index === boardIndex} aria-label={`Mostrar ${slide.title}`} onClick={() => setBoardIndex(index)} className={`vitrine-board-dot ${index === boardIndex ? "is-active" : ""}`} />)}</div>
      </section>
      <div className="mt-16 grid gap-7 md:grid-cols-2 lg:grid-cols-3">{items.map(item => <article key={item.id} className="overflow-hidden rounded-[2rem] border border-white/20 bg-white text-[#17220c] shadow-2xl"><div>{item.mediaUrl ? <MediaPreview url={item.mediaUrl} posterUrl={item.mediaPosterUrl} durationSeconds={item.mediaDurationSeconds} processingStatus={item.mediaProcessingStatus} /> : <div className="flex aspect-video items-center justify-center bg-[#063b18]"><PlayCircle className="h-12 w-12 text-[#ffd43b]" /></div>}</div><div className="p-6"><p className="text-xs font-black uppercase tracking-widest text-[#a35e00]">{item.kind === "update" ? "Atualização" : item.mediaProcessingStatus === "processed" ? "Vídeo otimizado" : "Conteúdo"}</p><h2 className="mt-2 font-display text-xl font-black">{item.title}</h2>{item.body && <p className="mt-3 text-sm leading-6 text-slate-600">{item.body}</p>}</div></article>)}{items.length === 0 && <div className="md:col-span-2 lg:col-span-3 rounded-[2rem] border border-white/20 bg-black/20 p-10 text-center"><PlayCircle className="mx-auto h-12 w-12 text-[#ffd43b]" /><h2 className="mt-4 font-display text-2xl font-black">A Vitrine está a ser preparada.</h2><p className="mt-2 text-emerald-50">A Coordenação poderá publicar aqui os próximos conteúdos.</p></div>}</div>
    </main>
    <footer className="border-t border-white/15 bg-[#063b18] py-10"><div className="container flex flex-wrap items-center justify-between gap-5"><div className="flex items-center gap-3"><img src={LOGO} alt="" className="h-12 w-12 rounded-full" /><span className="font-bold">Sou Eletricista</span></div><Link href="/inscricao" className="rounded-full bg-[#ffd43b] px-5 py-3 font-black text-[#17220c]">Fazer inscrição</Link></div></footer>
  </div>;
}
