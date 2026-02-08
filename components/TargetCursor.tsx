
import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import { gsap } from 'gsap';

export interface TargetCursorProps {
  appState?: any;
  targetSelector?: string;
  spinDuration?: number;
  hideDefaultCursor?: boolean;
  hoverDuration?: number;
  parallaxOn?: boolean;
}

const TargetCursor: React.FC<TargetCursorProps> = ({
  appState,
  targetSelector = '.cursor-target',
  spinDuration = 4,
  hideDefaultCursor = true,
  hoverDuration = 0.3,
  parallaxOn = true
}) => {
  const cursorRef = useRef<HTMLDivElement>(null);
  const cornersRef = useRef<NodeListOf<HTMLDivElement> | null>(null);
  const spinTl = useRef<any>(null);
  const dotRef = useRef<HTMLDivElement>(null);

  const isActiveRef = useRef(false);
  const targetCornerPositionsRef = useRef<{ x: number; y: number }[] | null>(null);
  const tickerFnRef = useRef<(() => void) | null>(null);
  const activeStrengthRef = useRef({ current: 0 });
  const activeTargetRef = useRef<Element | null>(null);

  const isMobile = useMemo(() => {
    const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isSmallScreen = window.innerWidth <= 768;
    return hasTouchScreen && isSmallScreen;
  }, []);

  const constants = useMemo(() => ({ borderWidth: 2, cornerSize: 16 }), []);

  const moveCursor = useCallback((x: number, y: number) => {
    if (!cursorRef.current) return;
    gsap.to(cursorRef.current, { x, y, duration: 0.1, ease: 'power2.out' });
  }, []);

  useEffect(() => {
    if (isMobile || !cursorRef.current) return;

    if (hideDefaultCursor) {
      document.documentElement.classList.add('target-cursor-active');
    }

    const cursor = cursorRef.current;
    cornersRef.current = cursor.querySelectorAll<HTMLDivElement>('.target-cursor-corner');

    const resetCursorToDefault = () => {
      if (tickerFnRef.current) gsap.ticker.remove(tickerFnRef.current);
      isActiveRef.current = false;
      targetCornerPositionsRef.current = null;
      gsap.set(activeStrengthRef.current, { current: 0, overwrite: true });
      
      if (cornersRef.current) {
        const corners = Array.from(cornersRef.current);
        const { cornerSize } = constants;
        const positions = [
          { x: -cornerSize * 1.5, y: -cornerSize * 1.5 },
          { x: cornerSize * 0.5, y: -cornerSize * 1.5 },
          { x: cornerSize * 0.5, y: cornerSize * 0.5 },
          { x: -cornerSize * 1.5, y: cornerSize * 0.5 }
        ];
        corners.forEach((corner, index) => {
          gsap.to(corner, { x: positions[index].x, y: positions[index].y, duration: 0.3, ease: 'power2.out' });
        });
      }

      if (cursorRef.current && !spinTl.current?.isActive()) {
         if (!spinTl.current) {
           spinTl.current = gsap.timeline({ repeat: -1 })
             .to(cursorRef.current, { rotation: '+=360', duration: spinDuration, ease: 'none' });
         } else {
           spinTl.current.resume();
         }
      }
    };

    gsap.set(cursor, {
      xPercent: -50,
      yPercent: -50,
      x: window.innerWidth / 2,
      y: window.innerHeight / 2
    });

    const tickerFn = () => {
      if (!targetCornerPositionsRef.current || !cursorRef.current || !cornersRef.current) return;
      const strength = activeStrengthRef.current.current;
      if (strength === 0) return;
      const cursorX = gsap.getProperty(cursorRef.current, 'x') as number;
      const cursorY = gsap.getProperty(cursorRef.current, 'y') as number;
      const corners = Array.from(cornersRef.current);
      corners.forEach((corner, i) => {
        const currentX = gsap.getProperty(corner, 'x') as number;
        const currentY = gsap.getProperty(corner, 'y') as number;
        const targetX = targetCornerPositionsRef.current![i].x - cursorX;
        const targetY = targetCornerPositionsRef.current![i].y - cursorY;
        gsap.to(corner, {
          x: currentX + (targetX - currentX) * strength,
          y: currentY + (targetY - currentY) * strength,
          duration: 0.1,
          overwrite: 'auto'
        });
      });
    };

    tickerFnRef.current = tickerFn;

    const moveHandler = (e: MouseEvent) => moveCursor(e.clientX, e.clientY);
    window.addEventListener('mousemove', moveHandler);

    const enterHandler = (e: MouseEvent) => {
      const target = (e.target as Element).closest(targetSelector);
      if (!target || !cursorRef.current || !cornersRef.current) return;
      
      activeTargetRef.current = target;
      spinTl.current?.pause();
      gsap.to(cursorRef.current, { rotation: 0, duration: 0.2 });

      const rect = target.getBoundingClientRect();
      const { borderWidth, cornerSize } = constants;

      targetCornerPositionsRef.current = [
        { x: rect.left - borderWidth, y: rect.top - borderWidth },
        { x: rect.right + borderWidth - cornerSize, y: rect.top - borderWidth },
        { x: rect.right + borderWidth - cornerSize, y: rect.bottom + borderWidth - cornerSize },
        { x: rect.left - borderWidth, y: rect.bottom + borderWidth - cornerSize }
      ];

      isActiveRef.current = true;
      gsap.ticker.add(tickerFnRef.current!);
      gsap.to(activeStrengthRef.current, { current: 1, duration: hoverDuration, ease: 'power2.out' });

      const leaveHandler = () => {
        resetCursorToDefault();
        target.removeEventListener('mouseleave', leaveHandler);
      };
      target.addEventListener('mouseleave', leaveHandler);
    };

    window.addEventListener('mouseover', enterHandler);

    return () => {
      if (tickerFnRef.current) gsap.ticker.remove(tickerFnRef.current);
      window.removeEventListener('mousemove', moveHandler);
      window.removeEventListener('mouseover', enterHandler);
      document.documentElement.classList.remove('target-cursor-active');
    };
  }, [appState, targetSelector, spinDuration, moveCursor, constants, hideDefaultCursor, isMobile, hoverDuration]);

  if (isMobile) return null;

  return (
    <div
      ref={cursorRef}
      className="fixed top-0 left-0 w-0 h-0 pointer-events-none z-[5000]"
      style={{ willChange: 'transform' }}
    >
      <div
        ref={dotRef}
        className="absolute top-1/2 left-1/2 w-1.5 h-1.5 bg-indigo-500 rounded-full -translate-x-1/2 -translate-y-1/2 shadow-[0_0_8px_rgba(99,102,241,0.8)]"
      />
      <div className="target-cursor-corner absolute top-1/2 left-1/2 w-4 h-4 border-[2px] border-indigo-500 -translate-x-[150%] -translate-y-[150%] border-r-0 border-b-0" />
      <div className="target-cursor-corner absolute top-1/2 left-1/2 w-4 h-4 border-[2px] border-indigo-500 translate-x-1/2 -translate-y-[150%] border-l-0 border-b-0" />
      <div className="target-cursor-corner absolute top-1/2 left-1/2 w-4 h-4 border-[2px] border-indigo-500 translate-x-1/2 translate-y-1/2 border-l-0 border-t-0" />
      <div className="target-cursor-corner absolute top-1/2 left-1/2 w-4 h-4 border-[2px] border-indigo-500 -translate-x-[150%] translate-y-1/2 border-r-0 border-t-0" />
    </div>
  );
};

export default TargetCursor;
