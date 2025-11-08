import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Card } from '../models/card.model';

@Injectable({
  providedIn: 'root'
})
export class CardStorageService {
  private savedCardsSubject = new BehaviorSubject<Card[]>(this.loadFromStorage());
  savedCards$ = this.savedCardsSubject.asObservable();

  addCard(name: string, html: string) {
    const card = new Card(name, html);
    const current = this.savedCardsSubject.value;
    this.savedCardsSubject.next([...current, card]);
    this.saveToStorage();
  }

  deleteCard(id: number) {
    const current = this.savedCardsSubject.value.filter(c => c.id !== id);
    this.savedCardsSubject.next(current);
    this.saveToStorage();
  }

  private saveToStorage() {
    localStorage.setItem('savedCards', JSON.stringify(this.savedCardsSubject.value));
  }

  private loadFromStorage(): Card[] {
    const stored = localStorage.getItem('savedCards');
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.map((c: any) => new Card(c.name, c.html, c.id, c.isLocked));
    }
    return [];
  }
}