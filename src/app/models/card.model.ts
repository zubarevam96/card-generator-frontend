let nextCardId = 1;

export class Card {
  id: number;
  name: string;
  templateHtml: string;
  variables: { [key: string]: string };
  templateId: number; // Always required for cards - cards must be linked to a template
  canvasId: number; // Canvas this card belongs to

  constructor(
    name: string,
    templateHtml: string,
    templateId: number,
    id?: number,
    variables: { [key: string]: string } = {},
    canvasId: number = 1
  ) {
    if (id) {
      this.id = id;
      if (id >= nextCardId) nextCardId = id + 1; // keep counter in sync
    } else {
      this.id = nextCardId++;
    }
    this.name = name;
    this.templateHtml = templateHtml;
    this.templateId = templateId;
    this.canvasId = canvasId;
    this.variables = { ...variables }; // Create a new object to ensure proper reference
  }

  get renderedHtml(): string {
    let html = this.templateHtml;
    for (const [key, value] of Object.entries(this.variables)) {
      html = html.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    return html;
  }
}