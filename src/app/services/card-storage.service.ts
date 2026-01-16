import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Card } from '../models/card.model';
import { Template } from '../models/template.model';
import { Canvas } from '../models/canvas.model';

@Injectable({
  providedIn: 'root'
})
export class CardStorageService {
  private migrationDone = false;
  
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
  addTemplate(name: string, templateHtml: string, canvasId: number): Template {
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
    templateId: number,
    variables: { [key: string]: string } = {},
    canvasId: number = 1,
    variableFontSizes: { [key: string]: number } = {}
  ): Card {
    console.log('[CardStorageService] addCard called:', name, 'templateId:', templateId, 'canvasId:', canvasId);
    const card = new Card(name, templateHtml, templateId, undefined, variables, canvasId, variableFontSizes);
    const current = this.cardsSubject.value;
    this.cardsSubject.next([...current, card]);
    this.saveCardsToStorage();
    return card;
  }

  deleteTemplate(id: number) {
    const current = this.templatesSubject.value.filter(t => t.id !== id);
    this.templatesSubject.next(current);
    this.saveTemplatesToStorage();
  }

  deleteCard(id: number) {
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
            updatedCard.id,
            updatedCard.variables,
            updatedCard.canvasId,
            updatedCard.variableFontSizes
          )
        : c
    );
    this.cardsSubject.next(current);
    this.saveCardsToStorage();
  }

  getTemplateById(id: number): Template | undefined {
    return this.templatesSubject.value.find(t => t.id === id);
  }

  getCardById(id: number): Card | undefined {
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
      const templates: Template[] = [];
      const cards: Card[] = [];

      parsed.forEach((item: any) => {
        console.log('[Migration] Processing item:', item.name, 'isLocked:', item.isLocked, 'templateId:', item.templateId);
        // Old items with isLocked: false and no templateId are templates
        // Old items with isLocked: true OR items with templateId are cards
        if (item.isLocked === false && !item.templateId) {
          // This is a template
          console.log('[Migration] -> Treated as template');
          templates.push(new Template(item.name, item.templateHtml, item.id, item.variables || {}));
        } else if (item.templateId || item.isLocked === true) {
          // This is a card with a template reference
          console.log('[Migration] -> Treated as card with templateId:', item.templateId);
          cards.push(new Card(item.name, item.templateHtml, item.templateId, item.id, item.variables || {}));
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

  private loadTemplatesFromStorage(): Template[] {
    this.migrateOldData();
    
    const stored = localStorage.getItem('savedTemplates');
    console.log('[LoadTemplates] stored templates:', !!stored);
    if (stored) {
      const parsed = JSON.parse(stored);
      console.log('[LoadTemplates] Loaded templates count:', parsed.length);
      return parsed.map((t: any) => new Template(t.name, t.templateHtml, t.canvasId ?? 1, t.id, t.variables || {}));
    }
    return [];
  }

  private loadCardsFromStorage(): Card[] {
    this.migrateOldData();
    
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
          c.id,
          c.variables || {},
          c.canvasId ?? 1,
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
    const stored = localStorage.getItem('savedCanvases');
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.map((c: any) => new Canvas(c.name, c.cardWidth, c.cardHeight, c.canvasWidth, c.canvasHeight, c.distanceBetweenCards, c.distanceFromBorders ?? 10, c.id));
    }
    // Return default canvas if none exist
    return [new Canvas('Canvas 1')];
  }

  deleteCardsByCanvas(canvasId: number) {
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
