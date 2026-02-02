/**
 * Semantic Tree Component
 * Displays SVG DOM as expandable/collapsible tree with editable IDs
 */

import { useEditorStore } from '@/stores/editorStore';
import { useState } from 'react';
import { ChevronRight, ChevronDown, Edit2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { SVGElement } from '@/stores/editorStore';

interface TreeNodeProps {
  node: SVGElement;
  level: number;
}

function TreeNode({ node, level }: TreeNodeProps) {
  const { selectedElementId, selectElement, updateElementId } = useEditorStore();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditingId, setIsEditingId] = useState(false);
  const [editedId, setEditedId] = useState(node.id);

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
            <TreeNode key={child.id} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function SemanticTree() {
  const { svgDOM } = useEditorStore();

  if (!svgDOM) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        <p>No SVG loaded</p>
        <p className="mt-2 text-xs">Import an SVG to begin editing</p>
      </div>
    );
  }

  return (
    <div className="py-2">
      <div className="px-4 py-2 border-b border-border">
        <h2 className="text-sm font-semibold">Semantic Tree</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Click elements to select, edit IDs inline
        </p>
      </div>
      <TreeNode node={svgDOM} level={0} />
    </div>
  );
}
