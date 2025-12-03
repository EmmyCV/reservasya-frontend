import React, { createContext, useContext, useState } from "react";
import ImageBookingFlow from "./ImageBookingFlow";
import type { Servicio } from "../types";

type OpenBookingFn = (service: Servicio) => void;

const ImageBookingContext = createContext<{
  openBooking: OpenBookingFn;
  closeBooking: () => void;
} | null>(null);

export const ImageBookingProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  const [service, setService] = useState<Servicio | null>(null);

  // Abre el flujo con un servicio
  const openBooking: OpenBookingFn = (svc) => {
    setService(svc);
  };

  // Cierra el flujo
  const closeBooking = () => setService(null);

  return (
    <ImageBookingContext.Provider value={{ openBooking, closeBooking }}>
      {children}

      {/* ⬇️ Renderiza tu flujo SOLO si hay un servicio seleccionado */}
      {service && (
        <ImageBookingFlow
          service={service}
          onClose={closeBooking}
        />
      )}
    </ImageBookingContext.Provider>
  );
};

export const useImageBooking = () => {
  const ctx = useContext(ImageBookingContext);
  if (!ctx) {
    throw new Error("useImageBooking must be used within ImageBookingProvider");
  }
  return ctx;
};

export default ImageBookingContext;
