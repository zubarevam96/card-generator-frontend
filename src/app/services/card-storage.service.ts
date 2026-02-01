import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Card } from '../models/card.model';
import { Template } from '../models/template.model';
import { Canvas } from '../models/canvas.model';
import { generateGuid } from '../shared/id-utils';

@Injectable({
  providedIn: 'root'
})
export class CardStorageService {
  private migrationDone = false;
  private guidNormalizationDone = false;
  
  private canvasesSubject = new BehaviorSubject<Canvas[]>(this.loadCanvasesFromStorage());
  canvases$ = this.canvasesSubject.asObservable();

  private templatesSubject = new BehaviorSubject<Template[]>(this.loadTemplatesFromStorage());
  templates$ = this.templatesSubject.asObservable();

  private cardsSubject = new BehaviorSubject<Card[]>(this.loadCardsFromStorage());
  cards$ = this.cardsSubject.asObservable();

  // For backward compatibility
  get savedCards$() {
    return this.templates$;
  }

  // Add a new template
  addTemplate(name: string, templateHtml: string, canvasId: string): Template {
    console.log('[CardStorageService] addTemplate called:', name);
    const template = new Template(name, templateHtml, canvasId);
    const current = this.templatesSubject.value;
    this.templatesSubject.next([...current, template]);
    this.saveTemplatesToStorage();
    return template;
  }

  // Add a new card
  addCard(
    name: string,
    templateHtml: string,
    templateId: string,
    variables: { [key: string]: string } = {},
    canvasId: string = this.canvasesSubject.value[0]?.id ?? generateGuid(),
    variableFontSizes: { [key: string]: number } = {}
  ): Card {
    console.log('[CardStorageService] addCard called:', name, 'templateId:', templateId, 'canvasId:', canvasId);
    const card = new Card(name, templateHtml, templateId, canvasId, undefined, variables, variableFontSizes);
    const current = this.cardsSubject.value;
    this.cardsSubject.next([...current, card]);
    this.saveCardsToStorage();
    return card;
  }

  deleteTemplate(id: string) {
    const current = this.templatesSubject.value.filter(t => t.id !== id);
    this.templatesSubject.next(current);
    this.saveTemplatesToStorage();
  }

  deleteCard(id: string) {
    const current = this.cardsSubject.value.filter(c => c.id !== id);
    this.cardsSubject.next(current);
    this.saveCardsToStorage();
  }

  updateTemplate(updatedTemplate: Template) {
    const current = this.templatesSubject.value.map(t =>
      t.id === updatedTemplate.id
        ? new Template(updatedTemplate.name, updatedTemplate.templateHtml, updatedTemplate.canvasId, updatedTemplate.id, updatedTemplate.variables)
        : t
    );
    this.templatesSubject.next(current);
    this.saveTemplatesToStorage();
  }

  updateCard(updatedCard: Card) {
    const current = this.cardsSubject.value.map(c =>
      c.id === updatedCard.id
        ? new Card(
            updatedCard.name,
            updatedCard.templateHtml,
            updatedCard.templateId,
            updatedCard.canvasId,
            updatedCard.id,
            updatedCard.variables,
            updatedCard.variableFontSizes
          )
        : c
    );
    this.cardsSubject.next(current);
    this.saveCardsToStorage();
  }

  updateCardsBatch(updatedCards: Card[], saveNow: boolean = true) {
    if (updatedCards.length === 0) {
      if (saveNow) {
        this.saveCardsToStorage();
      }
      return;
    }

    const updatesById = new Map(updatedCards.map(card => [card.id, card] as const));
    const current = this.cardsSubject.value.map(c => {
      const updated = updatesById.get(c.id);
      return updated
        ? new Card(
            updated.name,
            updated.templateHtml,
            updated.templateId,
            updated.canvasId,
            updated.id,
            updated.variables,
            updated.variableFontSizes
          )
        : c;
    });

    this.cardsSubject.next(current);
    if (saveNow) {
      this.saveCardsToStorage();
    }
  }

  commitCardChanges() {
    this.saveCardsToStorage();
  }

  getTemplateById(id: string): Template | undefined {
    return this.templatesSubject.value.find(t => t.id === id);
  }

  getCardById(id: string): Card | undefined {
    return this.cardsSubject.value.find(c => c.id === id);
  }

