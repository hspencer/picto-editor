/**
 * Available Styles Panel
 * Displays all available CSS classes from the style editor
 * Allows applying styles to selected elements
 */

import { useEditorStore } from '@/stores/editorStore';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import StylePreviewCard from '@/lib/style-editor/lib/components/StylePreviewCard';
import { getSvgStyleText, parseCssToStyleDefinitions } from '@/lib/styleUtils';
import type { StyleDefinition } from '@/lib/style-editor/lib/types';

export default function AvailableStylesPanel() {
  const { selectedElementId, svgDocument } = useEditorStore();

  // Extract CSS classes from the SVG document's <style> element
  const extractStyles = (): StyleDefinition[] => {
    if (!svgDocument) return [];
    const cssText = getSvgStyleText(svgDocument);
    return parseCssToStyleDefinitions(cssText);
  };

  const styles = extractStyles();

  const handleApplyStyle = (styleDef: StyleDefinition) => {
    if (!selectedElementId || !svgDocument) return;

    const parser = new DOMParser();
    const doc = parser.parseFromString(svgDocument, 'image/svg+xml');
    const element = doc.querySelector(`#${CSS.escape(selectedElementId)}`);

    if (!element) return;

    const currentClass = element.getAttribute('class') || '';
    const classes = currentClass.split(' ').filter(Boolean);
    const selectors = styleDef.selectors.filter((sel) => sel.startsWith('.'));
    const classNames = selectors.map((sel) => sel.replace('.', ''));

    let changed = false;
    classNames.forEach((name) => {
      if (!classes.includes(name)) {
        classes.push(name);
        changed = true;
      }
    });

    if (!changed) return;

    element.setAttribute('class', classes.join(' '));
    const serializer = new XMLSerializer();
    const updatedSVG = serializer.serializeToString(doc);
    useEditorStore.getState().loadSVG(updatedSVG);
  };

  return (
    <div id="panel-available-styles" className="border-t border-border bg-card">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold">Available Styles</h3>
        <p className="text-xs text-muted-foreground mt-1">
          {selectedElementId ? 'Click to apply to selected element' : 'Select an element first'}
        </p>
      </div>

      <div className="p-4 max-h-80 overflow-y-auto">
        {styles.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-6">
            <p>No styles defined yet</p>
            <p className="text-xs mt-1">Create styles in the Style Forge panel</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {styles.map((style) => (
              <div key={style.id} className="relative">
                <StylePreviewCard
                  styleDef={style}
                  shape="square"
                  onClick={() => handleApplyStyle(style)}
                />
                <div className="absolute bottom-3 right-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 bg-white/80"
                    disabled={!selectedElementId}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleApplyStyle(style);
                    }}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Apply
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
