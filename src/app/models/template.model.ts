let nextTemplateId = 1;

export class Template {
  id: number;
  name: string;
  templateHtml: string;
  variables: { [key: string]: string };
  canvasId: number; // Canvas this template belongs to

  constructor(
    name: string,
    templateHtml: string,
    canvasId: number,
    id?: number,
    variables: { [key: string]: string } = {}
  ) {
    if (id) {
      this.id = id;
      if (id >= nextTemplateId) nextTemplateId = id + 1; // keep counter in sync
    } else {
      this.id = nextTemplateId++;
    }
    this.name = name;
    this.templateHtml = templateHtml;
    this.canvasId = canvasId;
    this.variables = { ...variables }; // Create a new object to ensure proper reference
  }
}
