"use client";

// Reusable circular cursor-centered magnifier (e-commerce loupe pattern).
// Portaled to <body> with position:fixed — never clipped by card containers
// (cards use overflow-hidden for rounded corners, which would cut the lens
// at the edges). Zoom math uses surface-relative coords; placement uses
// viewport coords.

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface LoupeOverlayProps {
  src: string;
  /** displayed bitmap size in CSS px (the surface's box) */
  displayW: number;
  displayH: number;
  /** cursor position relative to the surface (zoom anchor) */
  x: number;
  y: number;
  /** cursor position in viewport coords (lens placement) */
  clientX: number;
  clientY: number;
  zoom: number;
  size?: number;
}

export const LoupeOverlay: React.FC<LoupeOverlayProps> = ({
  src,
  displayW,
  displayH,
  x,
  y,
  clientX,
  clientY,
  zoom,
  size = 160,
}) => {
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => setHost(document.body), []);

  if (!host) return null;

  return createPortal(
    <div
      aria-hidden
      className="fixed rounded-full border-2 border-primary bg-background shadow-2xl pointer-events-none z-[9999] overflow-hidden"
      style={{
        width: size,
        height: size,
        left: clientX - size / 2,
        top: clientY - size / 2,
        backgroundImage: `url(${src})`,
        backgroundRepeat: "no-repeat",
        backgroundSize: `${displayW * zoom}px ${displayH * zoom}px`,
        backgroundPosition: `${size / 2 - x * zoom}px ${size / 2 - y * zoom}px`,
      }}
    />,
    host
  );
};
