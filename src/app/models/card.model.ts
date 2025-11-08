let nextCardId = 1;

export class Card {
  id: number;
  name: string;
  html: string;
  isLocked: boolean;

  constructor(name: string, html: string, id?: number, isLocked: boolean = false) {
    if (id) {
      this.id = id;
      if (id >= nextCardId) nextCardId = id + 1; // keep counter in sync
    } else {
      this.id = nextCardId++;
    }
    this.name = name;
    this.html = html;
    this.isLocked = isLocked;
  }
}