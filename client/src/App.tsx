import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import { LoadingState } from "./components/PageLoader";

const Contactos = lazy(() => import("./pages/Contactos"));
const Coordenacao = lazy(() => import("./pages/Coordenacao"));
const Inscricao = lazy(() => import("./pages/Inscricao"));
const Aluno = lazy(() => import("./pages/Aluno"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Verificar = lazy(() => import("./pages/Verificar"));
const SobreDiretor = lazy(() => import("./pages/SobreDiretor"));
const SegundaVia = lazy(() => import("./pages/SegundaVia"));
const Vitrine = lazy(() => import("./pages/Vitrine"));

function RouteFallback() {
  return <div className="min-h-[40vh]" aria-live="polite"><LoadingState label="A carregar a área…" /></div>;
}

function Router() {
  return <Suspense fallback={<RouteFallback />}><Switch>
    <Route path="/" component={Home} />
    <Route path="/vitrine" component={Vitrine} />
    <Route path="/inscricao" component={Inscricao} />
    <Route path="/aluno" component={Aluno} />
    <Route path="/coordenacao" component={Coordenacao} />
    <Route path="/contactos" component={Contactos} />
    <Route path="/diretor" component={SobreDiretor} />
    <Route path="/validar/:token" component={Verificar} />
    <Route path="/segunda-via/:token" component={SegundaVia} />
    <Route path="/404" component={NotFound} />
    <Route component={NotFound} />
  </Switch></Suspense>;
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light" switchable><TooltipProvider><Toaster /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}
