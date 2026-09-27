import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Bold,
  Camera,
  FilePlus2,
  History,
  ImagePlus,
  Italic,
  List,
  ListOrdered,
  Printer,
  Redo2,
  Save,
  Trash2,
  Underline,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const LOGO = "/manus-storage/sou-eletricista-logo_a1bfc7b7.png";

export function NotebookPanel({
  accessCode,
  studentName,
}: {
  accessCode: string;
  studentName: string;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [editorHtml, setEditorHtml] = useState("");
  const [selectedVersion, setSelectedVersion] = useState("");
  const notebookQuery = trpc.student.notebook.useQuery(
    { accessCode },
    { enabled: Boolean(accessCode), staleTime: 5000 }
  );
  const versionsQuery = trpc.student.notebookVersions.useQuery(
    { accessCode, pageNumber },
    { enabled: Boolean(accessCode), staleTime: 5000 }
  );
  const savePage = trpc.student.saveNotebookPage.useMutation({
    onSuccess: data => {
      setEditorHtml(
        data?.pages.find(page => page.pageNumber === pageNumber)?.contentHtml ??
          editorHtml
      );
      notebookQuery.refetch();
      versionsQuery.refetch();
      toast.success("Página guardada e versão anterior arquivada.");
    },
    onError: error => toast.error(error.message),
  });
  const addPage = trpc.student.addNotebookPage.useMutation({
    onSuccess: data => {
      const last = data?.pages.at(-1)?.pageNumber ?? pageNumber;
      setPageNumber(last);
      notebookQuery.refetch();
      toast.success(`Folha ${last} criada.`);
    },
    onError: error => toast.error(error.message),
  });
  const restoreVersion = trpc.student.restoreNotebookVersion.useMutation({
    onSuccess: data => {
      const content =
        data?.pages.find(page => page.pageNumber === pageNumber)?.contentHtml ??
        "";
      setEditorHtml(content);
      if (editorRef.current) editorRef.current.innerHTML = content;
      notebookQuery.refetch();
      versionsQuery.refetch();
      toast.success("Versão recuperada.");
    },
    onError: error => toast.error(error.message),
  });
  const clearPage = trpc.student.clearNotebookPage.useMutation({
    onSuccess: () => {
      setEditorHtml("");
      if (editorRef.current) editorRef.current.innerHTML = "";
      notebookQuery.refetch();
      versionsQuery.refetch();
      toast.success("A folha foi limpa. A versão anterior ficou recuperável.");
    },
    onError: error => toast.error(error.message),
  });
  const uploadImage = trpc.student.uploadNotebookImage.useMutation({
    onSuccess: data => {
      if (!data?.url) return;
      document.execCommand(
        "insertHTML",
        false,
        `<img src="${data.url}" alt="Imagem do caderno" style="max-width:100%;height:auto;border-radius:12px;margin:12px 0;" />`
      );
      syncEditor();
      toast.success("Imagem adicionada ao caderno.");
    },
    onError: error => toast.error(error.message),
  });

  const pages = notebookQuery.data?.pages ?? [];
  const maxPage = Math.max(1, pages.at(-1)?.pageNumber ?? 1);
  const currentPage = useMemo(
    () => pages.find(page => page.pageNumber === pageNumber),
    [pages, pageNumber]
  );

  useEffect(() => {
    const content = currentPage?.contentHtml ?? "";
    setEditorHtml(content);
    if (editorRef.current && editorRef.current.innerHTML !== content)
      editorRef.current.innerHTML = content;
    setSelectedVersion("");
  }, [currentPage?.id, currentPage?.updatedAt, pageNumber]);

  function syncEditor() {
    const content = editorRef.current?.innerHTML ?? "";
    setEditorHtml(content);
    return content;
  }

  function command(name: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(name, false, value);
    syncEditor();
  }

  function save() {
    savePage.mutate({ accessCode, pageNumber, contentHtml: syncEditor() });
  }
  function changePage(next: number) {
    if (next >= 1 && next <= maxPage) setPageNumber(next);
  }
  function printNotebook() {
    window.print();
  }
  function confirmClear() {
    if (
      window.confirm(
        "Limpar esta folha? A versão atual será guardada no histórico para poder ser recuperada."
      )
    )
      clearPage.mutate({ accessCode, pageNumber });
  }

  function onImageSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/"))
      return toast.error("Escolha uma imagem JPG, PNG ou WEBP.");
    if (file.size > 8 * 1024 * 1024)
      return toast.error("A imagem deve ter no máximo 8 MB.");
    const reader = new FileReader();
    reader.onload = () =>
      uploadImage.mutate({
        accessCode,
        fileName: file.name,
        contentType: file.type,
        data: String(reader.result),
      });
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  return (
    <section className="notebook-print-area mt-8 rounded-[2rem] border border-blue-100 bg-[#eef5ff]/70 p-4 shadow-sm dark:border-white/10 dark:bg-[#07111f]/70 sm:p-7">
      <div className="notebook-toolbar mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-blue-100 bg-white p-3 dark:border-white/10 dark:bg-white/5">
        <div className="mr-2 flex items-center gap-2">
          <span className="rounded-xl bg-[#0b45ad] p-2 text-[#ffd326]">
            <History className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-black">Caderno</p>
            <p className="text-[11px] text-slate-500">Até 50 folhas A4</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1 border-l border-blue-100 pl-2 dark:border-white/10">
          <button
            type="button"
            onClick={() => command("bold")}
            className="tool-button"
            title="Negrito"
          >
            <Bold className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => command("italic")}
            className="tool-button"
            title="Itálico"
          >
            <Italic className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => command("underline")}
            className="tool-button"
            title="Sublinhado"
          >
            <Underline className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => command("insertUnorderedList")}
            className="tool-button"
            title="Lista"
          >
            <List className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => command("insertOrderedList")}
            className="tool-button"
            title="Lista numerada"
          >
            <ListOrdered className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => command("formatBlock", "h2")}
            className="tool-button text-xs font-black"
            title="Título"
          >
            H2
          </button>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className="notebook-action"
            title="Adicionar imagem ou foto"
          >
            <ImagePlus className="h-4 w-4" /> Imagem
          </button>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            capture="environment"
            className="hidden"
            onChange={onImageSelected}
          />
          <button
            type="button"
            onClick={save}
            disabled={savePage.isPending}
            className="notebook-action notebook-action-primary"
          >
            <Save className="h-4 w-4" />{" "}
            {savePage.isPending ? "A guardar…" : "Guardar"}
          </button>
          <button
            type="button"
            onClick={printNotebook}
            className="notebook-action"
            title="Imprimir ou guardar como PDF"
          >
            <Printer className="h-4 w-4" /> PDF
          </button>
        </div>
      </div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => changePage(pageNumber - 1)}
            disabled={pageNumber <= 1}
            className="page-nav"
          >
            ‹
          </button>
          <span className="rounded-full bg-white px-4 py-2 text-sm font-black shadow-sm dark:bg-white/10">
            Folha {pageNumber} de {maxPage}
          </span>
          <button
            type="button"
            onClick={() => changePage(pageNumber + 1)}
            disabled={pageNumber >= maxPage}
            className="page-nav"
          >
            ›
          </button>
          <button
            type="button"
            onClick={() => addPage.mutate({ accessCode })}
            disabled={maxPage >= 50 || addPage.isPending}
            className="notebook-action"
          >
            <FilePlus2 className="h-4 w-4" /> Nova folha
          </button>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedVersion}
            onChange={event => {
              setSelectedVersion(event.target.value);
              if (event.target.value)
                restoreVersion.mutate({
                  accessCode,
                  pageNumber,
                  versionId: Number(event.target.value),
                });
            }}
            className="field-input w-auto py-2 text-xs"
            disabled={!versionsQuery.data?.length}
          >
            <option value="">
              {versionsQuery.data?.length
                ? "Recuperar versão…"
                : "Sem versões antigas"}
            </option>
            {versionsQuery.data?.map(version => (
              <option key={version.id} value={version.id}>
                {new Date(version.createdAt).toLocaleString("pt-PT")}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={confirmClear}
            disabled={clearPage.isPending || !editorHtml}
            className="notebook-action text-red-600"
          >
            <Trash2 className="h-4 w-4" /> Limpar
          </button>
        </div>
      </div>
      <div className="notebook-page mx-auto max-w-[210mm] bg-white text-[#12213a] shadow-xl print:shadow-none">
        <div className="notebook-page-header">
          <img src={LOGO} alt="Sou Eletricista" />
          <div>
            <p className="text-xs font-black uppercase tracking-[.18em] text-[#d29e00]">
              Caderno de apontamentos
            </p>
            <p className="mt-1 text-sm font-bold text-[#0b45ad]">
              {studentName}
            </p>
          </div>
        </div>
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={syncEditor}
          className="notebook-editor"
          data-placeholder="Comece a escrever os seus apontamentos…"
        />
        <div className="notebook-page-footer">
          <span>souelectricista@gmail.com</span>
          <span>Folha {pageNumber}</span>
        </div>
      </div>
      <p className="mt-4 text-center text-xs text-slate-500">
        As alterações ficam guardadas neste aluno. Use “PDF” para imprimir ou
        guardar a folha em formato PDF.
      </p>
    </section>
  );
}
