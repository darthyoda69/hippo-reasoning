'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
const CHARS = 'hippoHIPPO01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
const MSG_LINES = [
  '> HIPPO PROTOCOL ACTIVATED',
  '> built by leon benz',
  '> the hippocampus never forgets',
  '> reasoning memory is the next frontier',
  '',
  '  -- vercel ai accelerator 2026 --',
];

export function MatrixRain() {
  const [active, setActive] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bufferRef = useRef<number[]>([]);
  const animRef = useRef<number>(0);
  const startRef = useRef<number>(0);

  const handleKey = useCallback((e: KeyboardEvent) => {
    bufferRef.current.push(0); // placeholder
    const key = e.key;
    const seq = bufferRef.current;
    // Store actual keys separately
    if (!('_keys' in bufferRef)) (bufferRef as any)._keys = [];
    (bufferRef as any)._keys.push(key);
    const keys: string[] = (bufferRef as any)._keys;

    if (keys.length > KONAMI.length) {
      keys.shift();
      seq.shift();
    }
    if (keys.length === KONAMI.length && keys.every((k, i) => k === KONAMI[i])) {
      setActive(true);
      keys.length = 0;
      seq.length = 0;
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  useEffect(() => {
    if (!active || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const fontSize = 14;
    const cols = Math.floor(canvas.width / fontSize);
    const drops: number[] = Array.from({ length: cols }, () => Math.random() * -50);
    startRef.current = performance.now();

    const draw = (now: number) => {
      const elapsed = now - startRef.current;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = `${fontSize}px "JetBrains Mono", monospace`;

      for (let i = 0; i < drops.length; i++) {
        const char = CHARS[Math.floor(Math.random() * CHARS.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        // Lead character is bright white-green, trail fades
        if (Math.random() > 0.5) {
          ctx.fillStyle = '#fff';
        } else {
          ctx.fillStyle = `rgb(0, ${150 + Math.floor(Math.random() * 105)}, ${Math.floor(Math.random() * 65)})`;
        }
        ctx.fillText(char, x, y);

        if (y > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i] += 0.5 + Math.random() * 0.5;
      }

      // Show message after 1.5s
      if (elapsed > 1500) {
        const alpha = Math.min((elapsed - 1500) / 1000, 1);
        ctx.save();
        ctx.fillStyle = `rgba(0, 0, 0, ${0.7 * alpha})`;
        const boxW = 460;
        const boxH = MSG_LINES.length * 28 + 40;
        const boxX = (canvas.width - boxW) / 2;
        const boxY = (canvas.height - boxH) / 2;
        ctx.fillRect(boxX, boxY, boxW, boxH);

        ctx.strokeStyle = `rgba(0, 255, 65, ${alpha})`;
        ctx.lineWidth = 1;
        ctx.strokeRect(boxX, boxY, boxW, boxH);

        ctx.font = `14px "JetBrains Mono", monospace`;
        ctx.textAlign = 'center';
        MSG_LINES.forEach((line, idx) => {
          if (idx === 0) {
            ctx.fillStyle = `rgba(10, 189, 198, ${alpha})`;
            ctx.shadowColor = '#0abdc6';
            ctx.shadowBlur = 12;
          } else if (idx === MSG_LINES.length - 1) {
            ctx.fillStyle = `rgba(64, 64, 64, ${alpha})`;
            ctx.shadowBlur = 0;
          } else {
            ctx.fillStyle = `rgba(0, 255, 65, ${alpha})`;
            ctx.shadowColor = '#00ff41';
            ctx.shadowBlur = 8;
          }
          ctx.fillText(line, canvas.width / 2, boxY + 30 + idx * 28);
        });
        ctx.restore();
      }

      // Auto-close after 6s
      if (elapsed < 6000) {
        animRef.current = requestAnimationFrame(draw);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setActive(false);
      }
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [active]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      onClick={() => { cancelAnimationFrame(animRef.current); setActive(false); }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        cursor: 'pointer',
      }}
    />
  );
}
