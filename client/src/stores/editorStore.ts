import { create } from 'zustand';
import {
  INITIAL_STYLES,
  INITIAL_KEYFRAMES,
  generateCssString,
  type StyleDefinition,
  type KeyframeDefinition,
} from '@/lib/style-editor/lib';
import { getSvgStyleText, parseCssToStyleDefinitions, updateSvgStyleText } from '@/lib/styleUtils';

export interface SVGElement {
  id: string;
  tagName: string;
  attributes: Record<string, string>;
  children: SVGElement[];
  parentId?: string;
}

export interface EditorState {
  // SVG Document
  svgDocument: string | null;
  svgDOM: SVGElement | null;
  
  // Selection
  selectedElementId: string | null;

  // Styles
  styleDefinitions: StyleDefinition[];
  keyframes: KeyframeDefinition[];
  stylesVersion: number;
  
  // History
  history: string[];
  historyIndex: number;
  
  // Actions
  loadSVG: (svg: string) => void;
  updateSVGDOM: (dom: SVGElement) => void;
  selectElement: (id: string | null) => void;
  updateElementId: (oldId: string, newId: string) => void;
  updateElement: (id: string, updates: Partial<SVGElement>) => void;
  setStyles: (styles: StyleDefinition[]) => void;
  setKeyframes: (keyframes: KeyframeDefinition[]) => void;
  setElementClasses: (id: string, classes: string[]) => void;
  addElementClasses: (id: string, classes: string[]) => void;
  removeElementClasses: (id: string, classes: string[]) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  addToHistory: () => void;
  exportToSchema: () => string;
}

const mergeStyles = (base: StyleDefinition[], extra: StyleDefinition[]) => {
  const byKey = new Map<string, StyleDefinition>();
  const keyFor = (s: StyleDefinition) => s.selectors.slice().sort().join(',');
  base.forEach((style) => {
    byKey.set(keyFor(style), style);
  });
  extra.forEach((style) => {
    byKey.set(keyFor(style), style);
  });
  return Array.from(byKey.values());
};

const getElementClassesFromSvg = (svg: string, id: string): string[] => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svg, 'image/svg+xml');
  const element = doc.querySelector(`#${CSS.escape(id)}`);
  if (!element) return [];
  const classAttr = element.getAttribute('class') || '';
  return classAttr.split(' ').map((c) => c.trim()).filter(Boolean);
};

const updateElementClassesInSvg = (svg: string, id: string, classes: string[]): string => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svg, 'image/svg+xml');
  const element = doc.querySelector(`#${CSS.escape(id)}`);
  if (!element) return svg;
  if (classes.length === 0) {
    element.removeAttribute('class');
  } else {
    element.setAttribute('class', classes.join(' '));
  }
  return new XMLSerializer().serializeToString(doc);
};

