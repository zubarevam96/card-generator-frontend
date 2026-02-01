import { generateGuid, hashString, stableStringify } from '../shared/id-utils';

export class Template {
  id: string;
  name: string;
  templateHtml: string;
  variables: { [key: string]: string };
  canvasId: string; // Canvas this template belongs to

  constructor(
    name: string,
    templateHtml: string,
    canvasId: string,
    id?: string,
    variables: { [key: string]: string } = {}
  ) {
    this.id = id ?? generateGuid();
    this.name = name;
    this.templateHtml = templateHtml;
    this.canvasId = canvasId;
    this.variables = { ...variables }; // Create a new object to ensure proper reference
  }

  get hash(): string {
    return hashString(
      stableStringify({
        name: this.name,
        templateHtml: this.templateHtml,
        variables: this.variables,
        canvasId: this.canvasId
      })
    );
  }
}
