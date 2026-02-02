# PictoEditor

A specialized React tool for refining generative SVGs into semantically tagged, CSS-compliant assets for the [PICTOS.net](https://pictos.net) and MediaFranca ecosystem.

## Overview

SVG editor designed specifically for working with AAC (Augmentative and Alternative Communication) pictograms that follow the [MediaFranca SVG Schema](https://github.com/mediafranca/mf-svg-schema). It provides a comprehensive interface for:

- **Semantic Structure Editing**: Visual tree-based editing of SVG DOM with semantic role mappings
- **CSS-Only Styling**: Strict enforcement of CSS classes over inline styles
- **Schema Validation**: Real-time validation against MediaFranca SVG Schema requirements
- **Visual Manipulation**: Bounding box system for precise element positioning
- **AI-Powered Refinement**: Partial element regeneration via LLM prompts

## Architecture

### Core Components

#### 1. Editor Shell (`#editor-shell`)
Root container managing the entire application layout.

#### 2. Navigation Workflow (`#nav-workflow`)
Top header containing:
- Undo/Redo history controls
- Export to Schema button

#### 3. Workspace (`#view-workspace`)
Main three-panel layout:

**Left Panel: Semantic Tree (`#aside-semantic-tree`)**
- Expandable/collapsible SVG DOM tree
- Inline ID editing for all elements
- Visual selection sync with canvas

**Center: Canvas Viewport (`#canvas-viewport`)**
- SVG rendering with accurate coordinate mapping via `getScreenCTM()`
- Bounding box overlay for selected elements
- Move, Scale, and Distort operations

**Right Panel: Style Forge (`#aside-style-forge`)**
- CSS class management (no inline styles allowed)
- Schema validation results
- Real-time compliance checking

#### 4. Agent Prompt Dock (`#agent-prompt-dock`)
Bottom panel for AI-powered partial element regeneration.

## Technology Stack

- **Framework**: React 19 with TypeScript
- **State Management**: Zustand
- **Styling**: Tailwind CSS 4
- **Icons**: Lucide React
- **Build Tool**: Vite 7

## Submodules

The project integrates two MediaFranca ecosystem submodules:

### 1. style-editor
**Location**: `client/src/lib/style-editor`  
**Alias**: `@style-editor`  
**Repository**: https://github.com/mediafranca/style-editor

Component library for SVG style editing with CSS class management.

### 2. mf-svg-schema
**Location**: `client/src/lib/mf-schema`  
**Alias**: `@schema`  
**Repository**: https://github.com/mediafranca/mf-svg-schema

Formal specification for semantically rich, accessible SVG pictograms.

## Key Features

### SVG Normalization
All imported SVGs are automatically normalized:
- Inline `style` attributes are stripped
- Styles are converted to CSS classes
- CSS rules are consolidated in a `<style>` block

### Schema Validation
Real-time validation against MediaFranca requirements:
- Required elements (`<title>`, `<desc>`, `<metadata>`)
- Semantic groups with `role="group"`
- Accessibility attributes (`aria-labelledby`, `tabindex`)
- Metadata structure (utterance, concepts, NSM mapping)

### Coordinate Mapping
Accurate screen-to-SVG coordinate transformation using:
- `getBBox()` for element bounds
- `getScreenCTM()` for coordinate transformation
- `createSVGPoint()` for point mapping

### History Management
Full undo/redo support:
- Automatic history snapshots on changes
- Bidirectional navigation
- State restoration

## Design Philosophy

**Technical Precision with Functional Aesthetics**

1. **Monospace Typography**: JetBrains Mono for code-like precision
2. **High-Contrast Colors**: Deep technical blue (`oklch(0.45 0.15 250)`)
3. **Minimal Borders**: Sharp 0.25rem radius for professional edges
4. **Functional Animations**: Focused on user feedback, not decoration
5. **Semantic IDs**: All major UI elements use semantic HTML IDs

## Getting Started

### Installation

```bash
# Clone with submodules
git clone --recurse-submodules https://github.com/mediafranca/picto-editor.git
cd picto-editor

# Install dependencies
pnpm install
```

### Development

```bash
# Start dev server
pnpm dev
```

### Building

```bash
# Build for production
pnpm build
```

## Usage

1. **Import SVG**: Click "Choose File" or "Load Sample" to import an SVG
2. **Edit Structure**: Use the Semantic Tree to select and rename elements
3. **Style Elements**: Apply CSS classes in the Style Forge panel
4. **Validate**: Check real-time validation results
5. **Refine with AI**: Use the Agent Prompt Dock for partial regeneration
6. **Export**: Click "Export to Schema" to download the refined SVG

## MediaFranca Ecosystem Integration

This tool is part of the broader MediaFranca AAC ecosystem:

1. **NLU Schema**: Natural language understanding and semantic decomposition
2. **PictoNet**: Generative model for pictogram synthesis
3. **SVG Schema**: Formal specification (this repository validates against)
4. **VCSCI Framework**: Human-in-the-loop validation

## License

This project follows the MediaFranca ecosystem licensing:
- Code: MIT License
- Schema/Specification: CC BY 4.0

## Contributing

Contributions should align with:
- MediaFranca SVG Schema requirements
- Single Source of Truth (SSoT) philosophy
- Deterministic accessibility principles

## Related Repositories

- [mediafranca/style-editor](https://github.com/mediafranca/style-editor)
- [mediafranca/mf-svg-schema](https://github.com/mediafranca/mf-svg-schema)
- [mediafranca/nlu-schema](https://github.com/mediafranca/nlu-schema)
- [mediafranca/VCSCI](https://github.com/mediafranca/VCSCI)
