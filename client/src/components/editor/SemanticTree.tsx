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
  getStyleInfo: (node: SVGElement) => {
    classes: { name: string; fill: string | null; stroke: string | null }[];
  };
  onStyleClick: (id: string) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDragOverNode: (node: SVGElement) => void;
  onDropNode: (node: SVGElement) => void;
  dragOverId: string | null;
  dragMode: 'inside' | 'after' | null;
}

const SKIP_TAGS = new Set(['defs', 'metadata', 'title', 'desc', 'style']);

const buildVisualGroupTree = (node: SVGElement): SVGElement[] => {
  const tag = node.tagName.toLowerCase();
  if (SKIP_TAGS.has(tag)) return [];

  const children = node.children.flatMap((child) => buildVisualGroupTree(child));

  if (tag === 'svg') {
    return children;
  }

  return [{ ...node, children }];
};

function TreeNode({
  node,
  level,
  getStyleInfo,
  onStyleClick,
  onDragStart,
  onDragEnd,
  onDragOverNode,
  onDropNode,
  dragOverId,
  dragMode,
}: TreeNodeProps) {
  const { selectedElementId, selectElement, updateElementId } = useEditorStore();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditingId, setIsEditingId] = useState(false);
  const [editedId, setEditedId] = useState(node.id);
  const styleInfo = getStyleInfo(node);
  const classLabels = styleInfo.classes.map((cls) => `.${cls.name}`);
  const classText = classLabels.join(' ');

  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedElementId === node.id;
  const isDragOver = dragOverId === node.id;
  const dragIndicator =
    isDragOver && dragMode === 'after'
      ? 'border-b-2 border-primary/60'
      : isDragOver
      ? 'ring-1 ring-primary/40'
      : '';

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
        className={`group flex items-center gap-2 px-3 py-2 hover:bg-accent/50 cursor-grab active:cursor-grabbing transition-colors ${dragIndicator} ${
          isSelected ? 'bg-accent' : ''
        }`}
        style={{ paddingLeft: `${level * 16 + 12}px` }}
        onClick={() => selectElement(node.id)}
        draggable={!isEditingId}
        onDragStart={(event) => {
          event.stopPropagation();
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer.setData('text/plain', node.id);
          onDragStart(node.id);
        }}
        onDragEnd={() => onDragEnd()}
        onDragOver={(event) => {
          if (isEditingId) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = 'move';
          onDragOverNode(node);
        }}
        onDrop={(event) => {
          event.preventDefault();
          onDropNode(node);
        }}
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

        {isEditingId ? (
          <div
            className="flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <Input
              value={editedId}
              onChange={(e) => setEditedId(e.target.value)}
              className="h-6 w-32 text-xs font-mono"
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
          <>
            <span className="text-xs font-semibold text-foreground">{node.id}</span>
            {classText && (
              <span className="text-[11px] text-muted-foreground truncate">{classText}</span>
            )}
          </>
        )}

        <div className="ml-auto flex items-center gap-1">
          {styleInfo.classes.length === 0 ? (
            <button
              className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-border bg-background"
              onClick={(e) => {
                e.stopPropagation();
                onStyleClick(node.id);
              }}
              title="Assign style"
            >
              <svg width="10" height="10" viewBox="0 0 10 10">
                <circle
                  cx="5"
                  cy="5"
                  r="4"
                  fill="transparent"
                  stroke="currentColor"
                  className="text-muted-foreground"
                />
                <line
                  x1="2"
                  y1="8"
                  x2="8"
                  y2="2"
                  stroke="#ef4444"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          ) : (
            styleInfo.classes.map((cls) => {
              const fill = cls.fill ?? 'transparent';
              const stroke = cls.stroke ?? (cls.fill ? 'rgba(0,0,0,0.35)' : 'currentColor');
              const strokeClass = cls.stroke || cls.fill ? '' : 'text-muted-foreground';

              return (
                <button
                  key={cls.name}
                  className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-border bg-background"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStyleClick(node.id);
                  }}
                  title={`Style: ${cls.name}`}
                >
                  <svg width="10" height="10" viewBox="0 0 10 10">
                    <circle
                      cx="5"
                      cy="5"
                      r="4"
                      fill={fill}
                      stroke={stroke}
                      className={strokeClass}
                    />
                  </svg>
                </button>
              );
            })
          )}
        </div>

        {!isEditingId && (
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
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDragOverNode={onDragOverNode}
              onDropNode={onDropNode}
              dragOverId={dragOverId}
              dragMode={dragMode}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function SemanticTree() {
  const { svgDOM, styleDefinitions, moveElement } = useEditorStore();
  const [stylePickerTarget, setStylePickerTarget] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dragMode, setDragMode] = useState<'inside' | 'after' | null>(null);

  const visualGroups = useMemo(() => {
    if (!svgDOM) return [];
    return buildVisualGroupTree(svgDOM);
  }, [svgDOM]);

  const classStyleMap = useMemo(() => {
    const map = new Map<string, { fill: string | null; stroke: string | null }>();

    const getRuleValue = (rules: { property: string; value: string }[], property: string) => {
      for (let i = rules.length - 1; i >= 0; i -= 1) {
        if (rules[i].property.toLowerCase() === property) {
          return rules[i].value.trim();
        }
      }
      return null;
    };

    styleDefinitions.forEach((style) => {
      const fill = getRuleValue(style.rules, 'fill');
      const stroke = getRuleValue(style.rules, 'stroke');

      if (!fill && !stroke) return;

      style.selectors.forEach((selector) => {
        if (!selector.startsWith('.')) return;
        const className = selector.replace('.', '');
        const previous = map.get(className);
        map.set(className, {
          fill: fill ?? previous?.fill ?? null,
          stroke: stroke ?? previous?.stroke ?? null,
        });
      });
    });
    return map;
  }, [styleDefinitions]);

  const getStyleInfo = useCallback(
    (node: SVGElement) => {
      const classAttr = node.attributes?.class || '';
      const classes = classAttr
        .split(' ')
        .map((c) => c.trim())
        .filter(Boolean)
        .map((cls) => ({
          name: cls,
          fill: classStyleMap.get(cls)?.fill ?? null,
          stroke: classStyleMap.get(cls)?.stroke ?? null,
        }));
      return { classes };
    },
    [classStyleMap]
  );

  const getDropMode = useCallback((node: SVGElement): 'inside' | 'after' => {
    if (node.tagName.toLowerCase() === 'g' || node.children.length > 0) {
      return 'inside';
    }
    return 'after';
  }, []);

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
      {visualGroups.length === 0 ? (
        <div className="p-4 text-center text-sm text-muted-foreground">
          <p>No visual elements found</p>
          <p className="mt-2 text-xs">Add SVG elements to enable semantic grouping</p>
        </div>
      ) : (
        visualGroups.map((node) => (
          <TreeNode
            key={node.id}
            node={node}
            level={0}
            getStyleInfo={getStyleInfo}
            onStyleClick={(id) => setStylePickerTarget(id)}
            onDragStart={(id) => setDraggingId(id)}
            onDragEnd={() => {
              setDraggingId(null);
              setDragOverId(null);
              setDragMode(null);
            }}
            onDragOverNode={(target) => {
              if (!draggingId || draggingId === target.id) return;
              setDragOverId(target.id);
              setDragMode(getDropMode(target));
            }}
            onDropNode={(target) => {
              if (!draggingId || draggingId === target.id) return;
              const mode = getDropMode(target);
              moveElement(draggingId, target.id, mode);
              setDraggingId(null);
              setDragOverId(null);
              setDragMode(null);
            }}
            dragOverId={dragOverId}
            dragMode={dragMode}
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
