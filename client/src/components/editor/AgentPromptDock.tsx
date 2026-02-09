/**
 * Agent Prompt Dock Component
 * Persistent input for partial element regeneration via LLM
 */

import { useState } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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
  const { selectedElementId } = useEditorStore();
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
      <Textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Prompt"
        className="min-h-[100px] resize-none font-mono text-sm"
        disabled={!selectedElementId || isRegenerating}
      />
      <Button
        onClick={handleRegenerate}
        disabled={!selectedElementId || !prompt.trim() || isRegenerating}
        size="sm"
        className="gap-2"
      >
        {isRegenerating ? 'regenerando...' : 'regenerar'}
      </Button>
    </div>
  );
}
