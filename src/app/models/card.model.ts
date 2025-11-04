let nextCardId = 1;

export class Card {
  id: number;
  name: string;
  html: string;

  constructor(name: string, html: string, id?: number) {
    if (id) {
      this.id = id;
      if (id >= nextCardId) nextCardId = id + 1; // keep counter in sync
    } else {
      this.id = nextCardId++;
    }
    this.name = name;
    this.html = html;
  }
}
