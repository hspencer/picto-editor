/**
 * SVG Canvas Component
 * Renders SVG with accurate coordinate mapping using getScreenCTM()
 * Implements bounding box for selected elements
 */

import { useEditorStore } from '@/stores/editorStore';
import { useEffect, useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { normalizeSVG, parseSVGToDOM } from '@/lib/svgNormalizer';
import BoundingBox from './BoundingBox';

export default function SVGCanvas() {
  const { svgDocument, loadSVG, updateSVGDOM, selectedElementId } = useEditorStore();
  const [refreshKey, setRefreshKey] = useState(0);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [svgElement, setSvgElement] = useState<SVGSVGElement | null>(null);

  useEffect(() => {
    if (svgDocument && svgContainerRef.current) {
      // Parse and normalize SVG
      const normalized = normalizeSVG(svgDocument);
      const dom = parseSVGToDOM(normalized.svg);
      
      if (dom) {
        updateSVGDOM(dom);
      }

      // Render SVG
      svgContainerRef.current.innerHTML = normalized.svg;
      const svg = svgContainerRef.current.querySelector('svg');
      
      if (svg) {
        svg.style.width = '100%';
        svg.style.height = '100%';
        setSvgElement(svg);
      }
    }
  }, [svgDocument, updateSVGDOM]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        loadSVG(content);
      };
      reader.readAsText(file);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleLoadSample = async () => {
    try {
      const response = await fetch('/samples/make-bed.svg');
      const content = await response.text();
      loadSVG(content);
    } catch (error) {
      console.error('Failed to load sample SVG:', error);
    }
  };

  if (!svgDocument) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Upload className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Import SVG</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Upload a generative SVG to begin refining
          </p>
          <div className="flex gap-2 justify-center">
            <Button onClick={handleUploadClick}>
              Choose File
            </Button>
            <Button variant="outline" onClick={handleLoadSample}>
              Load Sample
            </Button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".svg,image/svg+xml"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-auto" style={{ position: 'relative' }}>
      <div
        ref={svgContainerRef}
        className="flex items-center justify-center p-8 min-h-full"
        style={{ position: 'relative' }}
      >
        {svgElement && selectedElementId && (
          <BoundingBox 
            key={refreshKey}
            svgElement={svgElement} 
            elementId={selectedElementId}
            onTransformComplete={() => setRefreshKey(prev => prev + 1)}
          />
        )}
      </div>
    </div>
  );
}
