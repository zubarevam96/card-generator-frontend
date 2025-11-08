import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Card } from '../models/card.model';
import { Canvas } from '../models/canvas.model';
import { CardStorageService } from './card-storage.service';

@Injectable({
  providedIn: 'root'
})
export class CanvasService {
  private cardsSubject = new BehaviorSubject<Card[]>([]);
  cards$ = this.cardsSubject.asObservable();

  private selectedCardSubject = new BehaviorSubject<Card | null>(null);
  selectedCard$ = this.selectedCardSubject.asObservable();

  private canvasSubject = new BehaviorSubject<Canvas>(new Canvas());
  canvas$ = this.canvasSubject.asObservable();

  private showCanvasPropsSubject = new BehaviorSubject<boolean>(false);
  showCanvasProps$ = this.showCanvasPropsSubject.asObservable();

  private selectedTemplateSubject = new BehaviorSubject<Card | null>(null);
  selectedTemplate$ = this.selectedTemplateSubject.asObservable();

  private placeholderRegex = /{{\s*([\w-]+)\s*=\s*(?:"([^"]*)"|\d+)\s*}}/g;

  constructor(private cardStorageService: CardStorageService) {}

  addCard(name: string, templateHtml: string, isLocked: boolean = false, variables: { [key: string]: string } = {}, templateId?: number) {
    const card = new Card(name, templateHtml, undefined, isLocked, variables, templateId);
    this.cardsSubject.next([...this.cardsSubject.value, card]);
  }

  deleteCard(id: number) {
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
    if (selected && !selected.isLocked) {
      selected.templateHtml = html;
      this.cardsSubject.next([...this.cardsSubject.value]);
    }
  }

  updateSelectedVariable(key: string, value: string) {
    const selected = this.selectedCardSubject.value;
    if (selected && selected.isLocked) {
      selected.variables[key] = value;
      this.cardsSubject.next([...this.cardsSubject.value]);
    }
  }

  showCanvasProperties() {
    this.selectedCardSubject.next(null);
    this.showCanvasPropsSubject.next(true);
    this.selectedTemplateSubject.next(null);
  }

  updateCanvas(canvas: Canvas) {
    this.canvasSubject.next(canvas);
  }

  editTemplate(template: Card) {
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
      this.cardStorageService.updateCard(template);
      const newKeys = this.getPlaceholderKeys(html);
      this.updateCardsFromTemplate(template, oldKeys, newKeys);
    }
  }

  updateTemplateName(name: string) {
    const template = this.selectedTemplateSubject.value;
    if (template) {
      template.name = name;
      this.cardStorageService.updateCard(template);
      // Optionally update linked card names, but skipping for now as cards have custom names
    }
  }

  getSelectedCard(): Card | null {
    return this.selectedCardSubject.value;
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

  private updateCardsFromTemplate(template: Card, oldKeys: Set<string>, newKeys: Set<string>) {
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

    // Update cards
    const currentCards = this.cardsSubject.value.map(card => {
      if (card.templateId === template.id) {
        const updatedVariables = { ...card.variables };

        // Handle renames
        for (const [oldKey, newKey] of Object.entries(renameMap)) {
          if (updatedVariables[oldKey] !== undefined) {
            updatedVariables[newKey] = updatedVariables[oldKey];
            delete updatedVariables[oldKey];
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
          }
        }

        return new Card(
          card.name,
          newTemplateHtml,
          card.id,
          card.isLocked,
          updatedVariables,
          card.templateId
        );
      }
      return card;
    });

    this.cardsSubject.next(currentCards);
  }
}