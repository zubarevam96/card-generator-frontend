let nextTemplateId = 1;

export class Template {
  id: number;
  name: string;
  templateHtml: string;
  variables: { [key: string]: string };

  constructor(
    name: string,
    templateHtml: string,
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
    this.variables = { ...variables }; // Create a new object to ensure proper reference
  }
}
