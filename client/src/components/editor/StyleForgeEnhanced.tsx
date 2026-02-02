/**
 * Style Forge Enhanced Component
 * CSS property editor with SVG properties dropdown
 */

import { useEffect, useState } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { SVG_CSS_PROPERTIES } from '@/lib/style-editor/lib/utils/svgProperties';
import ValidationPanel from './ValidationPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Palette } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CSSClass {
  name: string;
  rules: Record<string, string>;
}

export default function StyleForgeEnhanced() {
  const { selectedElementId, svgDocument } = useEditorStore();
  const [selectedElement, setSelectedElement] = useState<Element | null>(null);
  const [cssClasses, setCssClasses] = useState<CSSClass[]>([]);
  const [newClassName, setNewClassName] = useState('');
  const [newProperty, setNewProperty] = useState('');
  const [newValue, setNewValue] = useState('');

  useEffect(() => {
    if (!svgDocument || !selectedElementId) {
      setSelectedElement(null);
      return;
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(svgDocument, 'image/svg+xml');
    const element = doc.querySelector(`#${CSS.escape(selectedElementId)}`);
    setSelectedElement(element);

    // Extract CSS classes from <style> element
    const styleElement = doc.querySelector('style');
    if (styleElement) {
      const cssText = styleElement.textContent || '';
      const classRegex = /\.([a-zA-Z0-9_-]+)\s*\{([^}]+)\}/g;
      const classes: CSSClass[] = [];

      let match;
      while ((match = classRegex.exec(cssText)) !== null) {
        const rules: Record<string, string> = {};
        const rulesText = match[2].trim();
        const ruleRegex = /([a-z-]+)\s*:\s*([^;]+)/g;
        
        let ruleMatch;
        while ((ruleMatch = ruleRegex.exec(rulesText)) !== null) {
          rules[ruleMatch[1].trim()] = ruleMatch[2].trim();
        }

        classes.push({
          name: match[1],
          rules,
        });
      }

      setCssClasses(classes);
    }
  }, [svgDocument, selectedElementId]);

  const handleAddClass = () => {
    if (newClassName && !cssClasses.find(c => c.name === newClassName)) {
      setCssClasses([...cssClasses, { name: newClassName, rules: {} }]);
      setNewClassName('');
    }
  };

  const handleDeleteClass = (className: string) => {
    setCssClasses(cssClasses.filter(c => c.name !== className));
  };

  const handleAddProperty = (className: string) => {
    if (newProperty && newValue) {
      setCssClasses(cssClasses.map(c => {
        if (c.name === className) {
          return {
            ...c,
            rules: { ...c.rules, [newProperty]: newValue }
          };
        }
        return c;
      }));
      setNewProperty('');
      setNewValue('');
    }
  };

  const handleUpdateRule = (className: string, property: string, value: string) => {
    setCssClasses(cssClasses.map(c => {
      if (c.name === className) {
        return {
          ...c,
          rules: { ...c.rules, [property]: value }
        };
      }
      return c;
    }));
  };

  const handleDeleteRule = (className: string, property: string) => {
    setCssClasses(cssClasses.map(c => {
      if (c.name === className) {
        const newRules = { ...c.rules };
        delete newRules[property];
        return { ...c, rules: newRules };
      }
      return c;
    }));
  };

  const handleApplyToElement = (className: string) => {
    if (!selectedElementId || !svgDocument) return;

    const parser = new DOMParser();
    const doc = parser.parseFromString(svgDocument, 'image/svg+xml');
    const element = doc.querySelector(`#${CSS.escape(selectedElementId)}`);

    if (element) {
      const currentClass = element.getAttribute('class') || '';
      const classes = currentClass.split(' ').filter(Boolean);
      
      if (!classes.includes(className)) {
        classes.push(className);
        element.setAttribute('class', classes.join(' '));

        const serializer = new XMLSerializer();
        const updatedSVG = serializer.serializeToString(doc);
        
        // Update the store
        useEditorStore.getState().loadSVG(updatedSVG);
      }
    }
  };

  if (!selectedElementId) {
    return (
      <aside id="aside-style-forge" className="w-96 border-l border-border bg-card p-4 overflow-y-auto">
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Palette className="w-8 h-8" />
          </div>
          <p className="text-sm font-medium">No element selected</p>
          <p className="text-xs text-center mt-1">Select an element to edit styles</p>
        </div>
      </aside>
    );
  }

  return (
    <aside id="aside-style-forge" className="w-96 border-l border-border bg-card overflow-y-auto flex flex-col">
      {/* Element Info Header */}
      <div className="flex-none border-b border-border p-4 bg-muted/30">
        <h3 className="text-sm font-semibold">Style Forge</h3>
        <div className="text-xs space-y-1 mt-2">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Selected:</span>
            <code className="px-2 py-0.5 bg-background rounded text-primary font-mono">
              {selectedElement?.tagName.toLowerCase()}#{selectedElementId}
            </code>
          </div>
          {selectedElement?.getAttribute('class') && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Classes:</span>
              <code className="px-2 py-0.5 bg-background rounded font-mono">
                {selectedElement.getAttribute('class')}
              </code>
            </div>
          )}
        </div>
      </div>

      {/* CSS Classes Editor */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <h4 className="text-sm font-semibold mb-3">CSS Classes</h4>
          <div className="space-y-3">
            {cssClasses.map((cssClass) => (
              <div key={cssClass.name} className="border border-border rounded-lg p-3 bg-background">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-sm font-semibold">.{cssClass.name}</span>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => handleApplyToElement(cssClass.name)}
                    >
                      Apply
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => handleDeleteClass(cssClass.name)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                {/* Properties */}
                <div className="space-y-2 text-xs">
                  {Object.entries(cssClass.rules).map(([prop, val]) => (
                    <div key={prop} className="flex items-center gap-2">
                      <span className="font-mono text-muted-foreground w-32 truncate">{prop}:</span>
                      <Input
                        value={val}
                        onChange={(e) => handleUpdateRule(cssClass.name, prop, e.target.value)}
                        className="h-7 text-xs font-mono flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => handleDeleteRule(cssClass.name, prop)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Add Property */}
                <div className="mt-3 pt-3 border-t border-border space-y-2">
                  <Label className="text-xs">Add Property</Label>
                  <div className="flex gap-2">
                    <Select value={newProperty} onValueChange={setNewProperty}>
                      <SelectTrigger className="h-7 text-xs flex-1">
                        <SelectValue placeholder="Property..." />
                      </SelectTrigger>
                      <SelectContent>
                        {SVG_CSS_PROPERTIES.map((prop) => (
                          <SelectItem key={prop} value={prop} className="text-xs">
                            {prop}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      value={newValue}
                      onChange={(e) => setNewValue(e.target.value)}
                      placeholder="Value..."
                      className="h-7 text-xs w-24"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddProperty(cssClass.name)}
                      className="h-7 px-2"
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Add New Class */}
        <div className="pt-3 border-t border-border">
          <Label className="text-xs font-semibold mb-2 block">Add New CSS Class</Label>
          <div className="flex gap-2">
            <Input
              value={newClassName}
              onChange={(e) => setNewClassName(e.target.value)}
              placeholder="class-name"
              className="h-8 text-sm font-mono"
              onKeyDown={(e) => e.key === 'Enter' && handleAddClass()}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddClass}
              className="h-8 gap-1"
            >
              <Plus className="w-4 h-4" />
              Add
            </Button>
          </div>
        </div>
      </div>

      {/* Validation Panel */}
      <div className="flex-none border-t border-border">
        <ValidationPanel />
      </div>
    </aside>
  );
}
