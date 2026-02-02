import { generateGuid, hashString, stableStringify } from '../shared/id-utils';

export class Template {
  id: string;
  name: string;
  templateHtml: string;
  variables: { [key: string]: string };
  canvasId: string; // Canvas this template belongs to
  hashValue: string;
  hashUpToDate: boolean;

  constructor(
    name: string,
    templateHtml: string,
    canvasId: string,
    id?: string,
    variables: { [key: string]: string } = {},
    hashValue?: string,
    hashUpToDate: boolean = true
  ) {
    this.id = id ?? generateGuid();
    this.name = name;
    this.templateHtml = templateHtml;
    this.canvasId = canvasId;
    this.variables = { ...variables }; // Create a new object to ensure proper reference
    if (hashUpToDate) {
      this.hashValue = hashValue ?? this.computeHash();
      this.hashUpToDate = true;
    } else {
      this.hashValue = hashValue ?? '';
      this.hashUpToDate = false;
    }
  }

  get hash(): string {
    return this.hashValue;
  }

  refreshHash() {
    this.hashValue = this.computeHash();
    this.hashUpToDate = true;
  }

  markHashOutdated() {
    this.hashUpToDate = false;
  }

  private computeHash(): string {
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
