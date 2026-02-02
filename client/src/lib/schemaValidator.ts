/**
 * MediaFranca SVG Schema Validator
 * Validates SVG structure against MediaFranca schema requirements
 */

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  type: 'error';
  message: string;
  elementId?: string;
}

export interface ValidationWarning {
  type: 'warning';
  message: string;
  elementId?: string;
}

/**
 * Validate SVG against MediaFranca schema
 */
export function validateSVGSchema(svgString: string): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');
  const svgElement = doc.querySelector('svg');

  if (!svgElement) {
    return {
      valid: false,
      errors: [{ type: 'error', message: 'Invalid SVG document' }],
      warnings: [],
    };
  }

  // Check for required attributes
  if (!svgElement.getAttribute('id')) {
    errors.push({ type: 'error', message: 'SVG root must have an id attribute' });
  }

  if (!svgElement.getAttribute('role')) {
    warnings.push({ type: 'warning', message: 'SVG should have role="img" for accessibility' });
  }

  if (!svgElement.getAttribute('aria-labelledby')) {
    warnings.push({ type: 'warning', message: 'SVG should have aria-labelledby for accessibility' });
  }

  // Check for required child elements
  const titleElement = svgElement.querySelector('title');
  if (!titleElement) {
    errors.push({ type: 'error', message: 'SVG must contain a <title> element' });
  }

  const descElement = svgElement.querySelector('desc');
  if (!descElement) {
    warnings.push({ type: 'warning', message: 'SVG should contain a <desc> element for accessibility' });
  }

  const metadataElement = svgElement.querySelector('metadata');
  if (!metadataElement) {
    errors.push({ type: 'error', message: 'SVG must contain a <metadata> element with MediaFranca schema' });
  } else {
    // Validate metadata structure
    try {
      const metadataContent = metadataElement.textContent?.trim() || '';
      const metadata = JSON.parse(metadataContent);

      if (!metadata.version) {
        warnings.push({ type: 'warning', message: 'Metadata should include version field' });
      }

      if (!metadata.utterance) {
        errors.push({ type: 'error', message: 'Metadata must include utterance field' });
      }

      if (!metadata.concepts || !Array.isArray(metadata.concepts)) {
        errors.push({ type: 'error', message: 'Metadata must include concepts array' });
      }

      if (!metadata.accessibility) {
        warnings.push({ type: 'warning', message: 'Metadata should include accessibility field' });
      }
    } catch (e) {
      errors.push({ type: 'error', message: 'Metadata must contain valid JSON' });
    }
  }

  // Check for style element
  const styleElement = svgElement.querySelector('style');
  if (!styleElement) {
    warnings.push({ type: 'warning', message: 'SVG should contain a <style> element in <defs>' });
  }

  // Check for semantic groups with roles
  const groups = svgElement.querySelectorAll('g[role="group"]');
  if (groups.length === 0) {
    warnings.push({ type: 'warning', message: 'SVG should contain semantic groups with role="group"' });
  }

  // Check for data-concept attributes on groups
  groups.forEach((group) => {
    const id = group.getAttribute('id');
    if (!id) {
      warnings.push({ type: 'warning', message: 'Semantic groups should have id attributes' });
    }

    const concept = group.getAttribute('data-concept');
    if (!concept) {
      warnings.push({
        type: 'warning',
        message: 'Semantic groups should have data-concept attribute',
        elementId: id || undefined,
      });
    }
  });

  // Check for inline styles (should be avoided)
  const elementsWithInlineStyles = svgElement.querySelectorAll('[style]');
  if (elementsWithInlineStyles.length > 0) {
    warnings.push({
      type: 'warning',
      message: `Found ${elementsWithInlineStyles.length} elements with inline styles. Consider using CSS classes instead.`,
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Get validation summary text
 */
export function getValidationSummary(result: ValidationResult): string {
  if (result.valid && result.warnings.length === 0) {
    return '✓ Valid MediaFranca SVG Schema';
  }

  const parts: string[] = [];

  if (!result.valid) {
    parts.push(`${result.errors.length} error(s)`);
  }

  if (result.warnings.length > 0) {
    parts.push(`${result.warnings.length} warning(s)`);
  }

  return parts.join(', ');
}
