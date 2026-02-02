/**
 * Validation Panel Component
 * Displays schema validation results
 */

import { useEditorStore } from '@/stores/editorStore';
import { useEffect, useState } from 'react';
import { validateSVGSchema, getValidationSummary, type ValidationResult } from '@/lib/schemaValidator';
import { AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function ValidationPanel() {
  const { svgDocument } = useEditorStore();
  const [validation, setValidation] = useState<ValidationResult | null>(null);

  useEffect(() => {
    if (svgDocument) {
      const result = validateSVGSchema(svgDocument);
      setValidation(result);
    } else {
      setValidation(null);
    }
  }, [svgDocument]);

  if (!validation) {
    return null;
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Schema Validation</h3>
        <div className="flex items-center gap-2 text-xs">
          {validation.valid ? (
            <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
              <CheckCircle className="w-4 h-4" />
              Valid
            </span>
          ) : (
            <span className="flex items-center gap-1 text-destructive">
              <AlertCircle className="w-4 h-4" />
              Invalid
            </span>
          )}
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        {getValidationSummary(validation)}
      </div>

      {validation.errors.length > 0 && (
        <div className="space-y-2">
          {validation.errors.map((error, index) => (
            <Alert key={index} variant="destructive" className="py-2">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="text-xs">Error</AlertTitle>
              <AlertDescription className="text-xs">
                {error.message}
                {error.elementId && <span className="font-mono ml-1">#{error.elementId}</span>}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {validation.warnings.length > 0 && (
        <div className="space-y-2">
          {validation.warnings.map((warning, index) => (
            <Alert key={index} className="py-2 border-yellow-500/50 bg-yellow-500/10">
              <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              <AlertTitle className="text-xs">Warning</AlertTitle>
              <AlertDescription className="text-xs">
                {warning.message}
                {warning.elementId && <span className="font-mono ml-1">#{warning.elementId}</span>}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}
    </div>
  );
}
