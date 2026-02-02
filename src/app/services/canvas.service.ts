import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Card } from '../models/card.model';
import { Template } from '../models/template.model';
import { Canvas } from '../models/canvas.model';
import { CardStorageService } from './card-storage.service';

type TemplateUpdateJob = {
  token: number;
  templateId: string;
  newTemplateHtml: string;
  newKeys: Set<string>;
  removed: Set<string>;
  renameMap: { [oldKey: string]: string };
  newDefaults: { [key: string]: string };
  cards: Card[];
  index: number;
  batchSize: number;
  timerId?: number;
};

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

  private selectedCardsSubject = new BehaviorSubject<Card[]>([]);
  selectedCards$ = this.selectedCardsSubject.asObservable();

  private canvasSubject = new BehaviorSubject<Canvas>(this.canvasesSubject.value[0]);
  canvas$ = this.canvasSubject.asObservable();

  private showCanvasPropsSubject = new BehaviorSubject<boolean>(false);
  showCanvasProps$ = this.showCanvasPropsSubject.asObservable();

  private selectedTemplateSubject = new BehaviorSubject<Template | null>(null);
  selectedTemplate$ = this.selectedTemplateSubject.asObservable();

  private placeholderRegex = /{{\s*([\w-]+)\s*=\s*(?:"([^"]*)"|\d+)\s*}}/g;

  private templateUpdateToken = 0;
  private templateUpdateJobs = new Map<string, TemplateUpdateJob>();
  private readonly templateUpdateBatchSize = 40;

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
    this.selectedCardsSubject.next([]);
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
    const filteredSelection = this.selectedCardsSubject.value.filter(card => card.id !== id);
    if (filteredSelection.length !== this.selectedCardsSubject.value.length) {
      this.selectedCardsSubject.next(filteredSelection);
      if (filteredSelection.length === 1) {
        this.selectedCardSubject.next(filteredSelection[0]);
      } else if (filteredSelection.length === 0) {
        this.selectedCardSubject.next(null);
      }
    }
  }

  selectCard(card: Card) {
    this.selectedCardSubject.next(card);
    this.selectedCardsSubject.next([card]);
    this.showCanvasPropsSubject.next(false);
    this.selectedTemplateSubject.next(null);  // Close template edit if open
  }

  toggleCardSelection(card: Card) {
    const current = this.selectedCardsSubject.value;
    const exists = current.some(c => c.id === card.id);
    const updated = exists ? current.filter(c => c.id !== card.id) : [...current, card];
    this.selectedCardsSubject.next(updated);
    this.showCanvasPropsSubject.next(false);
    this.selectedTemplateSubject.next(null);

    if (updated.length === 1) {
      this.selectedCardSubject.next(updated[0]);
    } else {
      this.selectedCardSubject.next(null);
    }
  }

  clearCardSelection() {
    this.selectedCardsSubject.next([]);
    this.selectedCardSubject.next(null);
  }

  updateSelectedHtml(html: string) {
    const selected = this.selectedCardSubject.value;
    if (selected) {
      selected.templateHtml = html;
      selected.markHashOutdated();
      this.cardsSubject.next([...this.cardsSubject.value]);
      this.cardStorageService.updateCard(selected);
    }
  }

  updateSelectedVariable(key: string, value: string) {
    const selected = this.selectedCardSubject.value;
    if (selected) {
      selected.variables[key] = value;
      selected.markHashOutdated();
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
      selected.markHashOutdated();
      this.cardsSubject.next([...this.cardsSubject.value]);
      this.cardStorageService.updateCard(selected);
    }
  }

  updateSelectedName(name: string) {
    const selected = this.selectedCardSubject.value;
    if (selected) {
      selected.name = name;
      selected.markHashOutdated();
      this.cardsSubject.next([...this.cardsSubject.value]);
      this.cardStorageService.updateCard(selected);
    }
  }

  showCanvasProperties() {
    this.selectedCardSubject.next(null);
    this.selectedCardsSubject.next([]);
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
      canvas.id,
      canvas.hashValue,
      false,
      canvas.originalId
    );
    const canvases = this.canvasesSubject.value.map(c => (c.id === updated.id ? updated : c));
    this.canvasesSubject.next(canvases);
    this.selectedCanvasSubject.next(updated);
    this.canvasSubject.next(updated);
    this.cardStorageService.saveCanvases(canvases);
  }

  editTemplate(template: Template) {
    this.selectedCardSubject.next(null);
    this.selectedCardsSubject.next([]);
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
      template.markHashOutdated();
      this.cardStorageService.updateTemplate(template);
      const newKeys = this.getPlaceholderKeys(html);
      this.scheduleTemplateCardUpdate(template, oldKeys, newKeys);
    }
  }

  updateTemplateName(name: string) {
    const template = this.selectedTemplateSubject.value;
    if (template) {
      template.name = name;
      template.markHashOutdated();
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

  async flushPendingTemplateUpdates(): Promise<void> {
    const jobs = Array.from(this.templateUpdateJobs.values());
    if (jobs.length === 0) return;

    for (const job of jobs) {
      this.finishTemplateUpdateJob(job);
    }
  }

  private scheduleTemplateCardUpdate(template: Template, oldKeys: Set<string>, newKeys: Set<string>) {
    const job = this.createTemplateUpdateJob(template, oldKeys, newKeys);
    this.templateUpdateJobs.set(template.id, job);
    this.processTemplateUpdateBatch(job);
  }

  private createTemplateUpdateJob(template: Template, oldKeys: Set<string>, newKeys: Set<string>): TemplateUpdateJob {
    const removed = new Set([...oldKeys].filter(k => !newKeys.has(k)));
    const added = new Set([...newKeys].filter(k => !oldKeys.has(k)));

    const renameMap: { [oldKey: string]: string } = {};
    if (removed.size === 1 && added.size === 1) {
      const oldKey = [...removed][0];
      const newKey = [...added][0];
      renameMap[oldKey] = newKey;
    }

    const newDefaults: { [key: string]: string } = {};
    let match;
    this.placeholderRegex.lastIndex = 0;
    while ((match = this.placeholderRegex.exec(template.templateHtml)) !== null) {
      const key = match[1];
      const defaultVal = match[2] ?? match[0].split('=')[1].trim();
      newDefaults[key] = defaultVal;
    }

    const newTemplateHtml = template.templateHtml.replace(this.placeholderRegex, '{{$1}}');
    const allCards = this.cardStorageService.getAllCards().filter(c => c.templateId === template.id);

    return {
      token: ++this.templateUpdateToken,
      templateId: template.id,
      newTemplateHtml,
      newKeys,
      removed,
      renameMap,
      newDefaults,
      cards: allCards,
      index: 0,
      batchSize: this.templateUpdateBatchSize
    };
  }

  private processTemplateUpdateBatch(job: TemplateUpdateJob) {
    const currentJob = this.templateUpdateJobs.get(job.templateId);
    if (!currentJob || currentJob.token !== job.token) return;

    const batch = job.cards.slice(job.index, job.index + job.batchSize);
    if (batch.length === 0) {
      this.finishTemplateUpdateJob(job);
      return;
    }

    const updatedCards = batch.map(card => this.buildUpdatedCardFromTemplate(card, job));
    this.cardStorageService.updateCardsBatch(updatedCards, false);
    job.index += batch.length;

    if (job.index >= job.cards.length) {
      this.finishTemplateUpdateJob(job);
      return;
    }

    job.timerId = window.setTimeout(() => this.processTemplateUpdateBatch(job), 0);
  }

  private finishTemplateUpdateJob(job: TemplateUpdateJob) {
    const currentJob = this.templateUpdateJobs.get(job.templateId);
    if (!currentJob || currentJob.token !== job.token) return;

    if (job.timerId !== undefined) {
      clearTimeout(job.timerId);
    }

    if (job.index < job.cards.length) {
      const remaining = job.cards.slice(job.index);
      const updatedCards = remaining.map(card => this.buildUpdatedCardFromTemplate(card, job));
      this.cardStorageService.updateCardsBatch(updatedCards, false);
    }

    this.cardStorageService.commitCardChanges();
    this.templateUpdateJobs.delete(job.templateId);
  }

  private buildUpdatedCardFromTemplate(card: Card, job: TemplateUpdateJob): Card {
    const updatedVariables = { ...card.variables };
    const updatedFontSizes = { ...card.variableFontSizes };

    for (const [oldKey, newKey] of Object.entries(job.renameMap)) {
      if (updatedVariables[oldKey] !== undefined) {
        updatedVariables[newKey] = updatedVariables[oldKey];
        delete updatedVariables[oldKey];
      }
      if (updatedFontSizes[oldKey] !== undefined) {
        updatedFontSizes[newKey] = updatedFontSizes[oldKey];
        delete updatedFontSizes[oldKey];
      }
    }

    for (const key of job.newKeys) {
      if (updatedVariables[key] === undefined) {
        updatedVariables[key] = job.newDefaults[key];
      }
    }

    for (const key of job.removed) {
      if (!job.renameMap[key]) {
        delete updatedVariables[key];
        delete updatedFontSizes[key];
      }
    }

    return new Card(
      card.name,
      job.newTemplateHtml,
      card.templateId,
      card.canvasId,
      card.id,
      updatedVariables,
      updatedFontSizes,
      card.templateHash,
      card.hashValue,
      false,
      card.originalId
    );
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
      config?.distanceFromBorders ?? undefined,
      undefined,
      undefined,
      false
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
      canvasData.distanceFromBorders ?? undefined,
      undefined,
      undefined,
      false,
      canvasData.originalId ?? canvasData.id
    );

    const canvases = [...this.canvasesSubject.value, importedCanvas];
    this.canvasesSubject.next(canvases);
    this.cardStorageService.saveCanvases(canvases);

    const templates = Array.isArray(payload.templates) ? payload.templates : [];
    const templateIdMap = new Map<string, Template>();
    const templateOriginalIdMap = new Map<string, Template>();

    templates.forEach((t: any, index: number) => {
      const templateName = t?.name && t.name.trim().length > 0 ? t.name : `Imported Template ${index + 1}`;
      const templateHtml = t?.templateHtml ?? '';
      const templateVars = t?.variables ?? {};
      const newTemplate = this.cardStorageService.addTemplate(
        templateName,
        templateHtml,
        importedCanvas.id,
        t?.originalId ?? t?.id
      );
      newTemplate.variables = { ...templateVars };
      this.cardStorageService.updateTemplate(newTemplate);
      if (t?.id !== undefined && t?.id !== null) {
        templateIdMap.set(String(t.id), newTemplate);
      }
      if (newTemplate.originalId) {
        templateOriginalIdMap.set(String(newTemplate.originalId), newTemplate);
      }
    });

    const cards = Array.isArray(payload.cards) ? payload.cards : [];
    cards.forEach((c: any, index: number) => {
      const cardName = c?.name && c.name.trim().length > 0 ? c.name : `Imported Card ${index + 1}`;
      const cardHtml = c?.templateHtml ?? '';
      const cardVars = c?.variables ?? {};
      const cardFontSizes = c?.variableFontSizes ?? {};

      const templateIdKey = c?.templateId !== undefined && c?.templateId !== null ? String(c.templateId) : '';
      const templateOriginalKey = c?.templateOriginalId ?? c?.templateId;
      const mappedById = templateIdKey ? templateIdMap.get(templateIdKey) : undefined;
      const mappedByOriginal = templateOriginalKey ? templateOriginalIdMap.get(String(templateOriginalKey)) : undefined;

      const resolvedTemplate =
        mappedById ??
        mappedByOriginal ??
        this.cardStorageService.resolveTemplateForImport({
          templateId: c?.templateId,
          templateOriginalId: c?.templateOriginalId ?? c?.templateId,
          templateHash: c?.templateHash,
          templateHtml: cardHtml,
          templateName: c?.templateName,
          canvasId: importedCanvas.id
        });

      this.cardStorageService.addCard(
        cardName,
        cardHtml,
        resolvedTemplate.id,
        { ...cardVars },
        importedCanvas.id,
        { ...cardFontSizes },
        c?.originalId ?? c?.id
      );
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
        c.markHashOutdated();
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