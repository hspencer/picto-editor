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
  const { svgDocument, loadSVG, updateSVGDOM, selectedElementId, selectElement } = useEditorStore();
  const [refreshKey, setRefreshKey] = useState(0);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const svgContentRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [svgElement, setSvgElement] = useState<SVGSVGElement | null>(null);

  useEffect(() => {
    if (svgDocument && svgContentRef.current) {
      // Parse and normalize SVG
      const normalized = normalizeSVG(svgDocument);
      const dom = parseSVGToDOM(normalized.svg);
      
      if (dom) {
        updateSVGDOM(dom);
      }

      // Render SVG
      svgContentRef.current.innerHTML = normalized.svg;
      const svg = svgContentRef.current.querySelector('svg');
      
      if (svg) {
        svg.style.width = '100%';
        svg.style.height = '100%';
        setSvgElement(svg);
      }
    }
  }, [svgDocument, updateSVGDOM]);

  useEffect(() => {
    if (!svgElement) return;

    const handleSvgClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        selectElement(null);
        return;
      }

      if (target === svgElement) {
        selectElement(null);
        return;
      }

      const groupTarget = target.closest('g[id]');
      const elementTarget = groupTarget ?? target.closest('[id]');
      const id = elementTarget?.getAttribute('id') ?? null;
      selectElement(id);
    };

    svgElement.addEventListener('click', handleSvgClick);
    return () => {
      svgElement.removeEventListener('click', handleSvgClick);
    };
  }, [svgElement, selectElement]);

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
      const baseUrl = import.meta.env.BASE_URL || '/';
      const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
      const candidates = [
        `${normalizedBase}samples/make-bed.svg`,
        '/samples/make-bed.svg',
      ];

      let loaded = false;
      for (const url of candidates) {
        const response = await fetch(url, { cache: 'no-cache' });
        if (!response.ok) continue;
        const content = await response.text();
        if (!content.includes('<svg')) continue;
        loadSVG(content);
        loaded = true;
        break;
      }

      if (!loaded) {
        console.error('Failed to load sample SVG: no valid response');
      }
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
        <div id="canvas-stage" ref={svgContentRef} className="w-full h-full" />
        {svgElement && selectedElementId && (
          <BoundingBox 
            key={refreshKey}
            svgElement={svgElement} 
            elementId={selectedElementId}
            containerElement={svgContainerRef.current ?? svgElement}
            onTransformComplete={() => setRefreshKey(prev => prev + 1)}
          />
        )}
      </div>
    </div>
  );
}
