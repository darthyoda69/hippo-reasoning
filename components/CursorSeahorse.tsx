'use client';

import { useEffect, useRef, useState } from 'react';

export function CursorSeahorse() {
  const [visible, setVisible] = useState(false);
  const posRef = useRef({ x: 0, y: 0 });
  const targetRef = useRef({ x: 0, y: 0 });
  const velRef = useRef({ x: 0, y: 0 });
  const elRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      targetRef.current = { x: e.clientX, y: e.clientY };
      if (!visible) setVisible(true);
    };

    const onLeave = () => setVisible(false);
    const onEnter = () => setVisible(true);

    window.addEventListener('mousemove', onMove);
    document.addEventListener('mouseleave', onLeave);
    document.addEventListener('mouseenter', onEnter);

    // Initialize position
    posRef.current = { ...targetRef.current };

    const animate = () => {
      const pos = posRef.current;
      const target = targetRef.current;
      const vel = velRef.current;

      // Spring physics — smooth follow with slight overshoot
      const dx = target.x - pos.x;
      const dy = target.y - pos.y;

      vel.x += dx * 0.08;
      vel.y += dy * 0.08;
      vel.x *= 0.75;
      vel.y *= 0.75;

      pos.x += vel.x;
      pos.y += vel.y;

      // Tilt based on horizontal velocity
      const tilt = Math.max(-25, Math.min(25, vel.x * 2));

      if (elRef.current) {
        elRef.current.style.transform =
          `translate(${pos.x - 16}px, ${pos.y - 20}px) rotate(${tilt}deg)`;
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseleave', onLeave);
      document.removeEventListener('mouseenter', onEnter);
      cancelAnimationFrame(animRef.current);
    };
  }, [visible]);

  return (
    <div
      ref={elRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 9998,
        pointerEvents: 'none',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.3s ease',
        filter: 'drop-shadow(0 0 6px #00ff41) drop-shadow(0 0 12px rgba(0,255,65,0.3))',
      }}
    >
      <svg
        width="32"
        height="40"
        viewBox="0 0 32 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Seahorse silhouette */}
        <path
          d={[
            // Crown/dorsal spines
            'M16 1',
            'C15 1 14.5 2.5 14.5 3.5',
            'C14.5 4.5 15 5 16 5',
            // Head
            'C18 5 20 6.5 20 9',
            // Snout
            'C20 9 22 9 23 8.5',
            'C23.5 8.2 23 7.5 22 7.8',
            'C21 8.2 20 8.5 19.5 9',
            // Jaw line
            'C19 10 19 11 18.5 12',
            // Belly curve
            'C18 13.5 18 15 17.5 17',
            'C17 19 16.5 21 16 23',
            // Tail curl (the signature spiral)
            'C15.5 25 14.5 27 13 28.5',
            'C11.5 30 10 31.5 9.5 33',
            'C9 34.5 9.5 36 10.5 36.5',
            'C11.5 37 12.5 36 13 35',
            'C13.5 34 13.5 32.5 13 31',
            'C12.5 30 12 29 12.5 28',
            // Back up the back
            'C13 27 13.5 25.5 14 24',
            'C14.5 22 14.5 20 14.5 18',
            // Back ridge
            'C14.5 16 14 14 13.5 12.5',
            'C13 11 13 9.5 13.5 8',
            // Back of head
            'C14 6.5 14.5 5 15 3.5',
            'C15.2 2.5 15.5 1.5 16 1',
            'Z',
          ].join(' ')}
          fill="#00ff41"
          fillOpacity={0.85}
        />
        {/* Eye */}
        <circle cx="17.5" cy="7.8" r="1" fill="#000" />
        <circle cx="17.7" cy="7.6" r="0.4" fill="#00ff41" />
        {/* Dorsal fin bumps */}
        <path
          d="M14 10 C12.5 9.5 12 10.5 13 11 M13.5 12.5 C12 12 11.5 13 12.5 13.5 M14 15 C12.5 14.5 12 15.5 13 16 M14.5 17.5 C13 17 12.5 18 13.5 18.5"
          stroke="#00ff41"
          strokeWidth="0.6"
          strokeOpacity={0.6}
          fill="none"
        />
      </svg>
    </div>
  );
}