  getSavedCards(): Template[] {
    return this.templatesSubject.value;
  }

  getAllCards(): Card[] {
    return this.cardsSubject.value;
  }

  clearAllStorage() {
    localStorage.removeItem('savedTemplates');
    localStorage.removeItem('savedCards');
    this.templatesSubject.next([]);
    this.cardsSubject.next([]);
  }

  debugLogStorage() {
    console.log('Templates:', this.templatesSubject.value);
    console.log('Cards:', this.cardsSubject.value);
    console.log('localStorage.savedTemplates:', localStorage.getItem('savedTemplates'));
    console.log('localStorage.savedCards:', localStorage.getItem('savedCards'));
  }

  private migrateOldData() {
    if (this.migrationDone) return;
    this.migrationDone = true;

    const oldSavedCards = localStorage.getItem('savedCards');
    const hasNewFormat = localStorage.getItem('savedTemplates') !== null;

    console.log('[Migration] oldSavedCards exists:', !!oldSavedCards, 'hasNewFormat:', hasNewFormat);

    if (oldSavedCards && !hasNewFormat) {
      // Old format exists, migrate it
      console.log('[Migration] Migrating old format...');
      const parsed = JSON.parse(oldSavedCards);
      const templates: any[] = [];
      const cards: any[] = [];

      parsed.forEach((item: any) => {
        console.log('[Migration] Processing item:', item.name, 'isLocked:', item.isLocked, 'templateId:', item.templateId);
        // Old items with isLocked: false and no templateId are templates
        // Old items with isLocked: true OR items with templateId are cards
        if (item.isLocked === false && !item.templateId) {
          // This is a template
          console.log('[Migration] -> Treated as template');
          templates.push({
            id: item.id,
            name: item.name,
            templateHtml: item.templateHtml,
            variables: item.variables || {},
            canvasId: 1
          });
        } else if (item.templateId || item.isLocked === true) {
          // This is a card with a template reference
          console.log('[Migration] -> Treated as card with templateId:', item.templateId);
          cards.push({
            id: item.id,
            name: item.name,
            templateHtml: item.templateHtml,
            variables: item.variables || {},
            templateId: item.templateId,
            canvasId: 1
          });
        }
      });

      console.log('[Migration] Migrated templates:', templates.length, 'cards:', cards.length);

      // Save migrated data to new keys
      if (templates.length > 0) {
        localStorage.setItem('savedTemplates', JSON.stringify(templates));
      }
      // Delete old format
      localStorage.removeItem('savedCards');
      
      // Save cards to new key if any exist
      if (cards.length > 0) {
        localStorage.setItem('savedCards', JSON.stringify(cards));
      }
    }
  }

