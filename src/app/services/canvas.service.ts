import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Card } from '../models/card.model';
import { Template } from '../models/template.model';
import { Canvas } from '../models/canvas.model';
import { CardStorageService } from './card-storage.service';

@Injectable({
  providedIn: 'root'
})
export class CanvasService {
  private canvasesSubject = new BehaviorSubject<Canvas[]>([new Canvas('Canvas 1')]);
  canvases$ = this.canvasesSubject.asObservable();

  private selectedCanvasSubject = new BehaviorSubject<Canvas>(this.canvasesSubject.value[0]);
  selectedCanvas$ = this.selectedCanvasSubject.asObservable();

  private cardsSubject = new BehaviorSubject<Card[]>([]);
  cards$ = this.cardsSubject.asObservable();

  private selectedCardSubject = new BehaviorSubject<Card | null>(null);
  selectedCard$ = this.selectedCardSubject.asObservable();

  private canvasSubject = new BehaviorSubject<Canvas>(this.canvasesSubject.value[0]);
  canvas$ = this.canvasSubject.asObservable();

  private showCanvasPropsSubject = new BehaviorSubject<boolean>(false);
  showCanvasProps$ = this.showCanvasPropsSubject.asObservable();

  private selectedTemplateSubject = new BehaviorSubject<Template | null>(null);
  selectedTemplate$ = this.selectedTemplateSubject.asObservable();

