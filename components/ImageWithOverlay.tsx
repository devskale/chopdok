import React, { useEffect, useRef } from 'react';

interface ImageWithOverlayProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  overlayText?: string;
}

const ImageWithOverlay: React.FC<ImageWithOverlayProps> = ({ src, alt, width, height, className, overlayText }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      canvas.width = width;
      canvas.height = height;
      
      // Draw the image
      ctx.drawImage(img, 0, 0, width, height);
      
      // Add overlay text if provided
      if (overlayText) {
        ctx.font = '12px Arial';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        const textWidth = ctx.measureText(overlayText).width;
        ctx.fillText(overlayText, width - textWidth - 5, height - 5);
      }
    };
    img.src = src;
  }, [src, width, height, overlayText]);

  return <canvas ref={canvasRef} className={className} role="img" aria-label={alt} />;
};

export default ImageWithOverlay;