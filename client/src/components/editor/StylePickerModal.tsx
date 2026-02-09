/**
 * Style Picker Modal
 * Shows available styles and applies them to a target element
 */

import { X } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import StylePreviewCard from '@/lib/style-editor/lib/components/StylePreviewCard';
import { updateDynamicStyles } from '@/lib/style-editor/lib/utils/cssGenerator';
import type { StyleDefinition } from '@/lib/style-editor/lib/types';

interface StylePickerModalProps {
  open: boolean;
  elementId: string | null;
  onClose: () => void;
}

export default function StylePickerModal({ open, elementId, onClose }: StylePickerModalProps) {
  const {
    svgDocument,
    styleDefinitions,
    keyframes,
    setElementClasses,
    addElementClasses,
    removeElementClasses,
  } = useEditorStore();

  const styles = useMemo(() => {
    return styleDefinitions;
  }, [styleDefinitions]);

  useEffect(() => {
    if (!open) return;
    if (!document.getElementById('dynamic-svg-styles')) {
      const styleTag = document.createElement('style');
      styleTag.id = 'dynamic-svg-styles';
      document.head.appendChild(styleTag);
    }
    updateDynamicStyles(styles, keyframes);
  }, [styles, keyframes, open]);

  const getElementClasses = () => {
    if (!elementId || !svgDocument) return [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgDocument, 'image/svg+xml');
    const element = doc.querySelector(`#${CSS.escape(elementId)}`);
    if (!element) return [];
    const classAttr = element.getAttribute('class') || '';
    return classAttr.split(' ').map((c) => c.trim()).filter(Boolean);
  };

  const elementClasses = useMemo(() => getElementClasses(), [svgDocument, elementId]);

  const handleApplyStyle = (styleDef: StyleDefinition) => {
    if (!elementId || !svgDocument) return;
    const selectors = styleDef.selectors.filter((sel) => sel.startsWith('.'));
    const classNames = selectors.map((sel) => sel.replace('.', ''));
    addElementClasses(elementId, classNames);
  };

  const handleRemoveStyle = (styleDef: StyleDefinition) => {
    if (!elementId || !svgDocument) return;
    const selectors = styleDef.selectors.filter((sel) => sel.startsWith('.'));
    const classNames = selectors.map((sel) => sel.replace('.', ''));
    removeElementClasses(elementId, classNames);
  };

  const handleRemoveClass = (className: string) => {
    if (!elementId) return;
    const next = elementClasses.filter((cls) => cls !== className);
    setElementClasses(elementId, next);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-5xl h-[80vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div>
            <h2 className="text-base font-semibold">Apply Style</h2>
            <p className="text-xs text-muted-foreground">
              {elementId ? `Target: #${elementId}` : 'Select an element first'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {elementClasses.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {elementClasses.map((cls) => (
                <button
                  key={cls}
                  className="text-xs font-mono px-2 py-1 rounded-full border border-gray-200 bg-white hover:bg-gray-100"
                  title="Remove class"
                  onClick={() => handleRemoveClass(cls)}
                >
                  .{cls} ×
                </button>
              ))}
            </div>
          )}
          {styles.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-10">
              <p>No styles defined yet</p>
              <p className="text-xs mt-1">Create styles in the Style Editor modal</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {styles.map((style) => (
                <div key={style.id} className="relative">
                  {(() => {
                    const selectors = style.selectors.filter((sel) => sel.startsWith('.'));
                    const classNames = selectors.map((sel) => sel.replace('.', ''));
                    const isApplied = classNames.some((name) => elementClasses.includes(name));
                    return (
                      <>
                        <StylePreviewCard
                          styleDef={style}
                          shape="square"
                          onClick={() => (isApplied ? handleRemoveStyle(style) : handleApplyStyle(style))}
                        />
                        <button
                          className={`absolute bottom-3 right-3 text-xs px-2 py-1 rounded-md border ${
                            isApplied ? 'bg-rose-50 border-rose-200 hover:bg-rose-100' : 'bg-white/90 border-gray-200 hover:bg-gray-100'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isApplied) {
                              handleRemoveStyle(style);
                            } else {
                              handleApplyStyle(style);
                            }
                          }}
                        >
                          {isApplied ? 'Remove' : 'Apply'}
                        </button>
                      </>
                    );
                  })()}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
