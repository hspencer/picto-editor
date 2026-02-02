# MediaFranca Semantic Refiner - Implementation Notes

## Project Overview

The MediaFranca Semantic Refiner (picto-editor) is a specialized React application designed for refining generative SVGs into semantically tagged, CSS-compliant assets that conform to the MediaFranca SVG Schema. This tool bridges the gap between AI-generated pictograms and production-ready AAC (Augmentative and Alternative Communication) assets.

## Architecture Decisions

### State Management: Zustand

We chose Zustand over Redux or Context API for several key reasons. Zustand provides a minimal API surface with excellent TypeScript support, making it ideal for high-frequency coordinate updates during visual manipulation. The library's small bundle size and lack of boilerplate align with our technical precision philosophy. Most importantly, Zustand's selector-based approach prevents unnecessary re-renders when updating specific parts of the SVG DOM tree.

### Coordinate System: getScreenCTM()

The bounding box system relies on SVG's native `getScreenCTM()` method for accurate coordinate transformation. This approach ensures pixel-perfect manipulation regardless of viewport transforms, nested groups, or scaling. We create SVG points and transform them through the Current Transformation Matrix, maintaining mathematical precision throughout the editing workflow.

### SVG Normalization Strategy

All imported SVGs undergo automatic normalization to enforce MediaFranca standards. The normalizer strips inline `style` attributes and converts them to CSS classes with auto-generated names (e.g., `mf-style-0`, `mf-style-1`). These classes are consolidated in a `<style>` block within `<defs>`, ensuring clean separation between structure and presentation. This approach makes SVGs more maintainable and enables consistent theming across the MediaFranca ecosystem.

### Design Philosophy: Technical Precision

The interface deliberately adopts a technical aesthetic to match its specialized purpose. We use JetBrains Mono monospace font throughout to reinforce the code-like nature of SVG editing. The color palette centers on a deep technical blue (`oklch(0.45 0.15 250)`) with high contrast ratios for accessibility. Border radii are minimal (0.25rem) to create sharp, professional edges. This design language signals to users that they're working with structured data, not casual graphics.

## Key Components

### EditorStore (Zustand)

The central state management hub maintains the SVG document as both raw XML string and parsed DOM tree. History management is implemented as an array of document snapshots with a current index pointer, enabling efficient undo/redo without complex diffing algorithms. The store exposes pure functions for element selection, ID updates, and tree manipulation, ensuring predictable state transitions.

### SVG Normalizer

The normalizer operates in two phases. First, it traverses the DOM tree to identify all elements with inline `style` attributes. For each styled element, it generates a unique class name, stores the CSS rules in a map, and replaces the attribute with the class reference. Second, it serializes the CSS map into a `<style>` block and injects it into `<defs>`. The result is a clean SVG where all styling is centralized and easily editable.

### Semantic Tree Component

The tree view recursively renders the SVG DOM with expand/collapse controls for parent elements. Each node displays its tag name and ID in monospace font, with inline editing enabled via a controlled input. Selection state synchronizes with the canvas through the Zustand store, creating a bidirectional editing experience. The tree uses indentation levels to show hierarchy, making complex nested structures easy to navigate.

### Bounding Box System

The bounding box component calculates element bounds using `getBBox()` and transforms them to screen coordinates via `getScreenCTM()`. It renders an overlay with eight control handles (four corners, four edges) for manipulation operations. The component tracks drag state and calculates deltas to update element transforms. Future enhancements will apply these transforms back to the SVG DOM, maintaining coordinate accuracy throughout the editing cycle.

### Schema Validator

The validator parses the SVG document and checks it against MediaFranca requirements. It verifies the presence of required elements (`<title>`, `<desc>`, `<metadata>`), validates metadata JSON structure, and checks for semantic groups with proper `role` and `data-concept` attributes. Validation results are categorized as errors (blocking issues) or warnings (recommendations), providing clear guidance for schema compliance.

## MediaFranca Integration

### Submodule: style-editor

The style-editor submodule provides UI components for CSS class management. While not yet fully integrated, it's configured with path aliases (`@style-editor`) and ready for import. Future integration will replace the current CSS class editor with the style-editor's more sophisticated interface, including visual property pickers and real-time preview.

