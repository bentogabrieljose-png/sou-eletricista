import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Contactos from "./pages/Contactos";
import Coordenacao from "./pages/Coordenacao";
import Home from "./pages/Home";
import Inscricao from "./pages/Inscricao";
import Aluno from "./pages/Aluno";
import NotFound from "./pages/NotFound";
import Verificar from "./pages/Verificar";
import SobreDiretor from "./pages/SobreDiretor";
import SegundaVia from "./pages/SegundaVia";

function Router() {
  return <Switch>
    <Route path="/" component={Home} />
    <Route path="/inscricao" component={Inscricao} />
    <Route path="/aluno" component={Aluno} />
    <Route path="/coordenacao" component={Coordenacao} />
    <Route path="/contactos" component={Contactos} />
    <Route path="/diretor" component={SobreDiretor} />
    <Route path="/validar/:token" component={Verificar} />
    <Route path="/segunda-via/:token" component={SegundaVia} />
    <Route path="/404" component={NotFound} />
    <Route component={NotFound} />
  </Switch>;
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light" switchable><TooltipProvider><Toaster /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}
