/**
 * Style Editor Modal
 * Provides full style editing via mediafranca/style-editor in a modal
 */

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { useEditorStore } from '@/stores/editorStore';
import {
  StyleEditor,
  ViewMode,
} from '@/lib/style-editor/lib';

interface StyleEditorModalProps {
  open: boolean;
  onClose: () => void;
}

const ensureDynamicStyleTag = () => {
  if (document.getElementById('dynamic-svg-styles')) return;
  const styleTag = document.createElement('style');
  styleTag.id = 'dynamic-svg-styles';
  document.head.appendChild(styleTag);
};

export default function StyleEditorModal({ open, onClose }: StyleEditorModalProps) {
  const { styleDefinitions, keyframes, stylesVersion, setStyles, setKeyframes } = useEditorStore();

  useEffect(() => {
    if (!open) return;
    ensureDynamicStyleTag();
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-6xl h-[85vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div>
            <h2 className="text-base font-semibold">Style Editor</h2>
            <p className="text-xs text-muted-foreground">Edit and preview available CSS styles</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          <StyleEditor
            key={stylesVersion}
            initialStyles={styleDefinitions}
            initialKeyframes={keyframes}
            onStylesChange={setStyles}
            onKeyframesChange={setKeyframes}
            hideHeader={true}
            hideExport={true}
            defaultView={ViewMode.GRID}
            className="h-full bg-transparent"
          />
        </div>
      </div>
    </div>
  );
}
