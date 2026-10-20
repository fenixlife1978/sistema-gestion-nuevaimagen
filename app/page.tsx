"use client";

import { useCallback, useState } from "react";

export default function Home() {
  const [frameReady, setFrameReady] = useState(false);
  const [frameError, setFrameError] = useState(false);

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

  return (
    <main className="workspace" aria-label="Sistema de Gestión Electoral">
      <section className="application">
        {!frameReady && !frameError && (
          <div className="loading" role="status">
            <span className="loadingMark">SG</span>
            <strong>Sistema de Gestión Electoral</strong>
            <span>Cargando el entorno de trabajo…</span>
          </div>
        )}
        {frameError && (
          <div className="frameError" role="alert">
            <strong>No se pudo aplicar la nueva interfaz.</strong>
            <p>La aplicación original se conserva. Recarga la página para volver a intentarlo.</p>
            <button onClick={() => window.location.reload()}>Recargar sistema</button>
          </div>
        )}
        <iframe
          title="Aplicación de Gestión Electoral"
          src="/legacy.html"
          onLoad={(event) => applySkin(event.currentTarget)}
          allow="clipboard-read; clipboard-write"
        />
      </section>
    </main>
  );
}
