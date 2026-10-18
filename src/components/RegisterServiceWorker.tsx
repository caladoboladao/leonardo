"use client";

import { useEffect } from "react";

export function RegisterServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // instalação como PWA é um extra — se falhar, o site continua
        // funcionando normalmente pelo navegador
      });
    }
  }, []);

  return null;
}
