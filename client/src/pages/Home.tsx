import { Link } from "wouter";
import { ArrowRight, BookOpen, CheckCircle2, Clock3, Moon, PlayCircle, Share2, ShieldCheck, Sun, Users } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { trpc } from "@/lib/trpc";

const LOGO = "/manus-storage/sou-eletricista-logo_a1bfc7b7.png";
const HERO_BACKGROUND = "/manus-storage/electricity-hero-background_79d57508.jpg";
const SECTION_BACKGROUND = "/manus-storage/electricity-section-background_d153577d.jpg";

export default function Home() {
  const { theme, toggleTheme } = useTheme();
  const { data: courses } = trpc.public.courses.useQuery();
  const { data: content } = trpc.public.content.useQuery();
  const course = courses?.[0];
  const updates = content?.filter(item => item.kind === "update").slice(0, 3) ?? [];
  const videos = content?.filter(item => item.kind !== "update").slice(0, 2) ?? [];

  const shareCenter = async () => {
    const shareData = { title: "Sou Eletricista", text: "Conheça o Sou Eletricista e comece a sua formação em eletricidade.", url: window.location.origin };
    if (navigator.share) await navigator.share(shareData);
    else await navigator.clipboard?.writeText(window.location.origin);
  };

  return (
    <div className="min-h-screen overflow-hidden bg-[#f8fbff] text-[#12213a] dark:bg-[#07111f] dark:text-white">
      <header className="sticky top-0 z-40 border-b border-blue-100/80 bg-white/90 backdrop-blur dark:border-white/10 dark:bg-[#07111f]/90">
        <div className="container flex h-20 items-center justify-between gap-5">
          <Link href="/" className="flex items-center gap-3">
            <img src={LOGO} alt="Sou Eletricista" className="h-14 w-14 rounded-full object-cover shadow-sm" />
            <div className="hidden sm:block">
              <p className="font-display text-lg font-extrabold leading-none text-[#0b45ad] dark:text-white">Sou Eletricista</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#e7ad00]">Aprender • Praticar • Conquistar</p>
            </div>
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-semibold lg:flex">
            <a href="#curso" className="hover:text-[#0b58d0]">O curso</a>
            <a href="#como-funciona" className="hover:text-[#0b58d0]">Como funciona</a>
            <Link href="/aluno" className="hover:text-[#0b58d0]">Área do aluno</Link>
            <Link href="/contactos" className="hover:text-[#0b58d0]">Contactos</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/contactos" className="inline-flex rounded-full border border-blue-100 px-3 py-2 text-xs font-extrabold text-[#0b45ad] lg:hidden dark:border-white/15 dark:text-white">Contactos</Link>
            <button onClick={toggleTheme} aria-label="Alternar tema" className="rounded-full border border-blue-100 p-2.5 transition hover:bg-blue-50 dark:border-white/15 dark:hover:bg-white/10">
              {theme === "dark" ? <Sun className="h-4 w-4 text-[#ffd326]" /> : <Moon className="h-4 w-4 text-[#0b45ad]" />}
            </button>
            <Link href="/inscricao" className="hidden rounded-full bg-[#f3bd08] px-5 py-3 text-sm font-extrabold text-[#0b2c68] shadow-lg shadow-yellow-200 transition hover:-translate-y-0.5 hover:bg-[#ffd43b] sm:inline-flex">Começar agora</Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative isolate">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_78%_14%,rgba(243,189,8,.25),transparent_24%),linear-gradient(120deg,#eaf3ff_0%,#f8fbff_55%,#fff9e5_100%)] dark:bg-[radial-gradient(circle_at_78%_14%,rgba(243,189,8,.16),transparent_24%),linear-gradient(120deg,#0d2445_0%,#07111f_60%,#17264b_100%)]" />
          <div className="pointer-events-none absolute inset-0 -z-10 bg-cover bg-center opacity-20 mix-blend-multiply dark:opacity-25 dark:mix-blend-screen" style={{ backgroundImage: `url(${HERO_BACKGROUND})` }} />
          <div className="container grid min-h-[680px] items-center gap-12 py-20 lg:grid-cols-[1.05fr_.95fr] lg:py-24">
            <div className="max-w-2xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/75 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[#0b45ad] dark:border-white/15 dark:bg-white/10 dark:text-[#ffd326]"><span className="h-2 w-2 rounded-full bg-[#f3bd08]" /> Formação profissional a distância</div>
              <h1 className="font-display text-5xl font-black leading-[.98] tracking-tight text-[#082d70] dark:text-white sm:text-6xl lg:text-7xl">A sua energia para <span className="text-[#e0a900]">conquistar</span> novas oportunidades.</h1>
              <p className="mt-7 max-w-xl text-lg leading-8 text-slate-600 dark:text-slate-300">Aprenda eletricidade básica para instalações residenciais em baixa tensão com uma formação prática, acessível e pensada para quem quer evoluir.</p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Link href="/inscricao" className="group inline-flex items-center gap-3 rounded-full bg-[#0b45ad] px-6 py-4 font-extrabold text-white shadow-xl shadow-blue-200 transition hover:-translate-y-1 hover:bg-[#083a93] dark:shadow-blue-950/30">Começar o curso agora <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" /></Link>
                <button onClick={shareCenter} className="inline-flex items-center gap-3 rounded-full border border-[#0b45ad]/20 bg-white px-6 py-4 font-bold text-[#0b45ad] transition hover:bg-blue-50 dark:border-white/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"><Share2 className="h-5 w-5" /> Partilhar centro</button>
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

        <section className="container py-24">
          <div className="flex flex-wrap items-end justify-between gap-6"><div><p className="eyebrow">Curso recomendado</p><h2 className="section-title mt-4">Comece pela base.</h2></div><Link href="/inscricao" className="inline-flex items-center gap-2 font-extrabold text-[#0b45ad] hover:gap-3 dark:text-[#ffd326]">Ver inscrição <ArrowRight className="h-4 w-4" /></Link></div>
          <div className="mt-10 grid gap-8 rounded-[2rem] border border-blue-100 bg-white p-5 shadow-lg dark:border-white/10 dark:bg-white/5 md:grid-cols-[.75fr_1.25fr] md:p-8">
            <div className="relative min-h-[280px] overflow-hidden rounded-[1.5rem] bg-[linear-gradient(140deg,#083e9d,#0d6bd8)] p-8"><div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-[#ffd326]/70 blur-3xl" /><div className="relative flex h-full flex-col justify-between"><div className="flex items-center justify-between"><span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-widest text-white">Curso principal</span><PlayCircle className="h-9 w-9 text-[#ffd326]" /></div><div><p className="font-display text-3xl font-black text-white">Eletricidade Básica</p><p className="mt-2 max-w-xs text-sm leading-6 text-blue-100">Instalações residenciais em baixa tensão.</p></div></div></div>
            <div className="flex flex-col justify-center"><div className="flex flex-wrap gap-3 text-sm font-bold text-slate-500 dark:text-slate-300"><span className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4 text-[#e0a900]" /> 12 horas</span><span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#e0a900]" /> Certificado</span></div><h3 className="mt-5 font-display text-3xl font-black">{course?.title ?? "Eletricidade Básica para Instalações Residenciais em Baixa Tensão"}</h3><p className="mt-4 leading-7 text-slate-600 dark:text-slate-300">{course?.description ?? "Formação introdutória para compreender circuitos, segurança, ferramentas e instalações residenciais de baixa tensão."}</p><Link href="/inscricao" className="mt-8 inline-flex w-fit items-center gap-3 rounded-full bg-[#f3bd08] px-6 py-3.5 font-extrabold text-[#092d6c] transition hover:bg-[#ffd43b]">Reservar a minha vaga <ArrowRight className="h-4 w-4" /></Link></div>
          </div>
        </section>

        {(videos.length > 0 || updates.length > 0) && <section className="border-t border-blue-100 bg-white py-24 dark:border-white/10 dark:bg-white/[.03]"><div className="container"><p className="eyebrow">Vitrine</p><h2 className="section-title mt-4">Novidades do centro.</h2><div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">{[...videos, ...updates].slice(0, 3).map(item => <article key={item.id} className="overflow-hidden rounded-3xl border border-blue-100 bg-[#f8fbff] dark:border-white/10 dark:bg-white/5">{item.mediaUrl ? <div className="aspect-video bg-black"><video className="h-full w-full object-cover" controls src={item.mediaUrl} /></div> : <div className="flex aspect-video items-center justify-center bg-[#0b45ad]"><PlayCircle className="h-12 w-12 text-[#ffd326]" /></div>}<div className="p-6"><p className="text-xs font-bold uppercase tracking-widest text-[#e0a900]">{item.kind === "update" ? "Atualização" : "Vídeo"}</p><h3 className="mt-2 font-display text-xl font-extrabold">{item.title}</h3>{item.body && <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{item.body}</p>}</div></article>)}</div></div></section>}
      </main>

      <footer className="border-t border-blue-100 bg-[#071f51] py-12 text-white dark:border-white/10"><div className="container flex flex-col justify-between gap-8 md:flex-row md:items-end"><div className="flex items-center gap-4"><img src={LOGO} alt="Sou Eletricista" className="h-16 w-16 rounded-full object-cover" /><div><p className="font-display text-xl font-black">Sou Eletricista</p><p className="mt-1 text-sm text-blue-200">Aprender • Praticar • Conquistar</p></div></div><div className="flex flex-wrap gap-5 text-sm font-semibold text-blue-100"><Link href="/aluno">Área do aluno</Link><Link href="/coordenacao">Coordenação</Link><Link href="/contactos">Contactos</Link><a href="mailto:souelectricista@gmail.com">souelectricista@gmail.com</a></div></div></footer>
    </div>
  );
}
