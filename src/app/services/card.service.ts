import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Card } from '../models/card.model';
import { CardStorageService } from './card-storage.service';

@Injectable({ providedIn: 'root' })
export class CardService {
  private cardsSubject = new BehaviorSubject<Card[]>([]);
  cards$ = this.cardsSubject.asObservable();

  private currentCardSubject = new BehaviorSubject<Card | null>(null);
  currentCard$ = this.currentCardSubject.asObservable();

  constructor(private storage: CardStorageService) {
    // ✅ Load cards from localStorage on startup
    const savedCards = this.storage.loadCards();
    this.cardsSubject.next(savedCards);
  }

  addCard(name: string, html: string) {
    const newCard = new Card(name, html);
    const cards = [...this.cardsSubject.value, newCard];
    this.cardsSubject.next(cards);
    this.storage.saveCards(cards); // ✅ persist
  }

  deleteCard(id: number) {
    const cards = this.cardsSubject.value.filter(c => c.id !== id);
    this.cardsSubject.next(cards);
    this.storage.saveCards(cards); // ✅ persist
    if (this.currentCardSubject.value?.id === id) {
      this.currentCardSubject.next(null);
    }
  }

  loadCard(card: Card) {
    this.currentCardSubject.next(card);
  }

  updateCurrentHtml(html: string) {
    const current = this.currentCardSubject.value;
    if (current) {
      const updated = { ...current, html };
      this.currentCardSubject.next(updated);
      const cards = this.cardsSubject.value.map(c =>
        c.id === updated.id ? updated : c
      );
      this.cardsSubject.next(cards);
      this.storage.saveCards(cards); // ✅ persist on edit
    }
  }
}
