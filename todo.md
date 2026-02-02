# PictoEditor - Todo List

## New Critical Issues

- [ ] Auto-generate random IDs for elements without ID
  - [ ] Add ID generation utility
  - [ ] Apply to SVG normalizer
  - [ ] Ensure uniqueness

- [ ] Make IDs editable in semantic tree
  - [ ] Add inline editing UI
  - [ ] Validate ID uniqueness
  - [ ] Update SVG document on change

- [ ] Replace prompt dock with available styles panel
  - [ ] Remove AgentPromptDock component
  - [ ] Create AvailableStylesPanel component
  - [ ] List all CSS classes from style-editor

- [ ] Add SVG properties dropdown in style editor
  - [ ] Import SVG_CSS_PROPERTIES from style-editor
  - [ ] Create dropdown/autocomplete UI
  - [ ] Filter by property name

- [ ] Restore bounding box and editing functionality
  - [ ] Debug why bounding box disappeared
  - [ ] Verify SVGCanvas renders BoundingBox
  - [ ] Test drag and scale operations

- [ ] Implement CSS class assignment to elements
  - [ ] Add "Apply to Element" button in style editor
  - [ ] Update element's class attribute
  - [ ] Persist changes to SVG document

## Testing
- [ ] Test ID generation on sample SVG
- [ ] Test ID editing in semantic tree
- [ ] Test style application to elements
- [ ] Test bounding box visibility and transforms
