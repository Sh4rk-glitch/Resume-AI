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
  parallaxOn = true
}) => {
  const cursorRef = useRef<HTMLDivElement>(null);
  const cornersRef = useRef<NodeListOf<HTMLDivElement> | null>(null);
  const spinTl = useRef<gsap.Timeline | null>(null);
  const dotRef = useRef<HTMLDivElement>(null);

  const mousePos = useRef({ x: 0, y: 0 });
  const isActiveRef = useRef(false);
  const isSnappingRef = useRef(false); 
  const activeTargetRef = useRef<Element | null>(null);
  const constants = useMemo(() => ({ borderWidth: 2, cornerSize: 16 }), []);

  /**
   * ANIMATION CONFIGURATION
   * Adjust these values to change the feel of the cursor:
   */
  const EXPANSION_SPEED = 0.1; // Lower = Slower/Smoother expansion. Try 0.1 for very slow.
  const FOLLOW_SPEED_PARALLAX = 0.12; // Speed when tracking mouse with parallax enabled
  const FOLLOW_SPEED_DIRECT = 0.25; // Speed when tracking mouse normally
  const RETURN_SPEED = 0.15; // Speed when returning to the center "dot" state

  const isMobile = useMemo(() => {
    const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isSmallScreen = window.innerWidth <= 768;
    return hasTouchScreen && isSmallScreen;
  }, []);

  const resetToDefault = useCallback(() => {
    isActiveRef.current = false;
    isSnappingRef.current = false;
    activeTargetRef.current = null;
    
    if (cornersRef.current) {
      const corners = Array.from(cornersRef.current);
      gsap.killTweensOf(corners);
      const { cornerSize } = constants;
      const positions = [
        { x: -cornerSize * 1.5, y: -cornerSize * 1.5 },
        { x: cornerSize * 0.5, y: -cornerSize * 1.5 },
        { x: cornerSize * 0.5, y: cornerSize * 0.5 },
        { x: -cornerSize * 1.5, y: cornerSize * 0.5 }
      ];
      corners.forEach((corner, index) => {
        gsap.to(corner, { 
          x: positions[index].x, 
          y: positions[index].y, 
          duration: 0.4, 
          ease: 'expo.out',
          overwrite: true 
        });
      });
    }

    if (cursorRef.current && spinTl.current) {
      const currentRotation = gsap.getProperty(cursorRef.current, 'rotation') as number;
      const normalizedRotation = currentRotation % 360;
      spinTl.current.kill();
      spinTl.current = gsap
        .timeline({ repeat: -1 })
        .to(cursorRef.current, { rotation: '+=360', duration: spinDuration, ease: 'none' });
      
      gsap.to(cursorRef.current, {
        rotation: normalizedRotation + 360,
        duration: spinDuration * (1 - (normalizedRotation / 360)),
        ease: 'none',
        onComplete: () => {
          spinTl.current?.restart();
        }
      });
    }
  }, [constants, spinDuration]);

  useEffect(() => {
    resetToDefault();
  }, [appState, resetToDefault]);

  useEffect(() => {
    if (isMobile || !cursorRef.current) return;

    if (hideDefaultCursor) {
      document.documentElement.classList.add('target-cursor-active');
    }

    const cursor = cursorRef.current;
    cornersRef.current = cursor.querySelectorAll<HTMLDivElement>('.target-cursor-corner');

    spinTl.current = gsap
      .timeline({ repeat: -1 })
      .to(cursor, { rotation: '+=360', duration: spinDuration, ease: 'none' });

    const tickerFn = () => {
      gsap.set(cursor, { x: mousePos.current.x, y: mousePos.current.y });

      if (!isActiveRef.current || !activeTargetRef.current || !cornersRef.current) return;

      if (!document.body.contains(activeTargetRef.current)) {
        resetToDefault();
        return;
      }

      const rect = activeTargetRef.current.getBoundingClientRect();
      const { borderWidth, cornerSize } = constants;
      const targetBounds = [
        { x: rect.left - borderWidth, y: rect.top - borderWidth },
        { x: rect.right + borderWidth - cornerSize, y: rect.top - borderWidth },
        { x: rect.right + borderWidth - cornerSize, y: rect.bottom + borderWidth - cornerSize },
        { x: rect.left - borderWidth, y: rect.bottom + borderWidth - cornerSize }
      ];

      const corners = Array.from(cornersRef.current);
      let allSettled = true;

      corners.forEach((corner, i) => {
        const currentX = gsap.getProperty(corner, 'x') as number;
        const currentY = gsap.getProperty(corner, 'y') as number;
        
        const targetRelX = targetBounds[i].x - mousePos.current.x;
        const targetRelY = targetBounds[i].y - mousePos.current.y;

        const dx = targetRelX - currentX;
        const dy = targetRelY - currentY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Determine which speed to use based on the current state
        let lerpFactor;
        if (isSnappingRef.current) {
          lerpFactor = EXPANSION_SPEED;
        } else if (isActiveRef.current) {
          lerpFactor = parallaxOn ? FOLLOW_SPEED_PARALLAX : FOLLOW_SPEED_DIRECT;
        } else {
          lerpFactor = RETURN_SPEED;
        }
        
        // If any corner is still far from its target, we are not "settled"
        if (dist > 1.0) {
          allSettled = false;
        }

        const nextX = currentX + dx * lerpFactor;
        const nextY = currentY + dy * lerpFactor;
        
        gsap.set(corner, { x: nextX, y: nextY });
      });

      // Transition from expansion phase to smooth tracking phase
      if (allSettled && isSnappingRef.current) {
        isSnappingRef.current = false;
      }
    };

    gsap.ticker.add(tickerFn);

    const onMouseMove = (e: MouseEvent) => {
      mousePos.current.x = e.clientX;
      mousePos.current.y = e.clientY;
    };

    const onMouseOver = (e: MouseEvent) => {
      const target = (e.target as Element).closest(targetSelector);
      if (!target || activeTargetRef.current === target) return;

      activeTargetRef.current = target;
      
      gsap.killTweensOf(cursor, 'rotation');
      if (spinTl.current) spinTl.current.pause();
      gsap.set(cursor, { rotation: 0 });

      if (cornersRef.current) {
        Array.from(cornersRef.current).forEach(corner => gsap.killTweensOf(corner));
      }

      isActiveRef.current = true;
      isSnappingRef.current = true; // Trigger expansion logic in the ticker

      const onMouseLeave = () => {
        resetToDefault();
        target.removeEventListener('mouseleave', onMouseLeave);
      };
      target.addEventListener('mouseleave', onMouseLeave);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseover', onMouseOver);

    return () => {
      gsap.ticker.remove(tickerFn);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseover', onMouseOver);
      document.documentElement.classList.remove('target-cursor-active');
      if (spinTl.current) spinTl.current.kill();
    };
  }, [targetSelector, spinDuration, constants, hideDefaultCursor, isMobile, parallaxOn, resetToDefault, EXPANSION_SPEED, FOLLOW_SPEED_PARALLAX, FOLLOW_SPEED_DIRECT, RETURN_SPEED]);

  if (isMobile) return null;

  return (
    <div
      ref={cursorRef}
      className="fixed top-0 left-0 w-0 h-0 pointer-events-none z-[99999]"
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