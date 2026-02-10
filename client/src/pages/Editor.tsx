/**
 * MediaFranca Semantic Refiner - Main Editor
 * Design Philosophy: Technical Precision with Functional Aesthetics
 * - Monospace typography for technical accuracy
 * - High-contrast panels for clear visual hierarchy
 * - Minimal animations focused on functional feedback
 */

import { useEditorStore } from '@/stores/editorStore';
import { useEffect, useRef, useState } from 'react';
import { CircleHelp, FileDown, Redo, Undo } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import SemanticTree from '@/components/editor/SemanticTree';
import SVGCanvas from '@/components/editor/SVGCanvas';
import StyleForgeEnhanced from '@/components/editor/StyleForgeEnhanced';

export default function Editor() {
  const { canUndo, canRedo, undo, redo, exportToSchema, svgDocument } = useEditorStore();
  const [treeWidth, setTreeWidth] = useState(320);
  const [forgeWidth, setForgeWidth] = useState(320);
  const [showCode, setShowCode] = useState(false);
  const isResizingLeftRef = useRef(false);
  const isResizingRightRef = useRef(false);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (isResizingLeftRef.current) {
        const minWidth = 220;
        const maxWidth = Math.max(minWidth, window.innerWidth * 0.5);
        const nextWidth = Math.min(maxWidth, Math.max(minWidth, event.clientX));
        setTreeWidth(nextWidth);
        return;
      }
      if (isResizingRightRef.current) {
        const minWidth = 260;
        const maxWidth = Math.max(minWidth, window.innerWidth * 0.5);
        const nextWidth = Math.min(maxWidth, Math.max(minWidth, window.innerWidth - event.clientX));
        setForgeWidth(nextWidth);
      }
    };

    const handleMouseUp = () => {
      isResizingLeftRef.current = false;
      isResizingRightRef.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleExport = () => {
    const svg = svgDocument || exportToSchema();
    if (!svg) return;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    a.download = `picto-${stamp}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div id="editor-shell" className="h-screen flex flex-col bg-background text-foreground">
      {/* Navigation Workflow */}
      <nav id="nav-workflow" className="border-b border-border bg-card px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold tracking-tight">Picto • Editor</h1>
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:text-foreground"
                aria-label="Mostrar atajos de teclado"
              >
                <CircleHelp className="h-4 w-4" />
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-md fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <DialogHeader>
                <DialogTitle>Atajos y gestos</DialogTitle>
                <DialogDescription>
                  Tips rápidos para editar el SVG con precisión.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <div className="space-y-2">
                  <div className="font-semibold">Selección</div>
                  <div className="flex items-start gap-2">
                    <span className="min-w-[6rem] text-muted-foreground">Click</span>
                    <span>Selecciona un elemento en el canvas.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="min-w-[6rem] text-muted-foreground">Click</span>
                    <span>Selecciona un nodo desde el árbol semántico.</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="font-semibold">Transformaciones</div>
                  <div className="flex items-start gap-2">
                    <span className="min-w-[6rem] text-muted-foreground">Arrastrar</span>
                    <span>Mueve el elemento desde el bounding box.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="min-w-[6rem] text-muted-foreground">Esquinas</span>
                    <span>Escala el elemento.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="min-w-[6rem] text-muted-foreground">Alt/Shift</span>
                    <span>Rotar desde las esquinas del bounding box.</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="font-semibold">Zoom</div>
                  <div className="flex items-start gap-2">
                    <span className="min-w-[6rem] text-muted-foreground">Ctrl/⌘ + rueda</span>
                    <span>Zoom in/out.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="min-w-[6rem] text-muted-foreground">Botones</span>
                    <span>Usa +, − y “fit” en la esquina superior derecha.</span>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={undo}
            disabled={!canUndo()}
            className="gap-2"
          >
            <Undo className="w-4 h-4" />
            Undo
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={redo}
            disabled={!canRedo()}
            className="gap-2"
          >
            <Redo className="w-4 h-4" />
            Redo
          </Button>
          
          <div className="w-px h-6 bg-border mx-2" />
          
          <Button
            variant="default"
            size="sm"
            onClick={handleExport}
            className="gap-2"
          >
            <FileDown className="w-4 h-4" />
            Export SVG
          </Button>
        </div>
      </nav>

      {/* Main Workspace */}
      <div id="view-workspace" className="flex-1 flex overflow-hidden">
        {/* Left Panel: Semantic Tree */}
        <aside
          id="aside-semantic-tree"
          className="relative flex-none border-r border-border bg-card overflow-y-auto"
          style={{ width: `${treeWidth}px` }}
        >
          <SemanticTree />
          <div
            className="absolute right-0 top-0 h-full w-4 cursor-col-resize bg-muted/20 hover:bg-muted/40 transition-colors"
            onMouseDown={() => {
              isResizingLeftRef.current = true;
            }}
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize semantic tree panel"
          >
            <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border/70" />
            <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-border/70" />
              <span className="h-1.5 w-1.5 rounded-full bg-border/70" />
              <span className="h-1.5 w-1.5 rounded-full bg-border/70" />
            </div>
          </div>
        </aside>

        {/* Center: Canvas Viewport */}
        <main id="canvas-viewport" className="relative flex-1 min-w-0 bg-muted/30 overflow-hidden">
          <div className="absolute left-4 top-4 z-10 flex items-center gap-1 rounded-md border bg-background/90 p-1 text-xs shadow-sm backdrop-blur">
            <Button
              variant={showCode ? 'ghost' : 'secondary'}
              size="sm"
              onClick={() => setShowCode(false)}
            >
              Canvas
            </Button>
            <Button
              variant={showCode ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setShowCode(true)}
            >
              SVG
            </Button>
          </div>
          {showCode ? (
            <div className="h-full w-full overflow-auto p-6">
              {svgDocument ? (
                <pre className="whitespace-pre-wrap break-words rounded-lg border border-border bg-background p-4 text-xs leading-5 text-foreground shadow-sm">
                  {svgDocument}
                </pre>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No SVG loaded
                </div>
              )}
            </div>
          ) : (
            <SVGCanvas />
          )}
        </main>

        {/* Right Panel: Style Forge */}
        <aside
          id="aside-style-forge"
          className="relative flex-none border-l border-border bg-card overflow-hidden"
          style={{ width: `${forgeWidth}px` }}
        >
          <div
            className="absolute left-0 top-0 h-full w-4 cursor-col-resize bg-muted/20 hover:bg-muted/40 transition-colors"
            onMouseDown={() => {
              isResizingRightRef.current = true;
            }}
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize style forge panel"
          >
            <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border/70" />
            <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-border/70" />
              <span className="h-1.5 w-1.5 rounded-full bg-border/70" />
              <span className="h-1.5 w-1.5 rounded-full bg-border/70" />
            </div>
          </div>
          <StyleForgeEnhanced />
        </aside>
      </div>
    </div>
  );
}