  private normalizeGuidData() {
    if (this.guidNormalizationDone) return;
    this.guidNormalizationDone = true;

    const storedCanvasesRaw = localStorage.getItem('savedCanvases');
    const storedTemplatesRaw = localStorage.getItem('savedTemplates');
    const storedCardsRaw = localStorage.getItem('savedCards');

    let canvases = storedCanvasesRaw ? JSON.parse(storedCanvasesRaw) : [];
    let templates = storedTemplatesRaw ? JSON.parse(storedTemplatesRaw) : [];
    let cards = storedCardsRaw ? JSON.parse(storedCardsRaw) : [];

    if (!Array.isArray(canvases)) canvases = [];
    if (!Array.isArray(templates)) templates = [];
    if (!Array.isArray(cards)) cards = [];

    const canvasIdMap = new Map<number, string>();
    let changed = false;

    if (canvases.length === 0) {
      const defaultCanvas = new Canvas('Canvas 1');
      canvases = [defaultCanvas];
      changed = true;
    } else {
      canvases = canvases.map((c: any) => {
        let id = c.id;
        if (!id || typeof id !== 'string') {
          if (typeof id === 'number') {
            if (!canvasIdMap.has(id)) canvasIdMap.set(id, generateGuid());
            id = canvasIdMap.get(id)!;
          } else {
            id = generateGuid();
          }
          changed = true;
        }
        return { ...c, id };
      });
    }

    const defaultCanvasId = canvases[0]?.id ?? generateGuid();

    const templateIdMap = new Map<number, string>();
    templates = templates.map((t: any) => {
      let id = t.id;
      if (!id || typeof id !== 'string') {
        if (typeof id === 'number') {
          if (!templateIdMap.has(id)) templateIdMap.set(id, generateGuid());
          id = templateIdMap.get(id)!;
        } else {
          id = generateGuid();
        }
        changed = true;
      }

      let canvasId = t.canvasId;
      if (!canvasId || typeof canvasId !== 'string') {
        if (typeof canvasId === 'number' && canvasIdMap.has(canvasId)) {
          canvasId = canvasIdMap.get(canvasId)!;
        } else {
          canvasId = defaultCanvasId;
        }
        changed = true;
      }

      return { ...t, id, canvasId };
    });

    cards = cards.map((c: any) => {
      let id = c.id;
      if (!id || typeof id !== 'string') {
        id = generateGuid();
        changed = true;
      }

      let templateId = c.templateId;
      if (!templateId || typeof templateId !== 'string') {
        if (typeof templateId === 'number' && templateIdMap.has(templateId)) {
          templateId = templateIdMap.get(templateId)!;
        } else {
          templateId = generateGuid();
        }
        changed = true;
      }

      let canvasId = c.canvasId;
      if (!canvasId || typeof canvasId !== 'string') {
        if (typeof canvasId === 'number' && canvasIdMap.has(canvasId)) {
          canvasId = canvasIdMap.get(canvasId)!;
        } else {
          canvasId = defaultCanvasId;
        }
        changed = true;
      }

      return { ...c, id, templateId, canvasId };
    });

    if (changed) {
      localStorage.setItem('savedCanvases', JSON.stringify(canvases));
      localStorage.setItem('savedTemplates', JSON.stringify(templates));
      localStorage.setItem('savedCards', JSON.stringify(cards));
    }
  }

  private loadTemplatesFromStorage(): Template[] {
    this.migrateOldData();
    this.normalizeGuidData();
    
    const stored = localStorage.getItem('savedTemplates');
    console.log('[LoadTemplates] stored templates:', !!stored);
    if (stored) {
      const parsed = JSON.parse(stored);
      console.log('[LoadTemplates] Loaded templates count:', parsed.length);
      return parsed.map((t: any) => new Template(t.name, t.templateHtml, t.canvasId, t.id, t.variables || {}));
    }
    return [];
  }

  private loadCardsFromStorage(): Card[] {
    this.migrateOldData();
    this.normalizeGuidData();
    
    const stored = localStorage.getItem('savedCards');
    console.log('[LoadCards] stored cards:', !!stored);
    if (stored) {
      const parsed = JSON.parse(stored);
      console.log('[LoadCards] Loaded cards count:', parsed.length);
      return parsed.map((c: any) =>
        new Card(
          c.name,
          c.templateHtml,
          c.templateId,
          c.canvasId,
          c.id,
          c.variables || {},
          c.variableFontSizes || {}
        )
      );
    }
    return [];
  }

  // Canvas storage methods
  getCanvases(): Canvas[] {
    return this.canvasesSubject.value;
  }

  saveCanvases(canvases: Canvas[]) {
    this.canvasesSubject.next(canvases);
    localStorage.setItem('savedCanvases', JSON.stringify(canvases));
  }

  private loadCanvasesFromStorage(): Canvas[] {
    this.migrateOldData();
    this.normalizeGuidData();
    const stored = localStorage.getItem('savedCanvases');
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.map((c: any) => new Canvas(c.name, c.cardWidth, c.cardHeight, c.canvasWidth, c.canvasHeight, c.distanceBetweenCards, c.distanceFromBorders ?? 10, c.id));
    }
    // Return default canvas if none exist
    return [new Canvas('Canvas 1')];
  }

  deleteCardsByCanvas(canvasId: string) {
    const current = this.cardsSubject.value.filter(c => c.canvasId !== canvasId);
    this.cardsSubject.next(current);
    this.saveCardsToStorage();
  }

  private saveCardsToStorage() {
    localStorage.setItem('savedCards', JSON.stringify(this.cardsSubject.value));
  }

  private saveTemplatesToStorage() {
    localStorage.setItem('savedTemplates', JSON.stringify(this.templatesSubject.value));
  }
}
