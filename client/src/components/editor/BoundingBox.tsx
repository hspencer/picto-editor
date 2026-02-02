/**
 * Bounding Box Component
 * Implements Move and Scale operations with correct SVG coordinate transformation
 */

import { useEffect, useState, useRef } from 'react';
import { useEditorStore } from '@/stores/editorStore';

interface BoundingBoxProps {
  svgElement: SVGSVGElement;
  elementId: string;
  onTransformComplete?: () => void;
}

interface BBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

type HandleType = 'move' | 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'w' | 'e';

export default function BoundingBox({ svgElement, elementId, onTransformComplete }: BoundingBoxProps) {
  const [bbox, setBbox] = useState<BBox | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [activeHandle, setActiveHandle] = useState<HandleType | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; bbox: BBox; elementBBox: DOMRect } | null>(null);
  const targetElementRef = useRef<SVGGraphicsElement | null>(null);
  const { addToHistory } = useEditorStore();

  useEffect(() => {
    updateBoundingBox();
  }, [svgElement, elementId]);

  const updateBoundingBox = () => {
    const element = svgElement.querySelector(`#${CSS.escape(elementId)}`);
    if (element && element instanceof SVGGraphicsElement) {
      targetElementRef.current = element;
      try {
        const elementBBox = element.getBBox();
        
        // Get the SVG container's position on the page
        const svgRect = svgElement.getBoundingClientRect();
        
        // Transform bbox corners to screen coordinates
        const topLeft = svgElement.createSVGPoint();
        topLeft.x = elementBBox.x;
        topLeft.y = elementBBox.y;
        
        const bottomRight = svgElement.createSVGPoint();
        bottomRight.x = elementBBox.x + elementBBox.width;
        bottomRight.y = elementBBox.y + elementBBox.height;
        
        // Get the transformation matrix from element to screen
        const ctm = element.getScreenCTM();
        
        if (ctm) {
          const transformedTopLeft = topLeft.matrixTransform(ctm);
          const transformedBottomRight = bottomRight.matrixTransform(ctm);

          // Calculate position relative to SVG container
          setBbox({
            x: transformedTopLeft.x - svgRect.left,
            y: transformedTopLeft.y - svgRect.top,
            width: transformedBottomRight.x - transformedTopLeft.x,
            height: transformedBottomRight.y - transformedTopLeft.y,
          });
        }
      } catch (error) {
        console.error('Error calculating bounding box:', error);
        setBbox(null);
      }
    } else {
      targetElementRef.current = null;
      setBbox(null);
    }
  };

  const handleMouseDown = (e: React.MouseEvent, handle: HandleType) => {
    e.stopPropagation();
    if (!bbox || !targetElementRef.current) return;
    
    setIsDragging(true);
    setActiveHandle(handle);
    
    const elementBBox = targetElementRef.current.getBBox();
    
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      bbox: { ...bbox },
      elementBBox: elementBBox
    };
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !dragStartRef.current || !bbox || !activeHandle || !targetElementRef.current) return;

    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    const startBBox = dragStartRef.current.bbox;

    let newBBox = { ...bbox };

    switch (activeHandle) {
      case 'move':
        newBBox.x = startBBox.x + dx;
        newBBox.y = startBBox.y + dy;
        break;
      
      case 'nw':
        newBBox.x = startBBox.x + dx;
        newBBox.y = startBBox.y + dy;
        newBBox.width = startBBox.width - dx;
        newBBox.height = startBBox.height - dy;
        break;
      
      case 'ne':
        newBBox.y = startBBox.y + dy;
        newBBox.width = startBBox.width + dx;
        newBBox.height = startBBox.height - dy;
        break;
      
      case 'sw':
        newBBox.x = startBBox.x + dx;
        newBBox.width = startBBox.width - dx;
        newBBox.height = startBBox.height + dy;
        break;
      
      case 'se':
        newBBox.width = startBBox.width + dx;
        newBBox.height = startBBox.height + dy;
        break;
      
      case 'n':
        newBBox.y = startBBox.y + dy;
        newBBox.height = startBBox.height - dy;
        break;
      
      case 's':
        newBBox.height = startBBox.height + dy;
        break;
      
      case 'w':
        newBBox.x = startBBox.x + dx;
        newBBox.width = startBBox.width - dx;
        break;
      
      case 'e':
        newBBox.width = startBBox.width + dx;
        break;
    }

    // Prevent negative dimensions
    if (newBBox.width < 10) newBBox.width = 10;
    if (newBBox.height < 10) newBBox.height = 10;

    setBbox(newBBox);
  };

  const handleMouseUp = () => {
    if (isDragging && dragStartRef.current && bbox && targetElementRef.current) {
      // Apply transform to the actual SVG element
      applyTransform();
    }
    
    setIsDragging(false);
    setActiveHandle(null);
    dragStartRef.current = null;
  };

  const applyTransform = () => {
    if (!targetElementRef.current || !dragStartRef.current || !bbox || !svgElement) return;

    const element = targetElementRef.current;
    const startBBox = dragStartRef.current.bbox;
    const elementBBox = dragStartRef.current.elementBBox;
    
    // Calculate transform in screen space
    const screenDx = bbox.x - startBBox.x;
    const screenDy = bbox.y - startBBox.y;
    const screenScaleX = bbox.width / startBBox.width;
    const screenScaleY = bbox.height / startBBox.height;

    // Convert screen space deltas to SVG space
    const svgRect = svgElement.getBoundingClientRect();
    const ctm = element.getScreenCTM();
    
    if (!ctm) return;

    // Create inverse matrix to convert from screen to SVG coordinates
    const inverseCTM = ctm.inverse();
    
    // Convert translation from screen to SVG space
    const screenStart = svgElement.createSVGPoint();
    screenStart.x = startBBox.x + svgRect.left;
    screenStart.y = startBBox.y + svgRect.top;
    
    const screenEnd = svgElement.createSVGPoint();
    screenEnd.x = bbox.x + svgRect.left;
    screenEnd.y = bbox.y + svgRect.top;
    
    const svgStart = screenStart.matrixTransform(inverseCTM);
    const svgEnd = screenEnd.matrixTransform(inverseCTM);
    
    const svgDx = svgEnd.x - svgStart.x;
    const svgDy = svgEnd.y - svgStart.y;

    // Get current transform or create new one
    let transform = element.transform.baseVal;
    
    // Clear existing transforms for this operation
    while (transform.numberOfItems > 0) {
      transform.removeItem(0);
    }

    // Apply translation if moved
    if (Math.abs(svgDx) > 0.01 || Math.abs(svgDy) > 0.01) {
      const translate = svgElement.createSVGTransform();
      translate.setTranslate(svgDx, svgDy);
      transform.appendItem(translate);
    }

    // Apply scale if resized
    if (Math.abs(screenScaleX - 1) > 0.01 || Math.abs(screenScaleY - 1) > 0.01) {
      const scale = svgElement.createSVGTransform();
      // Scale from the element's origin point
      scale.setScale(screenScaleX, screenScaleY);
      transform.appendItem(scale);
      
      // Adjust translation to keep the element in place after scaling
      const scaleAdjustX = elementBBox.x * (1 - screenScaleX);
      const scaleAdjustY = elementBBox.y * (1 - screenScaleY);
      
      if (Math.abs(scaleAdjustX) > 0.01 || Math.abs(scaleAdjustY) > 0.01) {
        const adjustTranslate = svgElement.createSVGTransform();
        adjustTranslate.setTranslate(scaleAdjustX, scaleAdjustY);
        transform.insertItemBefore(adjustTranslate, 0);
      }
    }

    // Add to history
    addToHistory();

    // Update bounding box to reflect new position
    updateBoundingBox();
    
    // Notify parent component
    if (onTransformComplete) {
      onTransformComplete();
    }
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, bbox, activeHandle]);

  if (!bbox) return null;

  const handleStyle = "absolute w-3 h-3 bg-primary rounded-full border-2 border-background cursor-pointer hover:scale-125 transition-transform";

  return (
    <div
      className="absolute border-2 border-primary pointer-events-auto"
      style={{
        left: `${bbox.x}px`,
        top: `${bbox.y}px`,
        width: `${bbox.width}px`,
        height: `${bbox.height}px`,
        cursor: isDragging && activeHandle === 'move' ? 'grabbing' : 'grab',
      }}
      onMouseDown={(e) => handleMouseDown(e, 'move')}
    >
      {/* Corner handles for scaling */}
      <div 
        className={handleStyle}
        style={{ top: '-6px', left: '-6px', cursor: 'nwse-resize' }}
        onMouseDown={(e) => handleMouseDown(e, 'nw')}
      />
      <div 
        className={handleStyle}
        style={{ top: '-6px', right: '-6px', cursor: 'nesw-resize' }}
        onMouseDown={(e) => handleMouseDown(e, 'ne')}
      />
      <div 
        className={handleStyle}
        style={{ bottom: '-6px', left: '-6px', cursor: 'nesw-resize' }}
        onMouseDown={(e) => handleMouseDown(e, 'sw')}
      />
      <div 
        className={handleStyle}
        style={{ bottom: '-6px', right: '-6px', cursor: 'nwse-resize' }}
        onMouseDown={(e) => handleMouseDown(e, 'se')}
      />
      
      {/* Edge handles for resizing */}
      <div 
        className={handleStyle}
        style={{ top: '-6px', left: '50%', transform: 'translateX(-50%)', cursor: 'ns-resize' }}
        onMouseDown={(e) => handleMouseDown(e, 'n')}
      />
      <div 
        className={handleStyle}
        style={{ bottom: '-6px', left: '50%', transform: 'translateX(-50%)', cursor: 'ns-resize' }}
        onMouseDown={(e) => handleMouseDown(e, 's')}
      />
      <div 
        className={handleStyle}
        style={{ left: '-6px', top: '50%', transform: 'translateY(-50%)', cursor: 'ew-resize' }}
        onMouseDown={(e) => handleMouseDown(e, 'w')}
      />
      <div 
        className={handleStyle}
        style={{ right: '-6px', top: '50%', transform: 'translateY(-50%)', cursor: 'ew-resize' }}
        onMouseDown={(e) => handleMouseDown(e, 'e')}
      />
    </div>
  );
}
