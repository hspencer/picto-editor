/**
 * SVG Normalizer
 * Strips all inline style attributes and converts them to CSS classes
 */

export interface NormalizeResult {
  svg: string;
  cssRules: string;
}

function generateId(): string {
  return 'el-' + Math.random().toString(36).substr(2, 9);
}

export function normalizeSVG(svgString: string): NormalizeResult {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');
  const svgElement = doc.querySelector('svg');

  if (!svgElement) {
    throw new Error('Invalid SVG document');
  }

  // Auto-generate IDs for elements without them
  const allElements = svgElement.querySelectorAll('*');
  allElements.forEach((element) => {
    if (!element.id) {
      element.id = generateId();
    }
  });

  const cssRules: Map<string, string> = new Map();
  let classCounter = 0;

  // Recursive function to process elements
  function processElement(element: Element) {
    const styleAttr = element.getAttribute('style');
    
    if (styleAttr) {
      // Generate unique class name
      const className = `mf-style-${classCounter++}`;
      
      // Store CSS rule
      cssRules.set(className, styleAttr);
      
      // Replace style attribute with class
      element.removeAttribute('style');
      const existingClass = element.getAttribute('class');
      element.setAttribute('class', existingClass ? `${existingClass} ${className}` : className);
    }

    // Process children
    Array.from(element.children).forEach(processElement);
  }

  // Process all elements
  processElement(svgElement);

  // Generate CSS block
  let cssBlock = '';
  if (cssRules.size > 0) {
    cssBlock = Array.from(cssRules.entries())
      .map(([className, styles]) => `.${className} { ${styles} }`)
      .join('\n');
  }

  // Check if <style> element exists, if not create one
  let styleElement = svgElement.querySelector('style');
  if (!styleElement && cssBlock) {
    const newStyleElement = doc.createElementNS('http://www.w3.org/2000/svg', 'style');
    newStyleElement.textContent = cssBlock;
    svgElement.insertBefore(newStyleElement, svgElement.firstChild);
  } else if (styleElement && cssBlock) {
    styleElement.textContent = (styleElement.textContent || '') + '\n' + cssBlock;
  }

  const serializer = new XMLSerializer();
  const normalizedSVG = serializer.serializeToString(doc);

  return {
    svg: normalizedSVG,
    cssRules: cssBlock,
  };
}

/**
 * Parse SVG string into a structured DOM tree
 */
export interface SVGNode {
  id: string;
  tagName: string;
  attributes: Record<string, string>;
  children: SVGNode[];
  parentId?: string;
}

export function parseSVGToDOM(svgString: string): SVGNode | null {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');
  const svgElement = doc.querySelector('svg');

  if (!svgElement) {
    return null;
  }

  function elementToNode(element: Element, parentId?: string): SVGNode {
    const attributes: Record<string, string> = {};
    Array.from(element.attributes).forEach((attr) => {
      attributes[attr.name] = attr.value;
    });

    const id = element.getAttribute('id') || generateId();
    
    // Ensure element has an ID
    if (!element.getAttribute('id')) {
      element.setAttribute('id', id);
    }

    const children = Array.from(element.children).map((child) => elementToNode(child, id));

    return {
      id,
      tagName: element.tagName,
      attributes,
      children,
      parentId,
    };
  }

  return elementToNode(svgElement);
}

/**
 * Convert DOM tree back to SVG string
 */
export function domToSVGString(node: SVGNode): string {
  const createElement = (n: SVGNode): string => {
    const attrs = Object.entries(n.attributes)
      .map(([key, value]) => `${key}="${value}"`)
      .join(' ');
    
    const children = n.children.map(createElement).join('');
    
    if (children) {
      return `<${n.tagName} ${attrs}>${children}</${n.tagName}>`;
    } else {
      return `<${n.tagName} ${attrs} />`;
    }
  };

  return createElement(node);
}
