/**
 * Agent Prompt Dock Component
 * Persistent input for partial element regeneration via LLM
 */

import { useState } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// Mockable service for partial regeneration
export async function regenerateElement(elementId: string, prompt: string): Promise<string> {
  // This is a mock implementation
  // In production, this would send the element XML to an LLM
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(`<!-- Regenerated element ${elementId} based on: ${prompt} -->`);
    }, 1500);
  });
}

export default function AgentPromptDock() {
  const { selectedElementId, svgDOM } = useEditorStore();
  const [prompt, setPrompt] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);

  const handleRegenerate = async () => {
    if (!selectedElementId || !prompt.trim()) {
      toast.error('Please select an element and enter a prompt');
      return;
    }

    setIsRegenerating(true);
    
    try {
      const result = await regenerateElement(selectedElementId, prompt);
      toast.success('Element regenerated successfully');
      console.log('Regeneration result:', result);
      // TODO: Apply the regenerated XML to the SVG DOM
    } catch (error) {
      toast.error('Failed to regenerate element');
      console.error(error);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleRegenerate();
    }
  };

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Partial Element Regeneration
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {selectedElementId 
              ? `Regenerate #${selectedElementId} with AI`
              : 'Select an element to regenerate'
            }
          </p>
        </div>
        <Button
          onClick={handleRegenerate}
          disabled={!selectedElementId || !prompt.trim() || isRegenerating}
          size="sm"
          className="gap-2"
        >
          {isRegenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Regenerating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Regenerate
            </>
          )}
        </Button>
      </div>

      <Textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Describe how to modify this element... (Cmd/Ctrl + Enter to submit)"
        className="min-h-[80px] resize-none font-mono text-sm"
        disabled={!selectedElementId || isRegenerating}
      />
    </div>
  );
}
