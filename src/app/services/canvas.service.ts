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
      template.templateHtml = html;
      this.cardStorageService.updateCard(template);
      this.updateCardsFromTemplate(template);
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

  private updateCardsFromTemplate(template: Card) {
    const currentCards = this.cardsSubject.value.map(card => {
      if (card.templateId === template.id) {
        // Re-parse the new templateHtml
        const variables: { [key: string]: string } = {};
        let match;
        let newTemplateHtml = template.templateHtml;

        while ((match = this.placeholderRegex.exec(template.templateHtml)) !== null) {
          const key = match[1];
          const defaultVal = match[2] ?? match[0].split('=')[1].trim();
          variables[key] = defaultVal;
        }

        newTemplateHtml = template.templateHtml.replace(this.placeholderRegex, '{{$1}}');

        // Merge variables: keep existing values, add new defaults, remove obsolete
        const updatedVariables: { [key: string]: string } = {};
        for (const key of Object.keys(variables)) {
          updatedVariables[key] = card.variables[key] ?? variables[key];
        }

        // Create new card instance to trigger change detection
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