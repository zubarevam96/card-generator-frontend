import { Injectable } from '@angular/core';
import { Card } from '../models/card.model';

const STORAGE_KEY = 'saved_cards';

@Injectable({ providedIn: 'root' })
export class CardStorageService {
  /** Load all cards from localStorage */
  loadCards(): Card[] {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    try {
      const parsed = JSON.parse(data) as Card[];
      // restore class instances if needed
      return parsed.map(c => new Card(c.name, c.html, c.id));
    } catch {
      return [];
    }
  }

  /** Save all cards to localStorage */
  saveCards(cards: Card[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
  }

  /** Clear storage completely */
  clearStorage(): void {
    localStorage.removeItem(STORAGE_KEY);
  }
}
