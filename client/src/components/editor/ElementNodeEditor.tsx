/**
 * Element Node Editor
 * Renders isolated element with draggable nodes (anchors/controls).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, MouseEvent as ReactMouseEvent } from 'react';
import { MinusCircle, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEditorStore } from '@/stores/editorStore';
import { generateCssString, updateDynamicStyles } from '@/lib/style-editor/lib';

type Point = { x: number; y: number };

type PathSegment =
  | { type: 'M' | 'L'; x: number; y: number }
  | { type: 'C'; x1: number; y1: number; x2: number; y2: number; x: number; y: number }
  | { type: 'Q'; x1: number; y1: number; x: number; y: number }
  | { type: 'A'; rx: number; ry: number; xAxisRotation: number; largeArcFlag: number; sweepFlag: number; x: number; y: number }
  | { type: 'Z' };

type Draft =
  | { tag: 'path'; attrs: Record<string, string>; segments: PathSegment[] }
  | { tag: 'polyline' | 'polygon'; attrs: Record<string, string>; points: Point[] }
  | { tag: 'line'; attrs: Record<string, string>; x1: number; y1: number; x2: number; y2: number }
  | { tag: 'rect'; attrs: Record<string, string>; x: number; y: number; width: number; height: number; rx?: number; ry?: number }
  | { tag: 'circle'; attrs: Record<string, string>; cx: number; cy: number; r: number }
  | { tag: 'ellipse'; attrs: Record<string, string>; cx: number; cy: number; rx: number; ry: number }
  | { tag: 'other'; attrs: Record<string, string>; outerHTML: string };

type Handle = {
  id: string;
  kind: 'anchor' | 'control' | 'center' | 'radius' | 'corner';
  x: number;
  y: number;
  segmentIndex?: number;
  controlIndex?: 1 | 2;
  pointIndex?: number;
  corner?: 'nw' | 'ne' | 'se' | 'sw';
};

const NUMBER_REGEX = /-?\d*\.?\d+(?:e[-+]?\d+)?/gi;

const formatNumber = (value: number) => {
  if (!Number.isFinite(value)) return '0';
  const rounded = Math.round(value * 1000) / 1000;
  return `${Object.is(rounded, -0) ? 0 : rounded}`;
};

const parseNumbers = (input: string) => {
  const matches = input.match(NUMBER_REGEX);
  return matches ? matches.map((value) => Number(value)) : [];
};

const parsePoints = (input: string): Point[] => {
  const numbers = parseNumbers(input);
  const points: Point[] = [];
  for (let i = 0; i + 1 < numbers.length; i += 2) {
    points.push({ x: numbers[i], y: numbers[i + 1] });
  }
  return points;
};

const serializePoints = (points: Point[]) =>
  points.map((p) => `${formatNumber(p.x)},${formatNumber(p.y)}`).join(' ');

const parsePath = (d: string): PathSegment[] => {
  const segments: PathSegment[] = [];
  const commandRegex = /([a-zA-Z])([^a-zA-Z]*)/g;
  let match: RegExpExecArray | null;
  let currentX = 0;
  let currentY = 0;
  let startX = 0;
  let startY = 0;
  let lastControlX: number | null = null;
  let lastControlY: number | null = null;
  let lastCommand = '';

  while ((match = commandRegex.exec(d)) !== null) {
    const command = match[1];
    const upper = command.toUpperCase();
    const isRelative = command === command.toLowerCase();
    const values = parseNumbers(match[2] ?? '');

    const nextPoint = (x: number, y: number) => {
      currentX = x;
      currentY = y;
    };

    let index = 0;
    switch (upper) {
      case 'M': {
        while (index + 1 < values.length) {
          let x = values[index];
          let y = values[index + 1];
          if (isRelative) {
            x += currentX;
            y += currentY;
          }
          if (segments.length === 0) {
            segments.push({ type: 'M', x, y });
            startX = x;
            startY = y;
          } else {
            segments.push({ type: 'L', x, y });
          }
          nextPoint(x, y);
          index += 2;
        }
        lastControlX = null;
        lastControlY = null;
        lastCommand = 'M';
        break;
      }
      case 'L': {
        while (index + 1 < values.length) {
          let x = values[index];
          let y = values[index + 1];
          if (isRelative) {
            x += currentX;
            y += currentY;
          }
          segments.push({ type: 'L', x, y });
          nextPoint(x, y);
          index += 2;
        }
        lastControlX = null;
        lastControlY = null;
        lastCommand = 'L';
        break;
      }
      case 'H': {
        while (index < values.length) {
          let x = values[index];
          if (isRelative) x += currentX;
          segments.push({ type: 'L', x, y: currentY });
          nextPoint(x, currentY);
          index += 1;
        }
        lastControlX = null;
        lastControlY = null;
        lastCommand = 'H';
        break;
      }
      case 'V': {
        while (index < values.length) {
          let y = values[index];
          if (isRelative) y += currentY;
          segments.push({ type: 'L', x: currentX, y });
          nextPoint(currentX, y);
          index += 1;
        }
        lastControlX = null;
        lastControlY = null;
        lastCommand = 'V';
        break;
      }
      case 'C': {
        while (index + 5 < values.length) {
          let x1 = values[index];
          let y1 = values[index + 1];
          let x2 = values[index + 2];
          let y2 = values[index + 3];
          let x = values[index + 4];
          let y = values[index + 5];
          if (isRelative) {
            x1 += currentX;
            y1 += currentY;
            x2 += currentX;
            y2 += currentY;
            x += currentX;
            y += currentY;
          }
          segments.push({ type: 'C', x1, y1, x2, y2, x, y });
          nextPoint(x, y);
          lastControlX = x2;
          lastControlY = y2;
          index += 6;
        }
        lastCommand = 'C';
        break;
      }
      case 'S': {
        while (index + 3 < values.length) {
          let x2 = values[index];
          let y2 = values[index + 1];
          let x = values[index + 2];
          let y = values[index + 3];
          if (isRelative) {
            x2 += currentX;
            y2 += currentY;
            x += currentX;
            y += currentY;
          }
          let x1 = currentX;
          let y1 = currentY;
          if (lastCommand === 'C' || lastCommand === 'S') {
            if (lastControlX !== null && lastControlY !== null) {
              x1 = 2 * currentX - lastControlX;
              y1 = 2 * currentY - lastControlY;
            }
          }
          segments.push({ type: 'C', x1, y1, x2, y2, x, y });
          nextPoint(x, y);
          lastControlX = x2;
          lastControlY = y2;
          index += 4;
        }
        lastCommand = 'S';
        break;
      }
      case 'Q': {
        while (index + 3 < values.length) {
          let x1 = values[index];
          let y1 = values[index + 1];
          let x = values[index + 2];
          let y = values[index + 3];
          if (isRelative) {
            x1 += currentX;
            y1 += currentY;
            x += currentX;
            y += currentY;
          }
          segments.push({ type: 'Q', x1, y1, x, y });
          nextPoint(x, y);
          lastControlX = x1;
          lastControlY = y1;
          index += 4;
        }
        lastCommand = 'Q';
        break;
      }
      case 'T': {
        while (index + 1 < values.length) {
          let x = values[index];
          let y = values[index + 1];
          if (isRelative) {
            x += currentX;
            y += currentY;
          }
          let x1 = currentX;
          let y1 = currentY;
          if (lastCommand === 'Q' || lastCommand === 'T') {
            if (lastControlX !== null && lastControlY !== null) {
              x1 = 2 * currentX - lastControlX;
              y1 = 2 * currentY - lastControlY;
            }
          }
          segments.push({ type: 'Q', x1, y1, x, y });
          nextPoint(x, y);
          lastControlX = x1;
          lastControlY = y1;
          index += 2;
        }
        lastCommand = 'T';
        break;
      }
      case 'A': {
        while (index + 6 < values.length) {
          let rx = values[index];
          let ry = values[index + 1];
          const xAxisRotation = values[index + 2];
          const largeArcFlag = values[index + 3];
          const sweepFlag = values[index + 4];
          let x = values[index + 5];
          let y = values[index + 6];
          if (isRelative) {
            x += currentX;
            y += currentY;
          }
          segments.push({
            type: 'A',
            rx: Math.abs(rx),
            ry: Math.abs(ry),
            xAxisRotation,
            largeArcFlag: Math.round(largeArcFlag),
            sweepFlag: Math.round(sweepFlag),
            x,
            y,
          });
          nextPoint(x, y);
          lastControlX = null;
          lastControlY = null;
          index += 7;
        }
        lastCommand = 'A';
        break;
      }
      case 'Z': {
        segments.push({ type: 'Z' });
        currentX = startX;
        currentY = startY;
        lastControlX = null;
        lastControlY = null;
        lastCommand = 'Z';
        break;
      }
      default:
        break;
    }
  }

  return segments;
};

const serializePath = (segments: PathSegment[]) => {
  const parts: string[] = [];
  segments.forEach((segment) => {
    switch (segment.type) {
      case 'M':
      case 'L':
        parts.push(`${segment.type}${formatNumber(segment.x)} ${formatNumber(segment.y)}`);
        break;
      case 'C':
        parts.push(
          `C${formatNumber(segment.x1)} ${formatNumber(segment.y1)} ${formatNumber(segment.x2)} ${formatNumber(segment.y2)} ${formatNumber(segment.x)} ${formatNumber(segment.y)}`
        );
        break;
      case 'Q':
        parts.push(
          `Q${formatNumber(segment.x1)} ${formatNumber(segment.y1)} ${formatNumber(segment.x)} ${formatNumber(segment.y)}`
        );
        break;
      case 'A':
        parts.push(
          `A${formatNumber(segment.rx)} ${formatNumber(segment.ry)} ${formatNumber(segment.xAxisRotation)} ${segment.largeArcFlag} ${segment.sweepFlag} ${formatNumber(segment.x)} ${formatNumber(segment.y)}`
        );
        break;
      case 'Z':
        parts.push('Z');
        break;
      default:
        break;
    }
  });
  return parts.join(' ');
};

const computeBBoxFromPoints = (points: Point[]) => {
  if (points.length === 0) return { x: 0, y: 0, width: 1, height: 1 };
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return { x: minX, y: minY, width: maxX - minX || 1, height: maxY - minY || 1 };
};

const distanceToSegment = (p: Point, a: Point, b: Point) => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (dx === 0 && dy === 0) {
    return { dist: Math.hypot(p.x - a.x, p.y - a.y), t: 0 };
  }
  const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy);
  const clamped = Math.max(0, Math.min(1, t));
  const projX = a.x + clamped * dx;
  const projY = a.y + clamped * dy;
  return { dist: Math.hypot(p.x - projX, p.y - projY), t: clamped };
};

const buildDraftFromElement = (
  element: Element,
  styleDefinitions: { selectors: string[]; rules: { property: string; value: string }[] }[]
): Draft => {
  const tag = element.tagName.toLowerCase();
  const attrs: Record<string, string> = {};
  Array.from(element.attributes).forEach((attr) => {
    attrs[attr.name] = attr.value;
  });

  const classNames: string[] = [];
  const ancestry: Element[] = [];
  let current: Element | null = element;
  while (current) {
    ancestry.push(current);
    current = current.parentElement;
  }
  ancestry.reverse().forEach((node) => {
    const classAttr = node.getAttribute('class') || '';
    classAttr
      .split(' ')
      .map((c) => c.trim())
      .filter(Boolean)
      .forEach((cls) => classNames.push(cls));
  });

  if (classNames.length > 0 && styleDefinitions.length > 0) {
    const styleMap = new Map<string, string>();
    styleDefinitions.forEach((style) => {
      const matches = style.selectors.some((selector) => {
        if (!selector.startsWith('.')) return false;
        const cls = selector.replace('.', '');
        return classNames.includes(cls);
      });
      if (!matches) return;
      style.rules.forEach((rule) => {
        styleMap.set(rule.property, rule.value);
      });
    });
    const inlineStyle = Array.from(styleMap.entries())
      .map(([property, value]) => `${property}: ${value}`)
      .join('; ');
    if (inlineStyle) {
      const existing = attrs.style ? `${attrs.style}; ` : '';
      attrs.style = `${inlineStyle}${existing}`.trim();
    }
  }

  const number = (value: string | null, fallback = 0) =>
    value !== null && value !== undefined && value !== '' ? Number(value) : fallback;

  if (tag === 'path') {
    const d = element.getAttribute('d') || '';
    return { tag: 'path', attrs, segments: parsePath(d) };
  }

  if (tag === 'polyline' || tag === 'polygon') {
    const points = parsePoints(element.getAttribute('points') || '');
    return { tag: tag as 'polyline' | 'polygon', attrs, points };
  }

  if (tag === 'line') {
    return {
      tag: 'line',
      attrs,
      x1: number(element.getAttribute('x1')),
      y1: number(element.getAttribute('y1')),
      x2: number(element.getAttribute('x2')),
      y2: number(element.getAttribute('y2')),
    };
  }

  if (tag === 'rect') {
    return {
      tag: 'rect',
      attrs,
      x: number(element.getAttribute('x')),
      y: number(element.getAttribute('y')),
      width: number(element.getAttribute('width')),
      height: number(element.getAttribute('height')),
      rx: element.getAttribute('rx') ? number(element.getAttribute('rx')) : undefined,
      ry: element.getAttribute('ry') ? number(element.getAttribute('ry')) : undefined,
    };
  }

  if (tag === 'circle') {
    return {
      tag: 'circle',
      attrs,
      cx: number(element.getAttribute('cx')),
      cy: number(element.getAttribute('cy')),
      r: number(element.getAttribute('r')),
    };
  }

  if (tag === 'ellipse') {
    return {
      tag: 'ellipse',
      attrs,
      cx: number(element.getAttribute('cx')),
      cy: number(element.getAttribute('cy')),
      rx: number(element.getAttribute('rx')),
      ry: number(element.getAttribute('ry')),
    };
  }

  return { tag: 'other', attrs, outerHTML: element.outerHTML };
};

const buildElementMarkup = (draft: Draft) => {
  const attrs: Record<string, string> = { ...draft.attrs };
  const tag = draft.tag;

  const setAttr = (key: string, value: string | number | undefined) => {
    if (value === undefined) return;
    attrs[key] = typeof value === 'number' ? formatNumber(value) : value;
  };

  switch (draft.tag) {
    case 'path':
      setAttr('d', serializePath(draft.segments));
      break;
    case 'polyline':
    case 'polygon':
      setAttr('points', serializePoints(draft.points));
      break;
    case 'line':
      setAttr('x1', draft.x1);
      setAttr('y1', draft.y1);
      setAttr('x2', draft.x2);
      setAttr('y2', draft.y2);
      break;
    case 'rect':
      setAttr('x', draft.x);
      setAttr('y', draft.y);
      setAttr('width', draft.width);
      setAttr('height', draft.height);
      if (draft.rx !== undefined) setAttr('rx', draft.rx);
      if (draft.ry !== undefined) setAttr('ry', draft.ry);
      break;
    case 'circle':
      setAttr('cx', draft.cx);
      setAttr('cy', draft.cy);
      setAttr('r', draft.r);
      break;
    case 'ellipse':
      setAttr('cx', draft.cx);
      setAttr('cy', draft.cy);
      setAttr('rx', draft.rx);
      setAttr('ry', draft.ry);
      break;
    case 'other':
      return draft.outerHTML;
    default:
      break;
  }

  const attrString = Object.entries(attrs)
    .map(([key, value]) => `${key}="${value}"`)
    .join(' ');

  return `<${tag} ${attrString} />`;
};

const getHandlesForDraft = (draft: Draft): { handles: Handle[]; controlLines: { from: Point; to: Point }[] } => {
  const handles: Handle[] = [];
  const controlLines: { from: Point; to: Point }[] = [];

  switch (draft.tag) {
    case 'line': {
      handles.push({ id: 'line-0', kind: 'anchor', x: draft.x1, y: draft.y1, pointIndex: 0 });
      handles.push({ id: 'line-1', kind: 'anchor', x: draft.x2, y: draft.y2, pointIndex: 1 });
      break;
    }
    case 'polyline':
    case 'polygon': {
      draft.points.forEach((point, index) => {
        handles.push({ id: `pt-${index}`, kind: 'anchor', x: point.x, y: point.y, pointIndex: index });
      });
      break;
    }
    case 'rect': {
      handles.push({ id: 'nw', kind: 'corner', x: draft.x, y: draft.y, corner: 'nw' });
      handles.push({
        id: 'ne',
        kind: 'corner',
        x: draft.x + draft.width,
        y: draft.y,
        corner: 'ne',
      });
      handles.push({
        id: 'se',
        kind: 'corner',
        x: draft.x + draft.width,
        y: draft.y + draft.height,
        corner: 'se',
      });
      handles.push({
        id: 'sw',
        kind: 'corner',
        x: draft.x,
        y: draft.y + draft.height,
        corner: 'sw',
      });
      break;
    }
    case 'circle': {
      handles.push({ id: 'center', kind: 'center', x: draft.cx, y: draft.cy });
      handles.push({ id: 'radius', kind: 'radius', x: draft.cx + draft.r, y: draft.cy });
      break;
    }
    case 'ellipse': {
      handles.push({ id: 'center', kind: 'center', x: draft.cx, y: draft.cy });
      handles.push({ id: 'rx', kind: 'radius', x: draft.cx + draft.rx, y: draft.cy });
      handles.push({ id: 'ry', kind: 'radius', x: draft.cx, y: draft.cy - draft.ry });
      break;
    }
    case 'path': {
      let current: Point | null = null;
      let start: Point | null = null;
      draft.segments.forEach((segment, index) => {
        if (segment.type === 'M') {
          current = { x: segment.x, y: segment.y };
          start = { x: segment.x, y: segment.y };
          handles.push({
            id: `a-${index}`,
            kind: 'anchor',
            x: segment.x,
            y: segment.y,
            segmentIndex: index,
          });
          return;
        }
        if (segment.type === 'Z') {
          current = start;
          return;
        }

        if (segment.type === 'C') {
          controlLines.push({ from: current ?? { x: segment.x1, y: segment.y1 }, to: { x: segment.x1, y: segment.y1 } });
          controlLines.push({ from: { x: segment.x, y: segment.y }, to: { x: segment.x2, y: segment.y2 } });
          handles.push({
            id: `c1-${index}`,
            kind: 'control',
            x: segment.x1,
            y: segment.y1,
            segmentIndex: index,
            controlIndex: 1,
          });
          handles.push({
            id: `c2-${index}`,
            kind: 'control',
            x: segment.x2,
            y: segment.y2,
            segmentIndex: index,
            controlIndex: 2,
          });
        }
        if (segment.type === 'Q') {
          controlLines.push({ from: current ?? { x: segment.x1, y: segment.y1 }, to: { x: segment.x1, y: segment.y1 } });
          handles.push({
            id: `c1-${index}`,
            kind: 'control',
            x: segment.x1,
            y: segment.y1,
            segmentIndex: index,
            controlIndex: 1,
          });
        }

        if ('x' in segment && 'y' in segment) {
          handles.push({
            id: `a-${index}`,
            kind: 'anchor',
            x: segment.x,
            y: segment.y,
            segmentIndex: index,
          });
          current = { x: segment.x, y: segment.y };
        }
      });
      break;
    }
    default:
      break;
  }

  return { handles, controlLines };
};

const computeDraftBBox = (draft: Draft) => {
  switch (draft.tag) {
    case 'line':
      return computeBBoxFromPoints([
        { x: draft.x1, y: draft.y1 },
        { x: draft.x2, y: draft.y2 },
      ]);
    case 'polyline':
    case 'polygon':
      return computeBBoxFromPoints(draft.points);
    case 'rect':
      return { x: draft.x, y: draft.y, width: draft.width || 1, height: draft.height || 1 };
    case 'circle':
      return {
        x: draft.cx - draft.r,
        y: draft.cy - draft.r,
        width: draft.r * 2 || 1,
        height: draft.r * 2 || 1,
      };
    case 'ellipse':
      return {
        x: draft.cx - draft.rx,
        y: draft.cy - draft.ry,
        width: draft.rx * 2 || 1,
        height: draft.ry * 2 || 1,
      };
    case 'path': {
      const points: Point[] = [];
      draft.segments.forEach((segment) => {
        if (segment.type === 'M' || segment.type === 'L') {
          points.push({ x: segment.x, y: segment.y });
        } else if (segment.type === 'C') {
          points.push({ x: segment.x1, y: segment.y1 });
          points.push({ x: segment.x2, y: segment.y2 });
          points.push({ x: segment.x, y: segment.y });
        } else if (segment.type === 'Q') {
          points.push({ x: segment.x1, y: segment.y1 });
          points.push({ x: segment.x, y: segment.y });
        } else if (segment.type === 'A') {
          points.push({ x: segment.x, y: segment.y });
        }
      });
      return computeBBoxFromPoints(points);
    }
    default:
      return { x: 0, y: 0, width: 1, height: 1 };
  }
};

export default function ElementNodeEditor() {
  const {
    svgDocument,
    selectedElementId,
    updateElementAttributes,
    styleDefinitions,
    keyframes,
  } = useEditorStore();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [mode, setMode] = useState<'select' | 'add' | 'remove'>('select');
  const [activeHandleId, setActiveHandleId] = useState<string | null>(null);
  const [lockedViewBox, setLockedViewBox] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!document.getElementById('dynamic-svg-styles')) {
      const styleTag = document.createElement('style');
      styleTag.id = 'dynamic-svg-styles';
      document.head.appendChild(styleTag);
    }
    updateDynamicStyles(styleDefinitions, keyframes);
  }, [styleDefinitions, keyframes]);

  useEffect(() => {
    if (!svgDocument || !selectedElementId) {
      setDraft(null);
      return;
    }
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgDocument, 'image/svg+xml');
    const element = doc.querySelector(`#${CSS.escape(selectedElementId)}`);
    if (!element) {
      setDraft(null);
      return;
    }
    setDraft(buildDraftFromElement(element, styleDefinitions));
  }, [svgDocument, selectedElementId, styleDefinitions]);

  const editorData = useMemo(() => {
    if (!draft) return null;
    const bbox = computeDraftBBox(draft);
    const padding = Math.max(bbox.width, bbox.height) * 0.15 + 6;
    const computedViewBox = {
      x: bbox.x - padding,
      y: bbox.y - padding,
      width: bbox.width + padding * 2 || 1,
      height: bbox.height + padding * 2 || 1,
    };
    const markup = buildElementMarkup(draft);
    const { handles, controlLines } = getHandlesForDraft(draft);
    const viewBox = activeHandleId && lockedViewBox ? lockedViewBox : computedViewBox;
    return { viewBox, markup, handles, controlLines };
  }, [draft, activeHandleId, lockedViewBox]);

  const getSvgPoint = (event: ReactPointerEvent | ReactMouseEvent) => {
    const svg = svgRef.current;
    if (!svg || !editorData) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    return {
      x: editorData.viewBox.x + (x / rect.width) * editorData.viewBox.width,
      y: editorData.viewBox.y + (y / rect.height) * editorData.viewBox.height,
    };
  };

  const commitDraft = (nextDraft: Draft) => {
    setDraft(nextDraft);
    if (!selectedElementId) return;

    switch (nextDraft.tag) {
      case 'path':
        updateElementAttributes(selectedElementId, {
          d: serializePath(nextDraft.segments),
        });
        break;
      case 'polyline':
      case 'polygon':
        updateElementAttributes(selectedElementId, {
          points: serializePoints(nextDraft.points),
        });
        break;
      case 'line':
        updateElementAttributes(selectedElementId, {
          x1: formatNumber(nextDraft.x1),
          y1: formatNumber(nextDraft.y1),
          x2: formatNumber(nextDraft.x2),
          y2: formatNumber(nextDraft.y2),
        });
        break;
      case 'rect':
        updateElementAttributes(selectedElementId, {
          x: formatNumber(nextDraft.x),
          y: formatNumber(nextDraft.y),
          width: formatNumber(nextDraft.width),
          height: formatNumber(nextDraft.height),
          rx: nextDraft.rx !== undefined ? formatNumber(nextDraft.rx) : null,
          ry: nextDraft.ry !== undefined ? formatNumber(nextDraft.ry) : null,
        });
        break;
      case 'circle':
        updateElementAttributes(selectedElementId, {
          cx: formatNumber(nextDraft.cx),
          cy: formatNumber(nextDraft.cy),
          r: formatNumber(nextDraft.r),
        });
        break;
      case 'ellipse':
        updateElementAttributes(selectedElementId, {
          cx: formatNumber(nextDraft.cx),
          cy: formatNumber(nextDraft.cy),
          rx: formatNumber(nextDraft.rx),
          ry: formatNumber(nextDraft.ry),
        });
        break;
      default:
        break;
    }
  };

  const handlePointerMove = (event: ReactPointerEvent) => {
    if (!draft || !activeHandleId) return;
    const point = getSvgPoint(event);

    if (draft.tag === 'line') {
      const next = { ...draft };
      if (activeHandleId === 'line-0') {
        next.x1 = point.x;
        next.y1 = point.y;
      } else if (activeHandleId === 'line-1') {
        next.x2 = point.x;
        next.y2 = point.y;
      }
      setDraft(next);
      return;
    }

    if (draft.tag === 'polyline' || draft.tag === 'polygon') {
      const index = Number(activeHandleId.replace('pt-', ''));
      const points = draft.points.map((p, i) => (i === index ? { x: point.x, y: point.y } : p));
      setDraft({ ...draft, points });
      return;
    }

    if (draft.tag === 'rect') {
      const minSize = 1;
      const { x, y, width, height } = draft;
      const right = x + width;
      const bottom = y + height;
      let nx = x;
      let ny = y;
      let nright = right;
      let nbottom = bottom;
      switch (activeHandleId) {
        case 'nw':
          nx = point.x;
          ny = point.y;
          break;
        case 'ne':
          nright = point.x;
          ny = point.y;
          break;
        case 'se':
          nright = point.x;
          nbottom = point.y;
          break;
        case 'sw':
          nx = point.x;
          nbottom = point.y;
          break;
        default:
          break;
      }
      const nextWidth = Math.max(minSize, nright - nx);
      const nextHeight = Math.max(minSize, nbottom - ny);
      const nextDraft = {
        ...draft,
        x: nx,
        y: ny,
        width: nextWidth,
        height: nextHeight,
      };
      setDraft(nextDraft);
      return;
    }

    if (draft.tag === 'circle') {
      if (activeHandleId === 'center') {
        setDraft({ ...draft, cx: point.x, cy: point.y });
      } else if (activeHandleId === 'radius') {
        const r = Math.max(1, Math.hypot(point.x - draft.cx, point.y - draft.cy));
        setDraft({ ...draft, r });
      }
      return;
    }

    if (draft.tag === 'ellipse') {
      if (activeHandleId === 'center') {
        setDraft({ ...draft, cx: point.x, cy: point.y });
      } else if (activeHandleId === 'rx') {
        const rx = Math.max(1, Math.abs(point.x - draft.cx));
        setDraft({ ...draft, rx });
      } else if (activeHandleId === 'ry') {
        const ry = Math.max(1, Math.abs(point.y - draft.cy));
        setDraft({ ...draft, ry });
      }
      return;
    }

    if (draft.tag === 'path') {
      const nextSegments = draft.segments.map((segment) => ({ ...segment })) as PathSegment[];
      if (activeHandleId.startsWith('a-')) {
        const index = Number(activeHandleId.replace('a-', ''));
        const segment = nextSegments[index];
        if (segment && segment.type !== 'Z') {
          if (segment.type === 'M' || segment.type === 'L') {
            segment.x = point.x;
            segment.y = point.y;
          } else if (segment.type === 'C') {
            segment.x = point.x;
            segment.y = point.y;
          } else if (segment.type === 'Q') {
            segment.x = point.x;
            segment.y = point.y;
          } else if (segment.type === 'A') {
            segment.x = point.x;
            segment.y = point.y;
          }
        }
      } else if (activeHandleId.startsWith('c1-')) {
        const index = Number(activeHandleId.replace('c1-', ''));
        const segment = nextSegments[index];
        if (segment && segment.type === 'C') {
          segment.x1 = point.x;
          segment.y1 = point.y;
        } else if (segment && segment.type === 'Q') {
          segment.x1 = point.x;
          segment.y1 = point.y;
        }
      } else if (activeHandleId.startsWith('c2-')) {
        const index = Number(activeHandleId.replace('c2-', ''));
        const segment = nextSegments[index];
        if (segment && segment.type === 'C') {
          segment.x2 = point.x;
          segment.y2 = point.y;
        }
      }
      setDraft({ ...draft, segments: nextSegments });
    }
  };

  const handlePointerUp = () => {
    if (!draft) return;
    if (activeHandleId) {
      commitDraft(draft);
    }
    setActiveHandleId(null);
    setLockedViewBox(null);
  };

  const handleHandlePointerDown = (handleId: string, event: ReactPointerEvent) => {
    event.stopPropagation();
    if (editorData) {
      setLockedViewBox(editorData.viewBox);
    }
    setActiveHandleId(handleId);
  };

  const addNodeAtPoint = (point: Point) => {
    if (!draft) return;
    if (draft.tag === 'polyline' || draft.tag === 'polygon') {
      if (draft.points.length < 2) return;
      let bestIndex = draft.points.length - 1;
      let bestDist = Infinity;
      for (let i = 0; i < draft.points.length - 1; i += 1) {
        const a = draft.points[i];
        const b = draft.points[i + 1];
        const dist = distanceToSegment(point, a, b).dist;
        if (dist < bestDist) {
          bestDist = dist;
          bestIndex = i;
        }
      }
      if (draft.tag === 'polygon' && draft.points.length > 2) {
        const a = draft.points[draft.points.length - 1];
        const b = draft.points[0];
        const dist = distanceToSegment(point, a, b).dist;
        if (dist < bestDist) {
          bestIndex = draft.points.length - 1;
        }
      }
      const nextPoints = [...draft.points];
      nextPoints.splice(bestIndex + 1, 0, point);
      const nextDraft = { ...draft, points: nextPoints };
      commitDraft(nextDraft);
      return;
    }

    if (draft.tag === 'path') {
      const segments = [...draft.segments];
      const anchors: { index: number; point: Point }[] = [];
      segments.forEach((segment, index) => {
        if (segment.type === 'M' || segment.type === 'L') {
          anchors.push({ index, point: { x: segment.x, y: segment.y } });
        } else if (segment.type === 'C' || segment.type === 'Q' || segment.type === 'A') {
          anchors.push({ index, point: { x: segment.x, y: segment.y } });
        }
      });
      if (anchors.length < 1) return;
      let bestIndex = anchors.length - 1;
      let bestDist = Infinity;
      for (let i = 0; i < anchors.length - 1; i += 1) {
        const dist = distanceToSegment(point, anchors[i].point, anchors[i + 1].point).dist;
        if (dist < bestDist) {
          bestDist = dist;
          bestIndex = i;
        }
      }
      const insertAfterSegmentIndex = anchors[bestIndex]?.index ?? segments.length - 1;
      segments.splice(insertAfterSegmentIndex + 1, 0, { type: 'L', x: point.x, y: point.y });
      const nextDraft: Draft = { ...draft, segments };
      commitDraft(nextDraft);
    }
  };

  const removeSelectedHandle = (handleId: string) => {
    if (!draft) return;
    if (draft.tag === 'polyline' || draft.tag === 'polygon') {
      const index = Number(handleId.replace('pt-', ''));
      const minPoints = draft.tag === 'polygon' ? 3 : 2;
      if (draft.points.length <= minPoints) return;
      const nextPoints = draft.points.filter((_, i) => i !== index);
      commitDraft({ ...draft, points: nextPoints });
      return;
    }

    if (draft.tag === 'path') {
      if (!handleId.startsWith('a-')) return;
      const index = Number(handleId.replace('a-', ''));
      const segment = draft.segments[index];
      if (!segment || segment.type === 'M') return;
      const nextSegments = draft.segments.filter((_, i) => i !== index);
      commitDraft({ ...draft, segments: nextSegments });
      return;
    }
  };

  const handleSvgClick = (event: React.MouseEvent) => {
    if (!draft || !editorData) return;
    if (mode === 'add') {
      const point = getSvgPoint(event as ReactPointerEvent);
      addNodeAtPoint(point);
      setMode('select');
    }
  };

  if (!draft || !selectedElementId || !editorData) {
    return null;
  }

  const css = generateCssString(styleDefinitions, keyframes);
  const isAddEnabled = draft.tag === 'polyline' || draft.tag === 'polygon' || draft.tag === 'path';
  const isRemoveEnabled = isAddEnabled;

  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold">Nodos</span>
        <div className="flex items-center gap-1">
          <Button
            variant={mode === 'add' ? 'secondary' : 'ghost'}
            size="icon-sm"
            disabled={!isAddEnabled}
            onClick={() => setMode(mode === 'add' ? 'select' : 'add')}
            title="Agregar nodo"
          >
            <PlusCircle className="h-4 w-4" />
          </Button>
          <Button
            variant={mode === 'remove' ? 'secondary' : 'ghost'}
            size="icon-sm"
            disabled={!isRemoveEnabled}
            onClick={() => setMode(mode === 'remove' ? 'select' : 'remove')}
            title="Eliminar nodo"
          >
            <MinusCircle className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="relative h-52 rounded-md bg-muted/40">
        <svg
          ref={svgRef}
          className="absolute inset-0 h-full w-full"
          viewBox={`${editorData.viewBox.x} ${editorData.viewBox.y} ${editorData.viewBox.width} ${editorData.viewBox.height}`}
          preserveAspectRatio="xMidYMid meet"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onClick={handleSvgClick}
        >
          {css ? <style>{css}</style> : null}
          <g dangerouslySetInnerHTML={{ __html: editorData.markup }} />
          {editorData.controlLines.map((line, index) => (
            <line
              key={`line-${index}`}
              x1={line.from.x}
              y1={line.from.y}
              x2={line.to.x}
              y2={line.to.y}
              stroke="rgba(59,130,246,0.4)"
              strokeWidth={0.6}
            />
          ))}
          {editorData.handles.map((handle) => {
            const isControl = handle.kind === 'control';
            const fill = isControl ? '#60a5fa' : '#f97316';
            const stroke = '#0f172a';
            return (
              <circle
                key={handle.id}
                cx={handle.x}
                cy={handle.y}
                r={isControl ? 1.6 : 2.2}
                fill={fill}
                stroke={stroke}
                strokeWidth={0.4}
                onPointerDown={(event) => {
                  if (mode === 'remove' && handle.kind === 'anchor') {
                    event.stopPropagation();
                    removeSelectedHandle(handle.id);
                    setMode('select');
                    return;
                  }
                  handleHandlePointerDown(handle.id, event);
                }}
                style={{ cursor: mode === 'remove' && handle.kind === 'anchor' ? 'not-allowed' : 'pointer' }}
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
}
