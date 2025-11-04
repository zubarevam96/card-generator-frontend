import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Card } from '../models/card.model';
import { CardStorageService } from './card-storage.service';

@Injectable({ providedIn: 'root' })
export class CardService {
  private cardsSubject = new BehaviorSubject<Card[]>([]);
  cards$ = this.cardsSubject.asObservable();

  private selectedCardSubject = new BehaviorSubject<Card | null>(null);
  selectedCard$ = this.selectedCardSubject.asObservable();

  constructor(private storage: CardStorageService) {
    const saved = this.storage.loadCards();
    this.cardsSubject.next(saved);
  }

  addCard(name: string, html: string) {
    const newCard = new Card(name, html);
    const cards = [...this.cardsSubject.value, newCard];
    this.cardsSubject.next(cards);
    this.storage.saveCards(cards);
  }

  deleteCard(id: number) {
    const cards = this.cardsSubject.value.filter(c => c.id !== id);
    this.cardsSubject.next(cards);
    this.storage.saveCards(cards);

    if (this.selectedCardSubject.value?.id === id) {
      this.selectedCardSubject.next(null);
    }
  }

  selectCard(card: Card | null) {
    this.selectedCardSubject.next(card);
  }

  updateSelectedHtml(html: string) {
    const selected = this.selectedCardSubject.value;
    if (!selected) return;

    const updated = { ...selected, html };
    const updatedCards = this.cardsSubject.value.map(c =>
      c.id === selected.id ? updated : c
    );
    this.cardsSubject.next(updatedCards);
    this.selectedCardSubject.next(updated);
    this.storage.saveCards(updatedCards);
  }
}
