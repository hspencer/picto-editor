/**
 * Available Styles Panel
 * Displays all available CSS classes from the style editor
 * Allows applying styles to selected elements
 */

import { useEditorStore } from '@/stores/editorStore';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface StyleClass {
  name: string;
  preview: string;
}

export default function AvailableStylesPanel() {
  const { selectedElementId, svgDocument } = useEditorStore();

  // Extract CSS classes from the SVG document's <style> element
  const extractStyles = (): StyleClass[] => {
    if (!svgDocument) return [];

    const parser = new DOMParser();
    const doc = parser.parseFromString(svgDocument, 'image/svg+xml');
    const styleElement = doc.querySelector('style');

    if (!styleElement) return [];

    const cssText = styleElement.textContent || '';
    const classRegex = /\.([a-zA-Z0-9_-]+)\s*\{([^}]+)\}/g;
    const styles: StyleClass[] = [];

    let match;
    while ((match = classRegex.exec(cssText)) !== null) {
      styles.push({
        name: match[1],
        preview: match[2].trim(),
      });
    }

    return styles;
  };

  const styles = extractStyles();

  const handleApplyStyle = (className: string) => {
    if (!selectedElementId || !svgDocument) return;

    const parser = new DOMParser();
    const doc = parser.parseFromString(svgDocument, 'image/svg+xml');
    const element = doc.querySelector(`#${CSS.escape(selectedElementId)}`);

    if (element) {
      const currentClass = element.getAttribute('class') || '';
      const classes = currentClass.split(' ').filter(Boolean);
      
      if (!classes.includes(className)) {
        classes.push(className);
        element.setAttribute('class', classes.join(' '));

        const serializer = new XMLSerializer();
        const updatedSVG = serializer.serializeToString(doc);
        
        // Update the store
        useEditorStore.getState().loadSVG(updatedSVG);
      }
    }
  };

  return (
    <div id="panel-available-styles" className="border-t border-border bg-card">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold">Available Styles</h3>
        <p className="text-xs text-muted-foreground mt-1">
          {selectedElementId ? 'Click to apply to selected element' : 'Select an element first'}
        </p>
      </div>

      <div className="p-4 max-h-48 overflow-y-auto">
        {styles.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-6">
            <p>No styles defined yet</p>
            <p className="text-xs mt-1">Create styles in the Style Forge panel</p>
          </div>
        ) : (
          <div className="space-y-2">
            {styles.map((style) => (
              <div
                key={style.name}
                className="flex items-start gap-2 p-2 border border-border rounded hover:bg-accent/30 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-sm font-semibold">.{style.name}</div>
                  <div className="text-xs text-muted-foreground font-mono truncate mt-1">
                    {style.preview}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  disabled={!selectedElementId}
                  onClick={() => handleApplyStyle(style.name)}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Apply
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
