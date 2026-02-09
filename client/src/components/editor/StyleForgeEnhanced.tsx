/**
 * Style Forge Panel
 * Shows selected element details and provides re-prompt + style editor access
 */

import { useEffect, useState } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { Button } from '@/components/ui/button';
import AgentPromptDock from './AgentPromptDock';
import ValidationPanel from './ValidationPanel';
import StyleEditorModal from './StyleEditorModal';
import StylePickerModal from './StylePickerModal';

export default function StyleForgeEnhanced() {
  const { selectedElementId, svgDocument, removeElementClasses } = useEditorStore();
  const [selectedElement, setSelectedElement] = useState<Element | null>(null);
  const [isStyleEditorOpen, setIsStyleEditorOpen] = useState(false);
  const [isStylePickerOpen, setIsStylePickerOpen] = useState(false);

  useEffect(() => {
    if (!svgDocument || !selectedElementId) {
      setSelectedElement(null);
      return;
    }
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgDocument, 'image/svg+xml');
    const element = doc.querySelector(`#${CSS.escape(selectedElementId)}`);
    setSelectedElement(element);
  }, [svgDocument, selectedElementId]);

  if (!svgDocument) {
    return (
      <aside id="aside-style-forge" className="w-80 border-l border-border bg-card p-4 overflow-y-auto">
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
          <p className="text-sm font-medium">No SVG loaded</p>
          <p className="text-xs text-center mt-1">Import an SVG to edit</p>
        </div>
      </aside>
    );
  }

  return (
    <aside id="aside-style-forge" className="w-80 border-l border-border bg-card overflow-hidden flex flex-col">
      <div className="flex-none border-b border-border p-4 bg-muted/30">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Element Details</h3>
            <p className="text-xs text-muted-foreground mt-1">
              {selectedElementId ? `Selected: #${selectedElementId}` : 'No element selected'}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setIsStyleEditorOpen(true)}>
            Edit Styles
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {selectedElement ? (
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Tag</span>
              <code className="px-2 py-0.5 bg-background rounded font-mono">
                {selectedElement.tagName.toLowerCase()}
              </code>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">ID</span>
              <code className="px-2 py-0.5 bg-background rounded font-mono">#{selectedElementId}</code>
            </div>
            {selectedElement.getAttribute('class') && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Classes</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => setIsStylePickerOpen(true)}
                  >
                    Manage
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedElement
                    .getAttribute('class')
                    ?.split(' ')
                    .map((cls) => cls.trim())
                    .filter(Boolean)
                    .map((cls) => (
                      <button
                        key={cls}
                        className="text-xs font-mono px-2 py-1 rounded-full border border-border bg-background hover:bg-muted"
                        title="Remove class"
                        onClick={() => {
                          if (!selectedElementId) return;
                          removeElementClasses(selectedElementId, [cls]);
                        }}
                      >
                        .{cls} ×
                      </button>
                    ))}
                </div>
              </div>
            )}
            {!selectedElement.getAttribute('class') && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Classes</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7"
                  onClick={() => setIsStylePickerOpen(true)}
                >
                  Add Style
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            Select an element to view details and re-prompt.
          </div>
        )}

        <div className="border-t border-border pt-4">
          <AgentPromptDock />
        </div>
      </div>

      <div className="flex-none border-t border-border">
        <ValidationPanel />
      </div>

      <StyleEditorModal open={isStyleEditorOpen} onClose={() => setIsStyleEditorOpen(false)} />
      <StylePickerModal
        open={isStylePickerOpen}
        elementId={selectedElementId}
        onClose={() => setIsStylePickerOpen(false)}
      />
    </aside>
  );
}
