/**
 * SVG Canvas Component
 * Renders SVG with accurate coordinate mapping using getScreenCTM()
 * Implements bounding box for selected elements
 */

import { useEditorStore } from '@/stores/editorStore';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Maximize2, Upload, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { normalizeSVG, parseSVGToDOM } from '@/lib/svgNormalizer';
import { updateDynamicStyles } from '@/lib/style-editor/lib';
import BoundingBox from './BoundingBox';

export default function SVGCanvas() {
  const {
    svgDocument,
    loadSVG,
    updateSVGDOM,
    selectedElementId,
    selectElement,
    styleDefinitions,
    keyframes,
  } = useEditorStore();
  const [refreshKey, setRefreshKey] = useState(0);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const svgContentRef = useRef<HTMLDivElement>(null);
  const canvasFrameRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [svgElement, setSvgElement] = useState<SVGSVGElement | null>(null);
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [fitZoom, setFitZoom] = useState(1);
  const [fitMode, setFitMode] = useState(true);

  const MIN_ZOOM = 0.1;
  const MAX_ZOOM = 8;
  const ZOOM_STEP = 1.1;

  const clampZoom = useCallback((value: number) => {
    return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
  }, []);

  const computeFitZoom = useCallback(() => {
    if (!canvasSize || !svgContainerRef.current) return 1;

    const container = svgContainerRef.current;
    const style = window.getComputedStyle(container);
    const paddingX =
      parseFloat(style.paddingLeft || '0') + parseFloat(style.paddingRight || '0');
    const paddingY =
      parseFloat(style.paddingTop || '0') + parseFloat(style.paddingBottom || '0');
    const availableWidth = Math.max(1, container.clientWidth - paddingX);
    const availableHeight = Math.max(1, container.clientHeight - paddingY);

    const scale = Math.min(
      availableWidth / canvasSize.width,
      availableHeight / canvasSize.height
    );

    return clampZoom(scale);
  }, [canvasSize, clampZoom]);

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
        svg.style.display = 'block';
        setSvgElement(svg);

        let width = parseFloat(svg.getAttribute('width') || '');
        let height = parseFloat(svg.getAttribute('height') || '');

        if ((!width || !height) && svg.viewBox && svg.viewBox.baseVal.width && svg.viewBox.baseVal.height) {
          width = svg.viewBox.baseVal.width;
          height = svg.viewBox.baseVal.height;
        }

        if ((!width || !height) && svg.width && svg.height) {
          if (!width) width = svg.width.baseVal.value;
          if (!height) height = svg.height.baseVal.value;
        }

        if ((!width || !height) && typeof svg.getBBox === 'function') {
          try {
            const bbox = svg.getBBox();
            if (bbox.width && bbox.height) {
              width = bbox.width;
              height = bbox.height;
            }
          } catch {
            // ignore bbox errors
          }
        }

        if (!width || !height) {
          width = 300;
          height = 150;
        }
        setCanvasSize({ width, height });
      }
    }
  }, [svgDocument, updateSVGDOM]);

  useEffect(() => {
    if (!document.getElementById('dynamic-svg-styles')) {
      const styleTag = document.createElement('style');
      styleTag.id = 'dynamic-svg-styles';
      document.head.appendChild(styleTag);
    }
    updateDynamicStyles(styleDefinitions, keyframes);
  }, [styleDefinitions, keyframes]);

  useEffect(() => {
    if (!canvasSize) return;
    const nextFit = computeFitZoom();
    setFitZoom(nextFit);
    setZoom(nextFit);
    setFitMode(true);
  }, [canvasSize, computeFitZoom]);

  useEffect(() => {
    if (!svgContainerRef.current) return;

    const container = svgContainerRef.current;
    const observer = new ResizeObserver(() => {
      const nextFit = computeFitZoom();
      setFitZoom(nextFit);
      if (fitMode) {
        setZoom(nextFit);
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [computeFitZoom, fitMode]);

  useEffect(() => {
    if (!svgDocument) return;
    setRefreshKey(prev => prev + 1);
  }, [zoom, svgDocument]);

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

  const handleZoomIn = () => {
    setFitMode(false);
    setZoom(prev => clampZoom(prev * ZOOM_STEP));
  };

  const handleZoomOut = () => {
    setFitMode(false);
    setZoom(prev => clampZoom(prev / ZOOM_STEP));
  };

  const handleZoomFit = () => {
    const nextFit = computeFitZoom();
    setFitZoom(nextFit);
    setZoom(nextFit);
    setFitMode(true);
  };

  const handleWheelZoom = (event: React.WheelEvent<HTMLDivElement>) => {
    if (!(event.ctrlKey || event.metaKey)) return;
    event.preventDefault();
    const direction = event.deltaY > 0 ? 1 / ZOOM_STEP : ZOOM_STEP;
    setFitMode(false);
    setZoom(prev => clampZoom(prev * direction));
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
    <div
      ref={viewportRef}
      className="relative h-full w-full overflow-auto"
      style={{ position: 'relative' }}
      onWheel={handleWheelZoom}
    >
      <div className="absolute right-4 top-4 z-10 flex items-center gap-1 rounded-md border bg-background/90 p-1 text-xs shadow-sm backdrop-blur">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleZoomOut}
          title="Zoom out"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <div className="min-w-[3.5rem] text-center tabular-nums">
          {Math.round(zoom * 100)}%
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleZoomIn}
          title="Zoom in"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          variant={fitMode ? 'secondary' : 'ghost'}
          size="icon-sm"
          onClick={handleZoomFit}
          title={`Zoom to fit (${Math.round(fitZoom * 100)}%)`}
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>
      <div
        ref={svgContainerRef}
        className="flex items-center justify-center p-8 min-h-full bg-muted/80"
        style={{ position: 'relative' }}
      >
        <div
          ref={canvasFrameRef}
          className="relative inline-block bg-white shadow-[0_0_5px_#0005]"
          style={
            canvasSize
              ? {
                  width: `${canvasSize.width * zoom}px`,
                  height: `${canvasSize.height * zoom}px`,
                }
              : undefined
          }
        >
          <div
            id="canvas-stage"
            ref={svgContentRef}
            className="w-full h-full rounded-[0.15ex] bg-muted/60 shadow-[0_0_4px_#0003]"
          />
          {svgElement && selectedElementId && (
            <BoundingBox 
              key={refreshKey}
              svgElement={svgElement} 
              elementId={selectedElementId}
              containerElement={canvasFrameRef.current ?? svgElement}
              onTransformComplete={() => setRefreshKey(prev => prev + 1)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
