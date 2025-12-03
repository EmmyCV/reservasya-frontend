import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import ImageBookingFlow from "./ImageBookingFlow";
import type { Servicio } from "../types";

// Monta el host al importar este módulo
const containerId = "image-booking-host";
let rootEl = document.getElementById(containerId);
if (!rootEl) {
  rootEl = document.createElement("div");
  rootEl.id = containerId;
  document.body.appendChild(rootEl);
}
const root = createRoot(rootEl);

const Host: React.FC = () => {
  const [service, setService] = useState<Servicio | null>(null);

  useEffect(() => {
    // exponer funciones globales
    (window as any).openImageBooking = (svc: Servicio) => {
      setService(svc);
    };
    (window as any).closeImageBooking = () => {
      setService(null);
    };
    return () => {
      (window as any).openImageBooking = undefined;
      (window as any).closeImageBooking = undefined;
    };
  }, []);

  return service ? <ImageBookingFlow service={service} onClose={() => setService(null)} /> : null;
};

root.render(<Host />);

export {}; // módulo utilitario