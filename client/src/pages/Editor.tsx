/**
 * MediaFranca Semantic Refiner - Main Editor
 * Design Philosophy: Technical Precision with Functional Aesthetics
 * - Monospace typography for technical accuracy
 * - High-contrast panels for clear visual hierarchy
 * - Minimal animations focused on functional feedback
 */

import { useEditorStore } from '@/stores/editorStore';
import { Redo, Undo, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SemanticTree from '@/components/editor/SemanticTree';
import SVGCanvas from '@/components/editor/SVGCanvas';
import StyleForgeEnhanced from '@/components/editor/StyleForgeEnhanced';

export default function Editor() {
  const { canUndo, canRedo, undo, redo, exportToSchema } = useEditorStore();

  const handleExport = () => {
    const schema = exportToSchema();
    const blob = new Blob([schema], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mediafranca-schema.svg';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div id="editor-shell" className="h-screen flex flex-col bg-background text-foreground">
      {/* Navigation Workflow */}
      <nav id="nav-workflow" className="border-b border-border bg-card px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold tracking-tight">PictoEditor</h1>
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
            Export to Schema
          </Button>
        </div>
      </nav>

      {/* Main Workspace */}
      <div id="view-workspace" className="flex-1 flex overflow-hidden">
        {/* Left Panel: Semantic Tree */}
        <aside id="aside-semantic-tree" className="w-64 flex-none border-r border-border bg-card overflow-y-auto">
          <SemanticTree />
        </aside>

        {/* Center: Canvas Viewport */}
        <main id="canvas-viewport" className="flex-1 min-w-0 bg-muted/30 overflow-hidden">
          <SVGCanvas />
        </main>

        {/* Right Panel: Style Forge */}
        <StyleForgeEnhanced />
      </div>
    </div>
  );
}