export const useEditorStore = create<EditorState>((set, get) => {
  const commitSvg = (svg: string) => {
    set((state) => ({
      svgDocument: svg,
      history: [...state.history.slice(0, state.historyIndex + 1), svg],
      historyIndex: state.historyIndex + 1,
    }));
  };

  const ensureSvgHasStyles = (svg: string) => {
    const cssText = getSvgStyleText(svg);
    if (cssText.trim()) return svg;
    const styles = get().styleDefinitions.length > 0 ? get().styleDefinitions : INITIAL_STYLES;
    const keyframes = get().keyframes.length > 0 ? get().keyframes : INITIAL_KEYFRAMES;
    const css = generateCssString(styles, keyframes);
    return updateSvgStyleText(svg, css);
  };

  const resolveStylesForSvg = (svg: string) => {
    const cssText = getSvgStyleText(svg);
    const parsed = cssText.trim() ? parseCssToStyleDefinitions(cssText) : [];
    if (parsed.length > 0) {
      return mergeStyles(INITIAL_STYLES, parsed);
    }
    return get().styleDefinitions.length > 0 ? get().styleDefinitions : INITIAL_STYLES;
  };

  return {
  svgDocument: null,
  svgDOM: null,
  selectedElementId: null,
  styleDefinitions: INITIAL_STYLES,
  keyframes: INITIAL_KEYFRAMES,
  stylesVersion: 0,
  history: [],
  historyIndex: -1,

  loadSVG: (svg: string) => {
    const styles = resolveStylesForSvg(svg);
    const keyframes = get().keyframes.length > 0 ? get().keyframes : INITIAL_KEYFRAMES;
    const css = generateCssString(styles, keyframes);
    const nextSvg = updateSvgStyleText(svg, css);
    set((state) => ({
      styleDefinitions: styles,
      keyframes,
      stylesVersion: state.stylesVersion + 1,
    }));
    commitSvg(nextSvg);
  },

  updateSVGDOM: (dom: SVGElement) => {
    set({ svgDOM: dom });
  },

  selectElement: (id: string | null) => {
    set({ selectedElementId: id });
  },

  updateElementId: (oldId: string, newId: string) => {
    const { svgDOM } = get();
    if (!svgDOM) return;

    const updateIds = (element: SVGElement): SVGElement => {
      if (element.id === oldId) {
        return { ...element, id: newId };
      }
      return {
        ...element,
        children: element.children.map(updateIds),
      };
    };

    const updatedDOM = updateIds(svgDOM);
    set({ svgDOM: updatedDOM });
  },

  updateElement: (id: string, updates: Partial<SVGElement>) => {
    const { svgDOM } = get();
    if (!svgDOM) return;

    const updateNode = (element: SVGElement): SVGElement => {
      if (element.id === id) {
        return { ...element, ...updates };
      }
      return {
        ...element,
        children: element.children.map(updateNode),
      };
    };

    const updatedDOM = updateNode(svgDOM);
    set({ svgDOM: updatedDOM });
  },

  setStyles: (styles: StyleDefinition[]) => {
    set({ styleDefinitions: styles });
    const svgDocument = get().svgDocument;
    if (!svgDocument) return;
    const keyframes = get().keyframes;
    const css = generateCssString(styles, keyframes);
    const updatedSvg = updateSvgStyleText(svgDocument, css);
    commitSvg(updatedSvg);
  },

  setKeyframes: (keyframes: KeyframeDefinition[]) => {
    set({ keyframes });
    const svgDocument = get().svgDocument;
    if (!svgDocument) return;
    const styles = get().styleDefinitions;
    const css = generateCssString(styles, keyframes);
    const updatedSvg = updateSvgStyleText(svgDocument, css);
    commitSvg(updatedSvg);
  },

  setElementClasses: (id: string, classes: string[]) => {
    const svgDocument = get().svgDocument;
    if (!svgDocument) return;
    const ensured = ensureSvgHasStyles(svgDocument);
    const updatedSvg = updateElementClassesInSvg(ensured, id, classes);
    commitSvg(updatedSvg);
  },

  addElementClasses: (id: string, classes: string[]) => {
    const svgDocument = get().svgDocument;
    if (!svgDocument) return;
    const ensured = ensureSvgHasStyles(svgDocument);
    const current = getElementClassesFromSvg(ensured, id);
    const next = [...current];
    classes.forEach((cls) => {
      if (!next.includes(cls)) next.push(cls);
    });
    const updatedSvg = updateElementClassesInSvg(ensured, id, next);
    commitSvg(updatedSvg);
  },

  removeElementClasses: (id: string, classes: string[]) => {
    const svgDocument = get().svgDocument;
    if (!svgDocument) return;
    const ensured = ensureSvgHasStyles(svgDocument);
    const current = getElementClassesFromSvg(ensured, id);
    const next = current.filter((cls) => !classes.includes(cls));
    const updatedSvg = updateElementClassesInSvg(ensured, id, next);
    commitSvg(updatedSvg);
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const svg = history[newIndex];
      const styles = resolveStylesForSvg(svg);
      set((state) => ({
        svgDocument: svg,
        historyIndex: newIndex,
        styleDefinitions: styles,
        keyframes: state.keyframes.length > 0 ? state.keyframes : INITIAL_KEYFRAMES,
      }));
    }
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const svg = history[newIndex];
      const styles = resolveStylesForSvg(svg);
      set((state) => ({
        svgDocument: svg,
        historyIndex: newIndex,
        styleDefinitions: styles,
        keyframes: state.keyframes.length > 0 ? state.keyframes : INITIAL_KEYFRAMES,
      }));
    }
  },

  canUndo: () => {
    const { historyIndex } = get();
    return historyIndex > 0;
  },

  canRedo: () => {
    const { history, historyIndex } = get();
    return historyIndex < history.length - 1;
  },

  addToHistory: () => {
    const { svgDocument, history, historyIndex } = get();
    if (svgDocument) {
      set({
        history: [...history.slice(0, historyIndex + 1), svgDocument],
        historyIndex: historyIndex + 1,
      });
    }
  },

  exportToSchema: () => {
    const { svgDocument } = get();
    return svgDocument || '';
  },
  };
});