  private placeholderRegex = /{{\s*([\w-]+)\s*=\s*(?:"([^"]*)"|\d+)\s*}}/g;

  constructor(private cardStorageService: CardStorageService) {
    // Load canvases and cards from storage on initialization
    const storedCanvases = this.cardStorageService.getCanvases();
    if (storedCanvases.length > 0) {
      this.canvasesSubject.next(storedCanvases);
      this.selectedCanvasSubject.next(storedCanvases[0]);
      this.canvasSubject.next(storedCanvases[0]);
    }
    
    this.loadCardsForCanvas(this.selectedCanvasSubject.value);
    
    // Subscribe to canvas selection changes
    this.selectedCanvasSubject.subscribe(canvas => {
      this.canvasSubject.next(canvas);
      this.loadCardsForCanvas(canvas);
    });
    
    // Subscribe to updates from storage and keep current canvas filtered
    this.cardStorageService.cards$.subscribe(cards => {
      const currentCanvas = this.selectedCanvasSubject.value;
      const filtered = cards.filter(c => c.canvasId === currentCanvas.id);
      this.cardsSubject.next(filtered);
    });
  }

  private loadCardsForCanvas(canvas: Canvas) {
    const allCards = this.cardStorageService.getAllCards();
    const canvasCards = allCards.filter(card => card.canvasId === canvas.id);
    this.cardsSubject.next(canvasCards);
    this.selectedCardSubject.next(null);
  }

  addCard(
    name: string,
    templateHtml: string,
    templateId: string,
    variables: { [key: string]: string } = {},
    variableFontSizes: { [key: string]: number } = {}
  ): Card {
    const canvasId = this.selectedCanvasSubject.value.id;
    const card = this.cardStorageService.addCard(name, templateHtml, templateId, variables, canvasId, variableFontSizes);
    return card;
  }

  deleteCard(id: string) {
    this.cardStorageService.deleteCard(id);
    const current = this.cardsSubject.value.filter(c => c.id !== id);
    this.cardsSubject.next(current);
    if (this.selectedCardSubject.value?.id === id) {
      this.selectedCardSubject.next(null);
    }
  }

  selectCard(card: Card) {
    this.selectedCardSubject.next(card);
    this.showCanvasPropsSubject.next(false);
    this.selectedTemplateSubject.next(null);  // Close template edit if open
  }

  updateSelectedHtml(html: string) {
    const selected = this.selectedCardSubject.value;
    if (selected) {
      selected.templateHtml = html;
      this.cardsSubject.next([...this.cardsSubject.value]);
      this.cardStorageService.updateCard(selected);
    }
  }

  updateSelectedVariable(key: string, value: string) {
    const selected = this.selectedCardSubject.value;
    if (selected) {
      selected.variables[key] = value;
      this.cardsSubject.next([...this.cardsSubject.value]);
      this.cardStorageService.updateCard(selected);
    }
  }

  updateSelectedVariableFontSize(key: string, size: number | null) {
    const selected = this.selectedCardSubject.value;
    if (selected) {
      if (size === null || Number.isNaN(size)) {
        delete selected.variableFontSizes[key];
      } else {
        selected.variableFontSizes[key] = size;
      }
      this.cardsSubject.next([...this.cardsSubject.value]);
      this.cardStorageService.updateCard(selected);
    }
  }

  updateSelectedName(name: string) {
    const selected = this.selectedCardSubject.value;
    if (selected) {
      selected.name = name;
      this.cardsSubject.next([...this.cardsSubject.value]);
      this.cardStorageService.updateCard(selected);
    }
  }

  showCanvasProperties() {
    this.selectedCardSubject.next(null);
    this.showCanvasPropsSubject.next(true);
    this.selectedTemplateSubject.next(null);
  }

  updateCanvas(canvas: Canvas) {
    const updated = new Canvas(
      canvas.name,
      canvas.cardWidth,
      canvas.cardHeight,
      canvas.canvasWidth,
      canvas.canvasHeight,
      canvas.distanceBetweenCards,
      canvas.distanceFromBorders,
      canvas.id
    );
    const canvases = this.canvasesSubject.value.map(c => (c.id === updated.id ? updated : c));
    this.canvasesSubject.next(canvases);
    this.selectedCanvasSubject.next(updated);
    this.canvasSubject.next(updated);
    this.cardStorageService.saveCanvases(canvases);
  }

  editTemplate(template: Template) {
    this.selectedCardSubject.next(null);
    this.showCanvasPropsSubject.next(false);
    this.selectedTemplateSubject.next(template);
  }

  closeTemplateEdit() {
    this.selectedTemplateSubject.next(null);
  }

  updateTemplateHtml(html: string) {
    const template = this.selectedTemplateSubject.value;
    if (template) {
      const oldHtml = template.templateHtml;
      const oldKeys = this.getPlaceholderKeys(oldHtml);
      template.templateHtml = html;
      this.cardStorageService.updateTemplate(template);
      const newKeys = this.getPlaceholderKeys(html);
      this.updateCardsFromTemplate(template, oldKeys, newKeys);
    }
  }

  updateTemplateName(name: string) {
    const template = this.selectedTemplateSubject.value;
    if (template) {
      template.name = name;
      this.cardStorageService.updateTemplate(template);
    }
  }

  getSelectedCard(): Card | null {
    return this.selectedCardSubject.value;
  }

  getSelectedTemplate(): Template | null {
    return this.selectedTemplateSubject.value;
  }

  private getPlaceholderKeys(html: string): Set<string> {
    const keys = new Set<string>();
    let match;
    this.placeholderRegex.lastIndex = 0;  // Reset index
    while ((match = this.placeholderRegex.exec(html)) !== null) {
      keys.add(match[1]);
    }
    return keys;
  }

  private updateCardsFromTemplate(template: Template, oldKeys: Set<string>, newKeys: Set<string>) {
    const removed = new Set([...oldKeys].filter(k => !newKeys.has(k)));
    const added = new Set([...newKeys].filter(k => !oldKeys.has(k)));

    const renameMap: { [oldKey: string]: string } = {};
    if (removed.size === 1 && added.size === 1) {
      const oldKey = [...removed][0];
      const newKey = [...added][0];
      renameMap[oldKey] = newKey;
    }

    // Parse new defaults
    const newDefaults: { [key: string]: string } = {};
    let match;
    this.placeholderRegex.lastIndex = 0;
    while ((match = this.placeholderRegex.exec(template.templateHtml)) !== null) {
      const key = match[1];
      const defaultVal = match[2] ?? match[0].split('=')[1].trim();
      newDefaults[key] = defaultVal;
    }

    const newTemplateHtml = template.templateHtml.replace(this.placeholderRegex, '{{$1}}');

    // Get ALL cards from storage, not just the filtered ones for current canvas
    const allCards = this.cardStorageService.getAllCards();
    
    // Update ALL cards that belong to this template (across all canvases)
    allCards.forEach(card => {
      if (card.templateId === template.id) {
        const updatedVariables = { ...card.variables };
        const updatedFontSizes = { ...card.variableFontSizes };

        // Handle renames
        for (const [oldKey, newKey] of Object.entries(renameMap)) {
          if (updatedVariables[oldKey] !== undefined) {
            updatedVariables[newKey] = updatedVariables[oldKey];
            delete updatedVariables[oldKey];
          }
          if (updatedFontSizes[oldKey] !== undefined) {
            updatedFontSizes[newKey] = updatedFontSizes[oldKey];
            delete updatedFontSizes[oldKey];
          }
        }

        // Add new keys with defaults if not present
        for (const key of newKeys) {
          if (updatedVariables[key] === undefined) {
            updatedVariables[key] = newDefaults[key];
          }
        }

        // Remove obsolete keys (if not renamed)
        for (const key of removed) {
          if (!renameMap[key]) {
            delete updatedVariables[key];
            delete updatedFontSizes[key];
          }
        }

        const updatedCard = new Card(
          card.name,
          newTemplateHtml,
          card.templateId,
          card.canvasId,
          card.id,
          updatedVariables,
          updatedFontSizes
        );
        // Persist the updated card
        this.cardStorageService.updateCard(updatedCard);
      }
    });

    // Re-filter for current canvas to update cardsSubject
    const currentCanvas = this.selectedCanvasSubject.value;
    const filteredCards = this.cardStorageService.getAllCards().filter(c => c.canvasId === currentCanvas.id);
    this.cardsSubject.next(filteredCards);
  }

  // Canvas management methods
  getCanvases(): Canvas[] {
    return this.canvasesSubject.value;
  }

  selectCanvas(canvas: Canvas) {
    this.selectedCanvasSubject.next(canvas);
  }

  addCanvas(name: string = 'New Canvas', config?: Partial<Canvas>): Canvas {
    const newCanvas = new Canvas(
      name,
      config?.cardWidth ?? undefined,
      config?.cardHeight ?? undefined,
      config?.canvasWidth ?? undefined,
      config?.canvasHeight ?? undefined,
      config?.distanceBetweenCards ?? undefined,
      config?.distanceFromBorders ?? undefined
    );
    const canvases = [...this.canvasesSubject.value, newCanvas];
    this.canvasesSubject.next(canvases);
    this.cardStorageService.saveCanvases(canvases);
    return newCanvas;
  }

  importCanvas(payload: any): Canvas | null {
    if (!payload) return null;

    const canvasData = payload.canvas ?? payload;
    const importedCanvas = new Canvas(
      canvasData.name ?? 'Imported Canvas',
      canvasData.cardWidth ?? undefined,
      canvasData.cardHeight ?? undefined,
      canvasData.canvasWidth ?? undefined,
      canvasData.canvasHeight ?? undefined,
      canvasData.distanceBetweenCards ?? undefined,
      canvasData.distanceFromBorders ?? undefined
    );

    const canvases = [...this.canvasesSubject.value, importedCanvas];
    this.canvasesSubject.next(canvases);
    this.cardStorageService.saveCanvases(canvases);

    const templateIdMap: Record<string, string> = {};
    const templates = Array.isArray(payload.templates) ? payload.templates : [];

    templates.forEach((t: any, index: number) => {
      const templateName = t?.name && t.name.trim().length > 0 ? t.name : `Imported Template ${index + 1}`;
      const templateHtml = t?.templateHtml ?? '';
      const templateVars = t?.variables ?? {};
      const newTemplate = this.cardStorageService.addTemplate(templateName, templateHtml, importedCanvas.id);
      newTemplate.variables = { ...templateVars };
      this.cardStorageService.updateTemplate(newTemplate);
      const originalId = t?.id ?? index;
      templateIdMap[String(originalId)] = newTemplate.id;
    });

    const cards = Array.isArray(payload.cards) ? payload.cards : [];
    cards.forEach((c: any, index: number) => {
      const templateKey = c?.templateId ?? (typeof c?.templateIndex === 'number' ? c.templateIndex : index);
      const mappedTemplateId = templateIdMap[String(templateKey)];
      if (!mappedTemplateId) {
        return;
      }
      const cardName = c?.name && c.name.trim().length > 0 ? c.name : `Imported Card ${index + 1}`;
      const cardHtml = c?.templateHtml ?? '';
      const cardVars = c?.variables ?? {};
      const cardFontSizes = c?.variableFontSizes ?? {};
      this.cardStorageService.addCard(cardName, cardHtml, mappedTemplateId, { ...cardVars }, importedCanvas.id, { ...cardFontSizes });
    });

    this.selectedCanvasSubject.next(importedCanvas);
    this.canvasSubject.next(importedCanvas);
    this.loadCardsForCanvas(importedCanvas);

    return importedCanvas;
  }

  deleteCanvas(canvasId: string) {
    const canvases = this.canvasesSubject.value.filter(c => c.id !== canvasId);
    if (canvases.length === 0) {
      // Always keep at least one canvas
      const defaultCanvas = new Canvas('Canvas 1');
      this.canvasesSubject.next([defaultCanvas]);
      this.selectedCanvasSubject.next(defaultCanvas);
      this.cardStorageService.saveCanvases([defaultCanvas]);
    } else {
      this.canvasesSubject.next(canvases);
      if (this.selectedCanvasSubject.value.id === canvasId) {
        this.selectedCanvasSubject.next(canvases[0]);
      }
      this.cardStorageService.saveCanvases(canvases);
    }
    // Delete all cards for this canvas
    this.cardStorageService.deleteCardsByCanvas(canvasId);
  }

  renameCanvas(canvasId: string, newName: string) {
    const canvases = this.canvasesSubject.value.map(c => {
      if (c.id === canvasId) {
        c.name = newName;
      }
      return c;
    });
    this.canvasesSubject.next(canvases);
    this.cardStorageService.saveCanvases(canvases);
    
    // Update selected canvas if it's the one being renamed
    if (this.selectedCanvasSubject.value.id === canvasId) {
      this.selectedCanvasSubject.next(this.selectedCanvasSubject.value);
    }
  }
}