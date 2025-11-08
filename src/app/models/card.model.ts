let nextCardId = 1;

export class Card {
  id: number;
  name: string;
  templateHtml: string;
  variables: { [key: string]: string };
  isLocked: boolean;
  templateId?: number;

  constructor(
    name: string,
    templateHtml: string,
    id?: number,
    isLocked: boolean = false,
    variables: { [key: string]: string } = {},
    templateId?: number
  ) {
    if (id) {
      this.id = id;
      if (id >= nextCardId) nextCardId = id + 1; // keep counter in sync
    } else {
      this.id = nextCardId++;
    }
    this.name = name;
    this.templateHtml = templateHtml;
    this.isLocked = isLocked;
    this.variables = variables;
    this.templateId = templateId;
  }

  get renderedHtml(): string {
    let html = this.templateHtml;
    for (const [key, value] of Object.entries(this.variables)) {
      html = html.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    return html;
  }
}