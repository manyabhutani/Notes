import React, { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';

interface CanvasProps {
  pageId: number;
  tool: 'pen' | 'eraser' | 'text' | 'sticky';
  color: string;
}

const Canvas: React.FC<CanvasProps> = ({ pageId, tool, color }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const annotations = useLiveQuery(() => db.annotations.where({ pageId }).toArray(), [pageId]);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [isDrawing, setIsDrawing] = useState(false);
  
  // Dragging state
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, initialX: 0, initialY: 0 });

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (tool !== 'pen') return;
    setIsDrawing(true);
    const { x, y } = getCoordinates(e);
    setCurrentPath(`M ${x} ${y}`);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (isDrawing && tool === 'pen') {
      const { x, y } = getCoordinates(e);
      setCurrentPath((prev) => `${prev} L ${x} ${y}`);
    } else if (draggedId !== null) {
      const { x, y } = getCoordinates(e);
      const dx = x - dragStart.x;
      const dy = y - dragStart.y;
      
      db.annotations.update(draggedId, {
        x: dragStart.initialX + dx,
        y: dragStart.initialY + dy
      });
    }
  };

  const stopDrawing = async () => {
    if (isDrawing) {
      setIsDrawing(false);
      if (currentPath) {
        await db.annotations.add({
          pageId,
          type: 'ink',
          content: JSON.stringify({ path: currentPath, color }),
          x: 0,
          y: 0,
        });
        setCurrentPath('');
      }
    }
    setDraggedId(null);
  };

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const handleSvgClick = async (e: React.MouseEvent) => {
    if (tool !== 'text' && tool !== 'sticky') return;
    
    // Prevent creating a new one if we just finished dragging
    if (draggedId !== null) return;

    const { x, y } = getCoordinates(e);
    await db.annotations.add({
      pageId,
      type: tool,
      content: '', // Empty initial content
      x,
      y,
      width: tool === 'sticky' ? 150 : 200,
      height: tool === 'sticky' ? 150 : 40,
      color: tool === 'sticky' ? '#fff9c4' : color,
    });
  };

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent, id: number, initialX: number, initialY: number) => {
    // Only drag if not in pen tool or if specifically dragging the element
    if (tool === 'pen') return;
    
    e.stopPropagation();
    const { x, y } = getCoordinates(e);
    setDraggedId(id);
    setDragStart({ x, y, initialX, initialY });
  };

  const updateAnnotation = async (id: number, content: string) => {
    await db.annotations.update(id, { content });
  };

  const removeAnnotation = async (id: number) => {
    if (tool === 'eraser') {
      await db.annotations.delete(id);
    }
  };

  return (
    <div 
      className="drawing-layer" 
      onMouseMove={draw}
      onMouseUp={stopDrawing}
      onMouseLeave={stopDrawing}
      onTouchMove={draw}
      onTouchEnd={stopDrawing}
      style={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        width: '100%', 
        height: '100%', 
        zIndex: 10,
        pointerEvents: 'auto'
      }}
    >
      <svg
        ref={svgRef}
        onMouseDown={startDrawing}
        onTouchStart={startDrawing}
        onClick={handleSvgClick}
        style={{ 
          width: '100%', 
          height: '100%', 
          position: 'absolute', 
          touchAction: 'none',
          cursor: tool === 'pen' ? 'crosshair' : 'default',
          zIndex: tool === 'pen' ? 2 : 1
        }}
      >
        {annotations?.filter(a => a.type === 'ink').map((ann) => {
          const { path, color: annColor } = JSON.parse(ann.content);
          return (
            <path
              key={ann.id}
              d={path}
              stroke={annColor}
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              onClick={(e) => {
                e.stopPropagation();
                ann.id && removeAnnotation(ann.id);
              }}
              style={{ cursor: tool === 'eraser' ? 'pointer' : 'inherit' }}
            />
          );
        })}
        {currentPath && (
          <path
            d={currentPath}
            stroke={color}
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>

      <div style={{ position: 'relative', width: '100%', height: '100%', pointerEvents: 'none', zIndex: 3 }}>
        {annotations?.filter(a => a.type !== 'ink').map((ann) => (
          <div
            key={ann.id}
            className={ann.type === 'sticky' ? 'sticky-note' : 'text-annotation'}
            onMouseDown={(e) => ann.id && handleDragStart(e, ann.id, ann.x, ann.y)}
            onTouchStart={(e) => ann.id && handleDragStart(e, ann.id, ann.x, ann.y)}
            style={{
              position: 'absolute',
              left: ann.x,
              top: ann.y,
              width: ann.width,
              height: ann.height,
              backgroundColor: ann.type === 'sticky' ? ann.color : 'transparent',
              color: ann.type === 'sticky' ? '#333' : ann.color,
              pointerEvents: 'auto',
              cursor: tool === 'eraser' ? 'pointer' : 'move',
              border: ann.type === 'text' && tool !== 'pen' ? '1px dashed rgba(0,0,0,0.1)' : 'none',
              padding: ann.type === 'sticky' ? '15px' : '5px',
            }}
            onClick={(e) => {
              if (tool === 'eraser') {
                e.stopPropagation();
                ann.id && removeAnnotation(ann.id);
              }
            }}
          >
            <textarea
              value={ann.content}
              onChange={(e) => ann.id && updateAnnotation(ann.id, e.target.value)}
              placeholder={ann.type === 'sticky' ? 'Write a note...' : 'Type here...'}
              onMouseDown={(e) => e.stopPropagation()} // Allow clicking inside to type without dragging
              onTouchStart={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                background: 'transparent',
                outline: 'none',
                resize: 'none',
                fontFamily: 'inherit',
                color: 'inherit',
                fontSize: ann.type === 'sticky' ? '14px' : '16px',
                overflow: 'hidden'
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default Canvas;
