import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Card } from '../models/card.model';
import { Canvas } from '../models/canvas.model';

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

  addCard(name: string, templateHtml: string, isLocked: boolean = false, variables: { [key: string]: string } = {}) {
    const card = new Card(name, templateHtml, undefined, isLocked, variables);
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
  }

  updateCanvas(canvas: Canvas) {
    this.canvasSubject.next(canvas);
  }
}