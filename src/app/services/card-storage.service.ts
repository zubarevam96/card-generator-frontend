import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Card } from '../models/card.model';

@Injectable({
  providedIn: 'root'
})
export class CardStorageService {
  private savedCardsSubject = new BehaviorSubject<Card[]>(this.loadFromStorage());
  savedCards$ = this.savedCardsSubject.asObservable();

  addCard(name: string, templateHtml: string, variables: { [key: string]: string } = {}) {
    const card = new Card(name, templateHtml, undefined, false, variables);
    const current = this.savedCardsSubject.value;
    this.savedCardsSubject.next([...current, card]);
    this.saveToStorage();
  }

  deleteCard(id: number) {
    const current = this.savedCardsSubject.value.filter(c => c.id !== id);
    this.savedCardsSubject.next(current);
    this.saveToStorage();
  }

  updateCard(updatedCard: Card) {
    const current = this.savedCardsSubject.value.map(c =>
      c.id === updatedCard.id
        ? new Card(updatedCard.name, updatedCard.templateHtml, updatedCard.id, updatedCard.isLocked, updatedCard.variables, updatedCard.templateId)
        : c
    );
    this.savedCardsSubject.next(current);
    this.saveToStorage();
  }

  getTemplateById(id: number): Card | undefined {
    return this.savedCardsSubject.value.find(c => c.id === id);
  }

  getSavedCards(): Card[] {
    return this.savedCardsSubject.value;
  }

  private saveToStorage() {
    localStorage.setItem('savedCards', JSON.stringify(this.savedCardsSubject.value));
  }

  private loadFromStorage(): Card[] {
    const stored = localStorage.getItem('savedCards');
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.map((c: any) => new Card(c.name, c.templateHtml || c.html, c.id, c.isLocked, c.variables || {}, c.templateId));
    }
    return [];
  }
}