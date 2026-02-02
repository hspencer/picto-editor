import { create } from 'zustand';

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
  
  // History
  history: string[];
  historyIndex: number;
  
  // Actions
  loadSVG: (svg: string) => void;
  updateSVGDOM: (dom: SVGElement) => void;
  selectElement: (id: string | null) => void;
  updateElementId: (oldId: string, newId: string) => void;
  updateElement: (id: string, updates: Partial<SVGElement>) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  addToHistory: () => void;
  exportToSchema: () => string;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  svgDocument: null,
  svgDOM: null,
  selectedElementId: null,
  history: [],
  historyIndex: -1,

  loadSVG: (svg: string) => {
    set((state) => ({
      svgDocument: svg,
      history: [...state.history.slice(0, state.historyIndex + 1), svg],
      historyIndex: state.historyIndex + 1,
    }));
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

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      set({
        svgDocument: history[newIndex],
        historyIndex: newIndex,
      });
    }
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      set({
        svgDocument: history[newIndex],
        historyIndex: newIndex,
      });
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
}));
