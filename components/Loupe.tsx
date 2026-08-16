"use client";

// Reusable circular cursor-centered magnifier (e-commerce loupe pattern).
// Rendered inside a `relative` surface that exactly bounds the displayed
// bitmap; x/y are pointer coords in that surface's space.

import React from "react";

interface LoupeOverlayProps {
  src: string;
  /** displayed bitmap size in CSS px (the surface's box) */
  displayW: number;
  displayH: number;
  /** cursor position relative to the surface */
  x: number;
  y: number;
  zoom: number;
  size?: number;
}

export const LoupeOverlay: React.FC<LoupeOverlayProps> = ({
  src,
  displayW,
  displayH,
  x,
  y,
  zoom,
  size = 160,
}) => (
  <div
    aria-hidden
    className="absolute rounded-full border-2 border-primary bg-background shadow-2xl pointer-events-none z-40 overflow-hidden"
    style={{
      width: size,
      height: size,
      left: x - size / 2,
      top: y - size / 2,
      backgroundImage: `url(${src})`,
      backgroundRepeat: "no-repeat",
      backgroundSize: `${displayW * zoom}px ${displayH * zoom}px`,
      backgroundPosition: `${size / 2 - x * zoom}px ${size / 2 - y * zoom}px`,
    }}
  />
);
