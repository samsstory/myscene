import { useState, useCallback, useRef, TouchEvent, MouseEvent } from "react";

interface Transform {
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

interface UseMultiTouchTransformOptions {
  initialTransform?: Partial<Transform>;
  minScale?: number;
  maxScale?: number;
}

interface TouchState {
  startDistance: number;
  startAngle: number;
  startScale: number;
  startRotation: number;
  startX: number;
  startY: number;
  centerX: number;
  centerY: number;
}

// Simplified touch point interface
interface TouchPoint {
  clientX: number;
  clientY: number;
}

export function useMultiTouchTransform(options: UseMultiTouchTransformOptions = {}) {
  const {
    initialTransform = {},
    minScale = 0.3,
    maxScale = 2,
  } = options;

  const [transform, setTransform] = useState<Transform>({
    x: initialTransform.x ?? 20,
    y: initialTransform.y ?? 100,
    scale: initialTransform.scale ?? 0.8,
    rotation: initialTransform.rotation ?? 0,
  });

  const touchStateRef = useRef<TouchState | null>(null);
  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });

  // Calculate distance between two touch points
  const getDistance = (touch1: TouchPoint, touch2: TouchPoint): number => {
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Calculate angle between two touch points
  const getAngle = (touch1: TouchPoint, touch2: TouchPoint): number => {
    return Math.atan2(
      touch2.clientY - touch1.clientY,
      touch2.clientX - touch1.clientX
    ) * (180 / Math.PI);
  };

  // Calculate center point between two touches
  const getCenter = (touch1: TouchPoint, touch2: TouchPoint) => ({
    x: (touch1.clientX + touch2.clientX) / 2,
    y: (touch1.clientY + touch2.clientY) / 2,
  });

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2) {
      // Two-finger gesture: prepare for pinch/rotate
      const touch1: TouchPoint = { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
      const touch2: TouchPoint = { clientX: e.touches[1].clientX, clientY: e.touches[1].clientY };
      const center = getCenter(touch1, touch2);
      
      touchStateRef.current = {
        startDistance: getDistance(touch1, touch2),
        startAngle: getAngle(touch1, touch2),
        startScale: transform.scale,
        startRotation: transform.rotation,
        startX: transform.x,
        startY: transform.y,
        centerX: center.x,
        centerY: center.y,
      };
    } else if (e.touches.length === 1) {
      // Single finger: prepare for drag
      isDraggingRef.current = true;
      lastMousePosRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    }
  }, [transform]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2 && touchStateRef.current) {
      e.preventDefault();
      
      const touch1: TouchPoint = { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
      const touch2: TouchPoint = { clientX: e.touches[1].clientX, clientY: e.touches[1].clientY };
      
      const currentDistance = getDistance(touch1, touch2);
      const currentAngle = getAngle(touch1, touch2);
      
      // Calculate scale change
      const scaleChange = currentDistance / touchStateRef.current.startDistance;
      let newScale = touchStateRef.current.startScale * scaleChange;
      newScale = Math.min(Math.max(newScale, minScale), maxScale);
      
      // Calculate rotation change
      const rotationChange = currentAngle - touchStateRef.current.startAngle;
      const newRotation = touchStateRef.current.startRotation + rotationChange;
      
      // Calculate position change based on center movement
      const currentCenter = getCenter(touch1, touch2);
      const dx = currentCenter.x - touchStateRef.current.centerX;
      const dy = currentCenter.y - touchStateRef.current.centerY;
      
      setTransform(prev => ({
        ...prev,
        scale: newScale,
        rotation: newRotation,
        x: touchStateRef.current!.startX + dx,
        y: touchStateRef.current!.startY + dy,
      }));
    } else if (e.touches.length === 1 && isDraggingRef.current) {
      // Single finger drag
      const touch: TouchPoint = { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
      const dx = touch.clientX - lastMousePosRef.current.x;
      const dy = touch.clientY - lastMousePosRef.current.y;
      
      lastMousePosRef.current = {
        x: touch.clientX,
        y: touch.clientY,
      };
      
      setTransform(prev => ({
        ...prev,
        x: prev.x + dx,
        y: prev.y + dy,
      }));
    }
  }, [minScale, maxScale]);

  const handleTouchEnd = useCallback(() => {
    touchStateRef.current = null;
    isDraggingRef.current = false;
  }, []);

  // Mouse handlers for desktop fallback
  const handleMouseDown = useCallback((e: MouseEvent) => {
    isDraggingRef.current = true;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingRef.current) return;
    
    const dx = e.clientX - lastMousePosRef.current.x;
    const dy = e.clientY - lastMousePosRef.current.y;
    
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    
    setTransform(prev => ({
      ...prev,
      x: prev.x + dx,
      y: prev.y + dy,
    }));
  }, []);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  // Mouse wheel for desktop scale
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.95 : 1.05;
    setTransform(prev => ({
      ...prev,
      scale: Math.min(Math.max(prev.scale * delta, minScale), maxScale),
    }));
  }, [minScale, maxScale]);

  return {
    transform,
    setTransform,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUp,
      onMouseLeave: handleMouseUp,
    },
    handleWheel,
  };
}
