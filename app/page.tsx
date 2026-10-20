"use client";

import { useCallback, useState } from "react";

const navigation = [
  { section: "GENERAL", items: [{ label: "Panel de trabajo", mark: "⌂" }, { label: "Personas y padrón", mark: "◎" }, { label: "Comunidades", mark: "⌘" }, { label: "Comités", mark: "▦" }] },
  { section: "OPERACIONES", items: [{ label: "Centros y mesas", mark: "▤" }, { label: "Verificaciones", mark: "✓" }, { label: "Actas y cortes", mark: "▥" }, { label: "Reportes", mark: "▧" }] },
  { section: "SISTEMA", items: [{ label: "Usuarios y permisos", mark: "♙" }, { label: "Auditoría", mark: "◷" }] },
];

export default function Home() {
  const [frameReady, setFrameReady] = useState(false);
  const [frameError, setFrameError] = useState(false);
  const [activeNav, setActiveNav] = useState("Panel de trabajo");

  const applySkin = useCallback((frame: HTMLIFrameElement) => {
    try {
      const doc = frame.contentDocument;
      if (!doc) return;
      let link = doc.getElementById("nextjs-admin-skin") as HTMLLinkElement | null;
      if (!link) {
        link = doc.createElement("link");
        link.id = "nextjs-admin-skin";
        link.rel = "stylesheet";
        link.href = "/legacy-skin.css";
        doc.head.appendChild(link);
      }
      setFrameReady(true);
      setFrameError(false);
    } catch {
      setFrameError(true);
    }
  }, []);

  const openWorkspace = (label: string) => {
    setActiveNav(label);
    const frame = document.querySelector<HTMLIFrameElement>("#legacy-workspace");
    const doc = frame?.contentDocument;
    if (!doc) return;
    const terms: Record<string, string[]> = {
      "Panel de trabajo": ["inicio", "resumen", "panel", "dashboard"],
      "Personas y padrón": ["persona", "padrón", "padron"],
      "Comunidades": ["comunidad"],
      "Comités": ["comité", "comite"],
      "Centros y mesas": ["centro", "mesa"],
      "Verificaciones": ["verific"],
      "Actas y cortes": ["acta", "corte"],
      "Reportes": ["reporte", "informe"],
      "Usuarios y permisos": ["usuario", "permiso"],
      "Auditoría": ["auditor"],
    };
    const tabs = Array.from(doc.querySelectorAll<HTMLElement>(".tab"));
    const target = tabs.find((tab) => {
      const text = (tab.innerText || tab.textContent || "").toLocaleLowerCase("es").trim();
      return (terms[label] || [label.toLocaleLowerCase("es")]).some((term) => text.includes(term));
    });
    target?.click();
    frame?.contentWindow?.focus();
  };

  return (
    <main className="appShell">
      <aside className="sidebar">
        <div className="brand"><div className="brandMark">SG</div><div><strong>GESTIÓN</strong><span>ELECTORAL</span></div></div>
        <div className="workspaceLabel">ESPACIO DE TRABAJO</div>
        <div className="navList">
          {navigation.map((group) => <div className="navGroup" key={group.section}>
            <div className="navHeading">{group.section}</div>
            {group.items.map((item) => <button key={item.label} className={activeNav === item.label ? "navItem selected" : "navItem"} onClick={() => openWorkspace(item.label)} title={item.label}>
              <span className="navIcon" aria-hidden="true">{item.mark}</span><span>{item.label}</span>
            </button>)}
          </div>)}
        </div>
        <div className="sidebarFooter"><span className="statusDot" /> Plataforma electoral <small>Interfaz Next.js</small></div>
      </aside>
      <section className="mainColumn">
        <header className="topbar"><div><span className="breadcrumb">Sistema</span><span className="crumbSep">/</span><strong>{activeNav}</strong></div><div className="topStatus"><span className={frameReady ? "statusDot" : "statusDot pending"} />{frameReady ? "Espacio de trabajo conectado" : "Conectando espacio de trabajo"}</div></header>
        <div className="pageIntro"><div><div className="eyebrow">SISTEMA INTEGRAL DE GESTIÓN</div><h1>{activeNav}</h1><p>Administración centralizada de la operación electoral.</p></div><div className="environment"><span className="environmentDot" /> TURSO · DATOS OPERATIVOS</div></div>
        <section className="application" aria-label="Módulos del sistema electoral">
          {!frameReady && !frameError && <div className="loading" role="status"><span className="loadingMark">SG</span><strong>Preparando el sistema</strong><span>Cargando módulos y sesión…</span></div>}
          {frameError && <div className="frameError" role="alert"><strong>No se pudo cargar la interfaz.</strong><p>La aplicación original se conserva. Recarga para volver a intentarlo.</p><button onClick={() => window.location.reload()}>Recargar sistema</button></div>}
          <iframe id="legacy-workspace" title="Módulos de Gestión Electoral" src="/legacy.html" onLoad={(event) => applySkin(event.currentTarget)} allow="clipboard-read; clipboard-write" />
        </section>
      </section>
    </main>
  );
}