### Submodule: mf-svg-schema

The mf-svg-schema repository contains the formal specification, validation tools, and canonical examples. We reference the schema's metadata structure in our validator and use the canonical SVG as our sample file. The schema defines the Single Source of Truth (SSoT) principle that guides our entire architecture—every element must carry its semantic meaning within the SVG itself.

### Schema Compliance

Our validator checks for the complete MediaFranca schema including utterance (the communicative intent), NSM (Natural Semantic Metalanguage) mappings, concept roles (Agent, Patient, Action), accessibility descriptions, provenance metadata, and VCSCI validation scores. This comprehensive checking ensures that exported SVGs are ready for use in AAC systems without additional processing.

## Technical Challenges Solved

### TypeScript with SVG DOM

Working with SVG elements in TypeScript requires careful type handling. We use `SVGGraphicsElement` for elements that support `getBBox()` and `getScreenCTM()`, and create proper type guards to ensure runtime safety. The DOM parser returns generic `Element` types, so we cast to specific SVG types after validation.

### Coordinate Transformation Accuracy

SVG coordinate systems can be complex with nested transforms, viewBox scaling, and viewport mapping. By using `getScreenCTM()` consistently, we ensure that all coordinate calculations account for the complete transformation chain. This approach handles edge cases like rotated groups and scaled containers without manual matrix multiplication.

### React Rendering of Raw SVG

We render SVG by setting `innerHTML` on a container div, which bypasses React's virtual DOM for the SVG content. This approach allows us to preserve the exact SVG structure including comments, formatting, and metadata blocks that React might strip. The trade-off is that we must manually sync selection state between the raw SVG and React components.

## Future Enhancements

### Full Transform Operations

The bounding box currently visualizes selection but doesn't yet apply transforms. Future work will implement matrix operations to update element positions, scales, and rotations. These transforms will be applied to the SVG DOM and re-serialized, maintaining schema compliance throughout.

### LLM Integration

The agent prompt dock has a mock regeneration service ready for LLM integration. Production implementation will extract the selected element's XML, send it to an LLM with the user's prompt, parse the response, and replace the element in the DOM tree without affecting sibling elements or parent transforms.

### Real-time Collaboration

The Zustand store's simple structure makes it suitable for operational transformation (OT) or CRDT-based collaboration. Future versions could sync state across multiple users, enabling team-based pictogram refinement with conflict-free merges.

### Export Formats

Currently we export raw SVG. Future enhancements could include minified output, PNG/PDF rasterization, or packaging with external CSS files. Each export format would maintain MediaFranca schema compliance while optimizing for specific use cases.

## Development Workflow

### Local Development

Run `pnpm dev` to start the Vite development server. The application hot-reloads on file changes, and TypeScript errors appear in the terminal. Use the browser console to debug state changes and coordinate calculations.

### Testing Approach

Manual testing focuses on the complete workflow: load SVG → select elements → edit IDs → validate schema → export. Automated testing could be added with Vitest for utility functions and Playwright for end-to-end scenarios.

### Git Workflow

The project uses git submodules for MediaFranca dependencies. Always clone with `--recurse-submodules` and use `git submodule update --remote` to pull upstream changes from style-editor and mf-svg-schema repositories.

## Deployment Considerations

### Static Hosting

The application is a pure frontend tool with no backend dependencies. It can be deployed to any static host (Netlify, Vercel, GitHub Pages) after running `pnpm build`. The dist folder contains all necessary assets.

### Browser Compatibility

The application requires modern browser features including SVG DOM APIs, ES6 modules, and CSS custom properties. Target browsers should be Chrome 90+, Firefox 88+, Safari 14+, or Edge 90+.

### Performance

The application handles SVGs up to several hundred elements efficiently. For very large documents (1000+ elements), consider implementing virtual scrolling in the semantic tree or lazy rendering in the canvas.

## Conclusion

The MediaFranca Semantic Refiner demonstrates a thoughtful approach to specialized SVG editing. By focusing on schema compliance, semantic structure, and technical precision, it provides a professional tool for refining AI-generated pictograms into production-ready AAC assets. The clean architecture and extensible design make it a solid foundation for future MediaFranca tooling.
