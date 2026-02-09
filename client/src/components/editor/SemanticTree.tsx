/**
 * Semantic Tree Component
 * Displays SVG DOM as expandable/collapsible tree with editable IDs
 */

import { useEditorStore } from '@/stores/editorStore';
import { useMemo, useState, useCallback } from 'react';
import { ChevronRight, ChevronDown, Edit2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { SVGElement } from '@/stores/editorStore';
import StylePickerModal from './StylePickerModal';

interface TreeNodeProps {
  node: SVGElement;
  level: number;
  getStyleInfo: (node: SVGElement) => { color: string | null; classes: string[] };
  onStyleClick: (id: string) => void;
}

const SKIP_TAGS = new Set(['defs', 'metadata', 'title', 'desc', 'style']);

const buildVisualGroupTree = (node: SVGElement): SVGElement[] => {
  const tag = node.tagName.toLowerCase();
  if (SKIP_TAGS.has(tag)) return [];
  const childGroups = node.children.flatMap((child) => buildVisualGroupTree(child));

  if (tag === 'g') {
    return [{ ...node, children: childGroups }];
  }

  return childGroups;
};

function TreeNode({ node, level, getStyleInfo, onStyleClick }: TreeNodeProps) {
  const { selectedElementId, selectElement, updateElementId } = useEditorStore();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditingId, setIsEditingId] = useState(false);
  const [editedId, setEditedId] = useState(node.id);
  const styleInfo = getStyleInfo(node);

  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedElementId === node.id;

  const handleSaveId = () => {
    if (editedId && editedId !== node.id) {
      updateElementId(node.id, editedId);
    }
    setIsEditingId(false);
  };

  const handleCancelEdit = () => {
    setEditedId(node.id);
    setIsEditingId(false);
  };

  return (
    <div className="select-none">
      <div
        className={`group flex items-center gap-2 px-3 py-2 hover:bg-accent/50 cursor-pointer transition-colors ${
          isSelected ? 'bg-accent' : ''
        }`}
        style={{ paddingLeft: `${level * 16 + 12}px` }}
        onClick={() => selectElement(node.id)}
      >
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="p-0.5 hover:bg-accent rounded"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        )}
        
        {!hasChildren && <div className="w-5" />}

        <span className="text-xs font-mono text-muted-foreground">&lt;{node.tagName}&gt;</span>

        <button
          className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full border border-border bg-background"
          onClick={(e) => {
            e.stopPropagation();
            onStyleClick(node.id);
          }}
          title={styleInfo.classes.length > 0 ? `Styles: ${styleInfo.classes.join(' ')}` : 'Assign style'}
        >
          <svg width="10" height="10" viewBox="0 0 10 10">
            <circle
              cx="5"
              cy="5"
              r="4"
              fill={styleInfo.color || 'transparent'}
              stroke={styleInfo.color ? 'none' : 'currentColor'}
              className="text-muted-foreground"
            />
          </svg>
        </button>

        {isEditingId ? (
          <div className="flex items-center gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
            <Input
              value={editedId}
              onChange={(e) => setEditedId(e.target.value)}
              className="h-6 text-xs font-mono"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveId();
                if (e.key === 'Escape') handleCancelEdit();
              }}
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={handleSaveId}
            >
              <Check className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={handleCancelEdit}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-1">
            <span className="text-xs font-mono truncate">id="{node.id}"</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditingId(true);
              }}
            >
              <Edit2 className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>

      {isExpanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              getStyleInfo={getStyleInfo}
              onStyleClick={onStyleClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function SemanticTree() {
  const { svgDOM, styleDefinitions } = useEditorStore();
  const [stylePickerTarget, setStylePickerTarget] = useState<string | null>(null);

  const visualGroups = useMemo(() => {
    if (!svgDOM) return [];
    return buildVisualGroupTree(svgDOM);
  }, [svgDOM]);

  const classColorMap = useMemo(() => {
    const map = new Map<string, string>();
    styleDefinitions.forEach((style) => {
      const fillRule = style.rules.find((rule) => rule.property.toLowerCase() === 'fill');
      const strokeRule = style.rules.find((rule) => rule.property.toLowerCase() === 'stroke');
      const color = (fillRule?.value || strokeRule?.value || '').trim();
      style.selectors.forEach((selector) => {
        if (!selector.startsWith('.')) return;
        const className = selector.replace('.', '');
        if (color) {
          map.set(className, color);
        }
      });
    });
    return map;
  }, [styleDefinitions]);

  const getStyleInfo = useCallback(
    (node: SVGElement) => {
      const classAttr = node.attributes?.class || '';
      const classes = classAttr.split(' ').map((c) => c.trim()).filter(Boolean);
      const color = classes.map((cls) => classColorMap.get(cls)).find(Boolean) || null;
      return { color, classes };
    },
    [classColorMap]
  );

  if (!svgDOM) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        <p>No SVG loaded</p>
        <p className="mt-2 text-xs">Import an SVG to begin editing</p>
      </div>
    );
  }

  return (
    <div id="panel-semantic-tree" className="py-2">
      <div className="px-4 py-2 border-b border-border">
        <h2 className="text-sm font-semibold">Visual Groups</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Focused on &lt;g&gt; elements (root, metadata, defs hidden)
        </p>
      </div>
      {visualGroups.length === 0 ? (
        <div className="p-4 text-center text-sm text-muted-foreground">
          <p>No visual groups found</p>
          <p className="mt-2 text-xs">Add &lt;g&gt; elements to enable semantic grouping</p>
        </div>
      ) : (
        visualGroups.map((node) => (
          <TreeNode
            key={node.id}
            node={node}
            level={0}
            getStyleInfo={getStyleInfo}
            onStyleClick={(id) => setStylePickerTarget(id)}
          />
        ))
      )}

      <StylePickerModal
        open={stylePickerTarget !== null}
        elementId={stylePickerTarget}
        onClose={() => setStylePickerTarget(null)}
      />
    </div>
  );
}
