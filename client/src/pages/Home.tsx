import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, BookOpen, CheckCircle2, Clock3, Lightbulb, Moon, PlayCircle, PlugZap, Share2, ShieldCheck, SlidersHorizontal, Sun, Users, Zap } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { trpc } from "@/lib/trpc";
import { LoadingBar } from "@/components/PageLoader";
import { youtubeEmbedUrl } from "@shared/media";

const LOGO = "/manus-storage/sou-eletricista-logo_a1bfc7b7.png";
const HERO_BACKGROUND = "/manus-storage/power-grid-sunset_2ecb2782.jpg";
const SECTION_BACKGROUND = "/manus-storage/eco-lightbulb_a3841562.jpg";
const isImageUrl = (url?: string | null) => Boolean(url && /\.(png|jpe?g|gif|webp|svg)(\?|_|$)/i.test(url));
function MediaPreview({ url, posterUrl, durationSeconds, processingStatus }: { url: string; posterUrl?: string | null; durationSeconds?: number | null; processingStatus?: string | null }) {
  const youtubeUrl = youtubeEmbedUrl(url);
  if (youtubeUrl) return <div className="relative aspect-video bg-black"><iframe className="h-full w-full" src={youtubeUrl} title="Vídeo da Vitrine" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" /><a href={url} target="_blank" rel="noopener noreferrer" className="absolute bottom-3 left-3 rounded-full bg-white/95 px-3 py-2 text-xs font-bold text-[#082d70] shadow">Abrir no YouTube</a></div>;
  const clean = url.toLowerCase().split("?")[0];
  if (/\.(mp3|wav|ogg|m4a|aac)(_|$)/.test(clean)) return <div className="flex aspect-video items-center justify-center bg-[#0b45ad] p-6"><audio className="w-full" controls src={url} /></div>;
  if (/\.(png|jpe?g|gif|webp|svg)(_|$)/.test(clean)) return <div className="aspect-video bg-slate-100"><img className="h-full w-full object-cover" src={url} alt="Conteúdo da Vitrine" /></div>;
  if (/\.(pdf)(_|$)/.test(clean)) return <div className="flex aspect-video items-center justify-center bg-[#0b45ad] p-6"><a className="rounded-full bg-[#ffd326] px-5 py-3 font-extrabold text-[#082d70]" href={url} target="_blank" rel="noreferrer">Abrir PDF</a></div>;
  const directVideo = /\.(mp4|webm|ogv|ogg|mov|m4v|mkv|avi|mpeg|mpg|3gp)(_|$)/.test(clean) || url.startsWith("/manus-storage/");
  if (!directVideo) return <div className="flex aspect-video flex-col items-center justify-center gap-3 bg-[#0b45ad] p-5 text-center text-white"><PlayCircle className="h-12 w-12 text-[#ffd326]" /><p className="text-sm">Este conteúdo abre no fornecedor original.</p><a className="rounded-full bg-[#ffd326] px-5 py-3 font-bold text-[#082d70]" href={url} target="_blank" rel="noopener noreferrer">Abrir vídeo</a></div>;
  return <div className="relative aspect-video bg-black"><video className="h-full w-full object-contain" controls playsInline preload="metadata" poster={posterUrl || undefined} src={url}>O navegador não suporta este vídeo. <a href={url}>Abrir ficheiro.</a></video><div className="absolute bottom-3 left-3 flex items-center gap-2"><span className="rounded-full bg-black/65 px-3 py-2 text-xs font-bold text-white">{durationSeconds ? `${Math.floor(durationSeconds / 60)}:${String(durationSeconds % 60).padStart(2, "0")}` : processingStatus === "processed" ? "Vídeo otimizado" : "Vídeo original"}</span><a className="rounded-full bg-white/90 px-3 py-2 text-xs font-extrabold text-[#082d70] shadow" href={url} target="_blank" rel="noopener noreferrer">Abrir / descarregar</a></div></div>;
}

export default function Home() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [effectIntensity, setEffectIntensity] = useState<"normal" | "soft" | "off">(() => {
    const stored = localStorage.getItem("sou-effects");
    return stored === "soft" || stored === "off" ? stored : "normal";
  });
  const { theme, toggleTheme } = useTheme();
  const { data: courses } = trpc.public.courses.useQuery();
  const { data: content } = trpc.public.content.useQuery();
  const { data: pricing } = trpc.public.pricing.useQuery();
  const updates = content?.filter(item => item.kind === "update").slice(0, 3) ?? [];
  const videos = content?.filter(item => item.kind !== "update").slice(0, 2) ?? [];
  const isLoading = courses === undefined || content === undefined;
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [galleryPaused, setGalleryPaused] = useState(false);
  const galleryItems = [
    ...(courses ?? []).map(course => ({ id: `course-${course.id}`, label: "Curso em destaque", title: course.title, description: course.description, image: SECTION_BACKGROUND, href: "#curso" })),
    ...(content ?? []).filter(item => item.mediaUrl || item.mediaPosterUrl).map(item => ({
      id: `content-${item.id}`,
      label: item.kind === "update" ? "Projeto do centro" : "Conteúdo publicado",
      title: item.title,
      description: item.body || "Explore este projeto e acompanhe as novidades do centro.",
      image: item.mediaPosterUrl || (isImageUrl(item.mediaUrl) ? item.mediaUrl : HERO_BACKGROUND),
      href: "#vitrine",
    })),
  ].slice(0, 8);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    localStorage.setItem("sou-effects", effectIntensity);
  }, [effectIntensity]);

  useEffect(() => {
    if (galleryItems.length < 2 || galleryPaused) return;
    const timer = window.setInterval(() => setGalleryIndex(index => (index + 1) % galleryItems.length), 5200);
    return () => window.clearInterval(timer);
  }, [galleryItems.length, galleryPaused]);

  useEffect(() => {
    if (galleryIndex >= galleryItems.length && galleryItems.length > 0) setGalleryIndex(0);
  }, [galleryIndex, galleryItems.length]);

  const shareCenter = async () => {
    const shareData = { title: "Sou Eletricista", text: "Conheça o Sou Eletricista e comece a sua formação em eletricidade.", url: window.location.origin };
    if (navigator.share) await navigator.share(shareData);
    else await navigator.clipboard?.writeText(window.location.origin);
  };

  return (
    <div className={`site-lightning-bg effects-${effectIntensity} min-h-screen overflow-hidden bg-[#071f51] text-[#12213a] dark:bg-[#061735] dark:text-white`}>
      <header className={`home-site-header sticky top-0 z-40 border-b border-blue-100/80 bg-white/90 backdrop-blur dark:border-white/10 dark:bg-[#07111f]/90 ${isScrolled ? "is-scrolled" : ""}`}>
        <div className="container flex h-20 items-center justify-between gap-5">
          <Link href="/" className="flex shrink-0 items-center gap-3">
            <img src={LOGO} alt="Sou Eletricista" className="h-14 w-14 rounded-full object-cover shadow-sm" />
            <div className="hidden sm:block">
              <p className="font-display text-lg font-extrabold leading-none text-[#0b45ad] dark:text-white">Sou Eletricista</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#e7ad00]">Aprender • Praticar • Conquistar</p>
            </div>
          </Link>
          <nav className="hidden min-w-0 flex-1 items-center justify-end gap-1 xl:gap-2 lg:flex">
            <a href="#curso" className="home-nav-link">O curso</a>
            <a href="#vitrine" className="home-nav-link">Vitrine</a>
            <a href="#como-funciona" className="home-nav-link">Como funciona</a>
            <Link href="/aluno" className="home-nav-link">Área do aluno</Link>
            <Link href="/diretor" className="home-nav-link">Sobre o Diretor</Link>
            <Link href="/contactos" className="home-nav-link">Contactos</Link>
          </nav>
          <div className="flex min-w-0 max-w-[calc(100vw-5rem)] shrink-0 items-center gap-2 overflow-x-auto pb-1">
            <a href="#vitrine" className="home-nav-link home-nav-mobile lg:hidden">Vitrine</a>
            <Link href="/aluno" className="home-nav-link home-nav-mobile lg:hidden">Aluno</Link>
            <Link href="/diretor" className="home-nav-link home-nav-mobile lg:hidden">Diretor</Link>
            <Link href="/contactos" className="home-nav-link home-nav-mobile lg:hidden">Contactos</Link>
            <button onClick={toggleTheme} aria-label="Alternar tema" className="rounded-full border border-blue-100 p-2.5 transition hover:bg-blue-50 dark:border-white/15 dark:hover:bg-white/10">
              {theme === "dark" ? <Sun className="h-4 w-4 text-[#ffd326]" /> : <Moon className="h-4 w-4 text-[#0b45ad]" />}
            </button>
            <label className="effects-control flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-2.5 py-2 text-xs font-extrabold text-[#27364d] shadow-sm" title="Ajustar intensidade dos efeitos">
              <SlidersHorizontal className="h-3.5 w-3.5 text-[#8a4b22]" />
              <span className="sr-only">Intensidade dos efeitos</span>
              <select aria-label="Intensidade dos efeitos visuais" value={effectIntensity} onChange={e => setEffectIntensity(e.target.value as "normal" | "soft" | "off")} className="bg-transparent font-extrabold outline-none">
                <option value="normal">Efeitos normais</option>
                <option value="soft">Efeitos suaves</option>
                <option value="off">Sem efeitos</option>
              </select>
            </label>
            <Link href="/inscricao" className="hidden shrink-0 rounded-full bg-[#f3bd08] px-4 py-3 text-sm font-extrabold text-[#0b2c68] shadow-lg shadow-yellow-200 transition hover:-translate-y-0.5 hover:bg-[#ffd43b] sm:inline-flex">Começar agora</Link>
          </div>
        </div>
      </header>

      <LoadingBar visible={isLoading} />
      <main>
        <section className="home-hero relative isolate">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_78%_14%,rgba(243,189,8,.25),transparent_24%),linear-gradient(120deg,#eaf3ff_0%,#f8fbff_55%,#fff9e5_100%)] dark:bg-[radial-gradient(circle_at_78%_14%,rgba(243,189,8,.16),transparent_24%),linear-gradient(120deg,#0d2445_0%,#07111f_60%,#17264b_100%)]" />
          <div className="pointer-events-none absolute inset-0 -z-10 bg-cover bg-center opacity-20 mix-blend-multiply dark:opacity-25 dark:mix-blend-screen" style={{ backgroundImage: `url(${HERO_BACKGROUND})` }} />
          <div className="container relative grid min-h-[680px] items-center gap-12 py-20 lg:grid-cols-[1.05fr_.95fr] lg:py-24">
            <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true"><Lightbulb className="floating-energy-icon left-[8%] top-[18%] h-10 w-10 text-[#f3bd08]" /><PlugZap className="floating-energy-icon right-[7%] top-[24%] h-9 w-9 text-[#0b45ad] dark:text-[#ffd326]" /><Zap className="floating-energy-icon bottom-[13%] left-[46%] h-8 w-8 text-[#f3bd08]" /></div>
            <div className="max-w-2xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/75 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[#0b45ad] dark:border-white/15 dark:bg-white/10 dark:text-[#ffd326]"><span className="h-2 w-2 rounded-full bg-[#f3bd08]" /> Formação profissional a distância</div>
              <h1 className="font-display text-5xl font-black leading-[.98] tracking-tight text-[#082d70] dark:text-white sm:text-6xl lg:text-7xl">A sua energia para <span className="text-[#e0a900]">conquistar</span> novas oportunidades.</h1>
              <p className="mt-7 max-w-xl text-lg leading-8 text-slate-600 dark:text-slate-300">Aprenda eletricidade básica para instalações residenciais em baixa tensão com uma formação prática, acessível e pensada para quem quer evoluir.</p>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Link href="/inscricao" className="group inline-flex items-center gap-3 rounded-full bg-[#0b45ad] px-6 py-4 font-extrabold text-white shadow-xl shadow-blue-200 transition hover:-translate-y-1 hover:bg-[#083a93] dark:shadow-blue-950/30">Começar o curso agora <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" /></Link>
                <button onClick={shareCenter} className="inline-flex items-center gap-3 rounded-full border border-[#0b45ad]/20 bg-white px-6 py-4 font-bold text-[#0b45ad] transition hover:bg-blue-50 dark:border-white/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"><Share2 className="h-5 w-5" /> Partilhar centro</button>
                <span className="rounded-full border border-[#e0a900]/30 bg-[#fff8d8] px-4 py-2 text-sm font-black text-[#7a5700] dark:bg-white/10 dark:text-[#ffd326]">{pricing?.label ?? "4.000 Kz / 4 € promocional"}</span>
              </div>
              <div className="mt-12 grid max-w-lg grid-cols-3 gap-5 border-t border-blue-200/70 pt-6 dark:border-white/15">
                <div><p className="font-display text-2xl font-black text-[#0b45ad] dark:text-white">12h</p><p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">Formação guiada</p></div>
                <div><p className="font-display text-2xl font-black text-[#0b45ad] dark:text-white">10</p><p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">Questões finais</p></div>
                <div><p className="font-display text-2xl font-black text-[#0b45ad] dark:text-white">100%</p><p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">Online</p></div>
              </div>
            </div>
            <div className="relative mx-auto w-full max-w-[520px]">
              <div className="absolute -inset-6 rounded-[3rem] bg-[#0b45ad]/10 blur-2xl" />
              <div className="relative overflow-hidden rounded-[2.5rem] border border-white bg-[#0b45ad] p-3 shadow-2xl shadow-blue-200 dark:border-white/10 dark:shadow-black/30">
                <div className="relative aspect-square overflow-hidden rounded-[2rem] bg-[linear-gradient(145deg,#0f5bd3,#08245f)]">
                  <div className="absolute -right-10 -top-12 h-48 w-48 rounded-full bg-[#f3bd08]/80 blur-2xl" />
                  <div className="absolute -bottom-16 -left-8 h-64 w-64 rounded-full bg-[#174fbb] blur-2xl" />
                  <img src={LOGO} alt="Logotipo oficial Sou Eletricista" className="absolute inset-8 h-[calc(100%-4rem)] w-[calc(100%-4rem)] object-contain drop-shadow-2xl" />
                  <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/20 bg-black/20 px-4 py-3 text-center text-xs font-bold uppercase tracking-[0.18em] text-white backdrop-blur">Centro de Formação Técnico Profissional</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="galeria" className="home-gallery border-y border-white/15 py-20" aria-labelledby="gallery-heading" onMouseEnter={() => setGalleryPaused(true)} onMouseLeave={() => setGalleryPaused(false)} onFocus={() => setGalleryPaused(true)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setGalleryPaused(false); }}>
          <div className="container">
            <div className="flex flex-wrap items-end justify-between gap-5">
              <div><p className="eyebrow text-[#ffd43b]">Projetos e cursos</p><h2 id="gallery-heading" className="mt-3 font-display text-3xl font-black text-white sm:text-4xl">Veja o que está a acontecer no centro.</h2></div>
              <p className="max-w-md text-sm leading-6 text-blue-100">A Coordenação pode publicar novos cursos, projetos e imagens na Vitrine; esta galeria atualiza-se automaticamente.</p>
            </div>
            <div className="relative mt-9 overflow-hidden rounded-[2rem] border border-white/20 bg-[#071b45] shadow-2xl">
              {galleryItems.length > 0 && <div className="grid min-h-[360px] lg:grid-cols-[1.15fr_.85fr]">
                <div className="relative min-h-[260px] overflow-hidden">
                  <img key={galleryItems[galleryIndex]?.id} src={galleryItems[galleryIndex]?.image || HERO_BACKGROUND} alt="" className="home-gallery-image absolute inset-0 h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#071b45]/95 via-[#071b45]/55 to-transparent" />
                </div>
                <div className="relative z-10 flex flex-col justify-center p-8 sm:p-10 lg:-ml-12 lg:pl-2">
                  <span className="w-fit rounded-full bg-[#ffd43b] px-3 py-1 text-xs font-black uppercase tracking-[.16em] text-[#17234b]">{galleryItems[galleryIndex]?.label}</span>
                  <h3 className="mt-5 font-display text-2xl font-black leading-tight text-white sm:text-3xl">{galleryItems[galleryIndex]?.title}</h3>
                  <p className="mt-4 max-w-lg text-base leading-7 text-blue-100">{galleryItems[galleryIndex]?.description}</p>
                  <a href={galleryItems[galleryIndex]?.href} className="mt-7 inline-flex w-fit items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-black text-[#1b1550] shadow-lg hover:-translate-y-0.5 hover:bg-[#fff7d2]">Explorar publicação <ArrowRight className="h-4 w-4" /></a>
                </div>
              </div>}
              {galleryItems.length === 0 && <div className="p-10 text-white"><p className="font-display text-2xl font-black">A galeria será preenchida pela Coordenação.</p><p className="mt-3 text-blue-100">Publique o primeiro projeto ou curso na Vitrine.</p></div>}
              {galleryItems.length > 1 && <div className="absolute bottom-5 left-6 right-6 z-20 flex items-center justify-between gap-4"><div className="flex gap-2" role="tablist" aria-label="Projetos e cursos em destaque">{galleryItems.map((item, index) => <button key={item.id} type="button" role="tab" aria-selected={galleryIndex === index} aria-label={`Mostrar ${item.title}`} onClick={() => setGalleryIndex(index)} className={`home-gallery-dot ${galleryIndex === index ? "is-active" : ""}`} />)}</div><span className="rounded-full bg-black/55 px-3 py-1 text-xs font-bold text-white">{galleryPaused ? "Pausada" : "Rotação automática"}</span></div>}
            </div>
          </div>
        </section>

        <section id="curso" className="container py-24">
          <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
            <div><p className="eyebrow">Formação em destaque</p><h2 className="section-title mt-4">Conhecimento que se transforma em prática.</h2></div>
            <p className="max-w-xl text-lg leading-8 text-slate-600 dark:text-slate-300">Uma experiência de aprendizagem objetiva, com materiais acessíveis e um caminho claro até à avaliação e ao certificado.</p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              { icon: ShieldCheck, title: "Segurança primeiro", text: "Aprenda princípios essenciais para trabalhar com responsabilidade." },
              { icon: BookOpen, title: "Conteúdo essencial", text: "Circuitos, ferramentas e instalações residenciais explicados com clareza." },
              { icon: Users, title: "Acompanhamento", text: "Tire dúvidas com a Coordenação e com o assistente Sou Eletricista." },
            ].map(item => <div key={item.title} className="rounded-3xl border border-blue-100 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-xl dark:border-white/10 dark:bg-white/5"><item.icon className="h-9 w-9 text-[#e0a900]" /><h3 className="mt-6 font-display text-xl font-extrabold">{item.title}</h3><p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">{item.text}</p></div>)}
          </div>
        </section>

        <section id="como-funciona" className="bg-[#0b45ad] bg-cover bg-center py-24 text-white" style={{ backgroundImage: `linear-gradient(rgba(11,69,173,.9),rgba(7,31,81,.94)), url(${SECTION_BACKGROUND})` }}>
          <div className="container"><div className="grid gap-12 lg:grid-cols-[.7fr_1.3fr] lg:items-end"><div><p className="eyebrow text-[#ffd326]">Um caminho simples</p><h2 className="section-title mt-4 text-white">Da inscrição ao seu certificado.</h2></div><p className="max-w-xl text-lg leading-8 text-blue-100">Faça a inscrição, envie o comprovativo e aguarde a validação da Coordenação. Depois, estude no seu ritmo e conclua a avaliação.</p></div><div className="mt-12 grid gap-4 md:grid-cols-4">{["Inscreva-se", "Aguarde a aprovação", "Faça a formação", "Conquiste o certificado"].map((step, index) => <div key={step} className="relative rounded-3xl border border-white/15 bg-white/10 p-6 backdrop-blur"><span className="font-display text-4xl font-black text-[#ffd326]">0{index + 1}</span><h3 className="mt-8 font-display text-xl font-extrabold">{step}</h3><p className="mt-3 text-sm leading-6 text-blue-100">{["Preencha os seus dados e escolha o meio de pagamento.", "A equipa verifica os dados e o comprovativo enviado.", "Aceda ao material e conte com apoio durante a jornada.", "Passe no teste e aguarde a autorização final." ][index]}</p></div>)}</div></div>
        </section>

        <section className="container py-24" aria-labelledby="active-courses-heading">
          <div className="flex flex-wrap items-end justify-between gap-6"><div><p className="eyebrow">Formações disponíveis</p><h2 id="active-courses-heading" className="section-title mt-4">Encontre o seu curso.</h2></div><Link href="/inscricao" className="inline-flex items-center gap-2 font-extrabold text-[#0b45ad] dark:text-[#ffd326]">Ver inscrição <ArrowRight className="h-4 w-4" /></Link></div>
          <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">{(courses?.length ? courses : [{ id: 0, title: "Eletricidade Básica para Instalações Residenciais em Baixa Tensão", description: "Formação introdutória para compreender circuitos e segurança.", hours: 12 }]).map(item => <article key={item.id} className="flex flex-col overflow-hidden rounded-[2rem] border border-blue-100 bg-white shadow-lg dark:border-white/10 dark:bg-white/5"><div className="relative flex min-h-36 items-center justify-between bg-[linear-gradient(140deg,#083e9d,#0d6bd8)] p-7"><span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-widest text-white">Curso ativo</span><PlayCircle className="h-10 w-10 text-[#ffd326]" /></div><div className="flex flex-1 flex-col p-6"><span className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 dark:text-slate-300"><Clock3 className="h-4 w-4 text-[#e0a900]" /> {item.hours} horas</span><h3 className="mt-4 font-display text-xl font-black">{item.title}</h3><p className="mt-3 flex-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{item.description}</p><Link href="/inscricao" className="mt-6 inline-flex w-fit items-center gap-2 rounded-full bg-[#f3bd08] px-5 py-3 text-sm font-extrabold text-[#092d6c] transition hover:bg-[#ffd43b]">Inscrever-me <ArrowRight className="h-4 w-4" /></Link></div></article>)}</div>
        </section>

        {(videos.length > 0 || updates.length > 0) && <section id="vitrine" className="border-t border-blue-100 bg-white py-24 dark:border-white/10 dark:bg-white/[.03]"><div className="container"><p className="eyebrow">Vitrine</p><h2 className="section-title mt-4">Novidades do centro.</h2><div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">{[...videos, ...updates].slice(0, 3).map(item => <article key={item.id} className="overflow-hidden rounded-3xl border border-blue-100 bg-[#f8fbff] dark:border-white/10 dark:bg-white/5">{item.mediaUrl ? <MediaPreview url={item.mediaUrl} posterUrl={item.mediaPosterUrl} durationSeconds={item.mediaDurationSeconds} processingStatus={item.mediaProcessingStatus} /> : <div className="flex aspect-video items-center justify-center bg-[#0b45ad]"><PlayCircle className="h-12 w-12 text-[#ffd326]" /></div>}<div className="p-6"><p className="text-xs font-bold uppercase tracking-widest text-[#e0a900]">{item.kind === "update" ? "Atualização" : item.mediaProcessingStatus === "processed" ? "Vídeo otimizado" : "Vídeo"}</p><h3 className="mt-2 font-display text-xl font-extrabold">{item.title}</h3>{item.body && <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{item.body}</p>}</div></article>)}</div></div></section>}
      </main>

      <footer className="border-t border-blue-100 bg-[#071f51] py-12 text-white dark:border-white/10"><div className="container flex flex-col justify-between gap-8 md:flex-row md:items-end"><div className="flex items-center gap-4"><img src={LOGO} alt="Sou Eletricista" className="h-16 w-16 rounded-full object-cover" /><div><p className="font-display text-xl font-black">Sou Eletricista</p><p className="mt-1 text-sm text-blue-200">Aprender • Praticar • Conquistar</p></div></div><div className="flex flex-wrap gap-5 text-sm font-semibold text-blue-100"><Link href="/aluno">Área do aluno</Link><Link href="/coordenacao">Coordenação</Link><Link href="/contactos">Contactos</Link><a href="mailto:souelectricista@gmail.com">souelectricista@gmail.com</a></div></div></footer>
    </div>
  );
}
