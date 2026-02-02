/**
 * Style Forge Component
 * Integrates the style-editor library for comprehensive CSS property management
 */

import { useEffect, useState } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { StyleEditor, type StyleDefinition } from '@/lib/style-editor/lib';
import '@/lib/style-editor/lib/styles.css';
import ValidationPanel from './ValidationPanel';

export default function StyleForge() {
  const { selectedElementId, svgDocument } = useEditorStore();
  const [selectedElement, setSelectedElement] = useState<Element | null>(null);
  const [currentStyles, setCurrentStyles] = useState<StyleDefinition[]>([]);

  useEffect(() => {
    if (!svgDocument || !selectedElementId) {
      setSelectedElement(null);
      return;
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(svgDocument, 'image/svg+xml');
    const element = doc.querySelector(`#${CSS.escape(selectedElementId)}`);
    setSelectedElement(element);

    // Extract existing classes from the element
    if (element) {
      const classes = element.getAttribute('class')?.split(' ').filter(Boolean) || [];
      // For now, we'll start with empty styles - user can create new ones
      setCurrentStyles([]);
    }
  }, [svgDocument, selectedElementId]);

  const handleStylesChange = (styles: StyleDefinition[]) => {
    setCurrentStyles(styles);
    // TODO: Apply styles to the selected element
    console.log('Styles changed:', styles);
  };

  const handleSave = (style: StyleDefinition) => {
    console.log('Style saved:', style);
    // TODO: Apply the style class to the selected element
  };

  if (!selectedElementId) {
    return (
      <aside id="aside-style-forge" className="w-80 border-l border-border bg-card p-4 overflow-y-auto">
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
          </div>
          <p className="text-sm font-medium">No element selected</p>
          <p className="text-xs text-center mt-1">Select an element to edit styles</p>
        </div>
      </aside>
    );
  }

  return (
    <aside id="aside-style-forge" className="w-80 border-l border-border bg-card overflow-hidden flex flex-col">
      {/* Element Info Header */}
      <div className="flex-none border-b border-border p-4 bg-muted/30">
        <h3 className="text-sm font-semibold mb-2">Style Forge</h3>
        <div className="text-xs space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Selected:</span>
            <code className="px-2 py-0.5 bg-background rounded text-primary font-mono">
              {selectedElement?.tagName.toLowerCase()}#{selectedElementId}
            </code>
          </div>
          {selectedElement?.getAttribute('class') && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Classes:</span>
              <code className="px-2 py-0.5 bg-background rounded font-mono">
                {selectedElement.getAttribute('class')}
              </code>
            </div>
          )}
        </div>
      </div>

      {/* Style Editor Integration */}
      <div className="flex-1 overflow-hidden">
        <StyleEditor
          initialStyles={currentStyles}
          onStylesChange={handleStylesChange}
          onSave={handleSave}
          hideHeader={true}
          hideExport={true}
          className="h-full"
        />
      </div>

      {/* Validation Panel */}
      <div className="flex-none border-t border-border">
        <ValidationPanel />
      </div>
    </aside>
  );
}
