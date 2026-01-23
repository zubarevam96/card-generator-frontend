# Card Generator Frontend - AI Coding Guide

## Project Overview
Angular 20 application for generating printable card sheets with customizable templates. Think "magic card creator" - users define templates with variables, create card instances, and export to PDF for printing.

## Architecture

### Core Data Flow
- **Canvas** → **Templates** → **Cards** → **PDF Export**
- Canvas defines page dimensions and card layout (A4 sheets with multiple cards)
- Templates are reusable HTML designs with `{{variable}}` placeholders
- Cards are template instances with filled-in variable values
- Single `CanvasService` orchestrates state; `CardStorageService` persists to localStorage

### Key Components Structure
```
generate/
  ├── canvas-block/          # Visual card preview & PDF export (uses ShadowDOM)
  ├── properties-block/      # Editing panel with 3 sub-tabs
  │   ├── canvas-properties/   # Page dimensions & spacing
  │   ├── template-properties/ # Template HTML editor
  │   └── card-properties/     # Variable values & font sizes
  └── templates-block/       # Template picker/manager
```

## Critical Patterns

### Loose Coupling & Single Responsibility Principle
**Core architectural principle**: Components should be as independent as possible. If a component does more than one job, create separate classes/components.

**Example**: `properties-block` doesn't handle all property editing itself - it delegates to 3 independent sub-components:
- `canvas-properties/` - Canvas dimensions & spacing only
- `template-properties/` - Template HTML editor only  
- `card-properties/` - Variable values & font sizes only

Each sub-component manages its own concern with minimal cross-dependencies. Apply this pattern when adding features - favor composition over monolithic components.

### Variable System
Templates use `{{variableName}}` placeholders. Cards can override font size per variable:
```typescript
// In Card model - variables get wrapped with font-size spans
variableFontSizes: { [key: string]: number }
// Generates: <span style="font-size: 14px">{{value}}</span>
```

### Service Layer
All services are `providedIn: 'root'` singletons:
- **CanvasService**: Primary state manager, uses RxJS BehaviorSubjects
- **CardStorageService**: localStorage persistence with migration logic
- **PdfExportService**: Uses `html2canvas` + `jspdf` for export

### State Management Pattern
```typescript
// BehaviorSubject → Observable pattern everywhere
private cardsSubject = new BehaviorSubject<Card[]>([]);
cards$ = this.cardsSubject.asObservable();
```

Components subscribe in constructor, never unsubscribe (standalone components handle this).

### Canvas-Card Relationship
Every Template and Card has a `canvasId`. Switching canvases filters displayed items:
```typescript
// CanvasService automatically filters cards on canvas change
this.selectedCanvasSubject.subscribe(canvas => {
  this.loadCardsForCanvas(canvas);
});
```

### ID Management
Models use static counters (`nextCardId`, `nextTemplateId`) that sync with provided IDs during load:
```typescript
if (id >= nextCardId) nextCardId = id + 1; // Keep counter ahead
```

## Template System

### HTML Structure
Templates are inline-styled HTML strings (no external CSS). Example pattern:
```html
<div style="display: flex; flex-direction: column; height: 100%;">
  <img src="{{portraitUrl}}" />
  <div>{{characterName}}</div>
</div>
```

### Loading External Templates
The `/templates` folder contains JSON exports with canvas + templates + cards. Import via JSON modal in UI.

## PDF Export Workflow
1. Calculate cards per page from canvas dimensions + card size + spacing
2. Split cards into pages (array of card arrays)
3. `html2canvas` renders each page's HTML
4. `jspdf` combines into multi-page PDF

**Critical**: Canvas Block uses `ViewEncapsulation.ShadowDom` to isolate card styles from app styles during rendering.

## Development Workflow

### Start Dev Server
```bash
npm start  # Or use task "npm: start" from VS Code tasks
# Serves on http://localhost:4200
```

### Code Style
- Prettier configured with 100 char line width, single quotes
- Angular parser for HTML templates
- No tests configured (test runner removed)

### Data Persistence
Everything localStorage-based with keys:
- `savedCanvases` - Canvas definitions
- `savedTemplates` - Reusable templates
- `savedCards` - Card instances

Migration logic in `CardStorageService.migrateOldData()` handles old format (pre-canvas feature).

## Common Tasks

### Adding a New Model Property
1. Update model constructor with default value
2. Update storage service load/save methods
3. Add UI input in corresponding properties component
4. Update JSON import/export if applicable

### Modifying Card Rendering
Edit `Card.renderedHtml` getter - handles variable substitution + font size wrapping.

### Changing Page Layout
Modify `Canvas` model properties: `cardWidth`, `cardHeight`, `distanceBetweenCards`, `distanceFromBorders`.  
Layout recalculated in `canvas-block.component.ts:updateCardPages()`.

## Routes
- `/` → redirects to `/generate` (main editor)
- `/images` → image library (for managing assets)
- Fallback → `/generate`

## Pitfalls
- Don't add external stylesheets to templates - PDF export won't capture them
- Canvas IDs must match between templates/cards, or items won't display
- Model ID counters are module-scoped statics - shared across all instances
- localStorage keys changed during migration - check `CardStorageService` before adding new keys
