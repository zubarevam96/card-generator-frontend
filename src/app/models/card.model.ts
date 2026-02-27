import { generateGuid, hashString, stableStringify } from '../shared/id-utils';

export class Card {
  id: string;
  name: string;
  templateHtml: string;
  variables: { [key: string]: string };
  variableFontSizes: { [key: string]: number };
  templateId: string; // Always required for cards - cards must be linked to a template
  canvasId: string; // Canvas this card belongs to
  hashValue: string;
  hashUpToDate: boolean;
  templateHash?: string;
  originalId: string;

  constructor(
    name: string,
    templateHtml: string,
    templateId: string,
    canvasId: string,
    id?: string,
    variables: { [key: string]: string } = {},
    variableFontSizes: { [key: string]: number } = {},
    templateHash?: string,
    hashValue?: string,
    hashUpToDate: boolean = true,
    originalId?: string
  ) {
    this.id = id ?? generateGuid();
    this.originalId = originalId ?? this.id;
    this.name = name;
    this.templateHtml = templateHtml;
    this.templateId = templateId;
    this.canvasId = canvasId;
    this.variables = { ...variables }; // Create a new object to ensure proper reference
    this.variableFontSizes = { ...variableFontSizes };
    this.templateHash = templateHash;
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
        variableFontSizes: this.variableFontSizes,
        templateId: this.templateId,
        canvasId: this.canvasId,
        templateHash: this.templateHash
      })
    );
  }

  get renderedHtml(): string {
    const placeholderRegex =
      /{{\s*([^{}\s=]+)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|(\d+)))?\s*}}/g;
    return this.templateHtml.replace(
      placeholderRegex,
      (
        match,
        key: string,
        doubleQuoted: string | undefined,
        singleQuoted: string | undefined,
        numeric: string | undefined
      ) => {
        const normalizedDefault = doubleQuoted ?? singleQuoted ?? numeric;
        const resolved = this.variables?.[key] ?? normalizedDefault ?? '';
        if (resolved === '') return '';

        const fontSize = this.variableFontSizes?.[key];
        if (fontSize === undefined || fontSize === null) {
          return resolved;
        }

        const lineHeight = Math.round(fontSize * 1.2) || fontSize || 12;
        const isBlockContent = /<\s*(div|p|ul|ol|li|table|tr|td|th|section|article|header|footer|h1|h2|h3|h4|h5|h6)[^>]*>/i.test(resolved);
        const tag = isBlockContent ? 'div' : 'span';
        const display = isBlockContent ? 'block' : 'inline-block';
        return `<${tag} style="font-size: ${fontSize}px; line-height: ${lineHeight}px; display: ${display};">${resolved}</${tag}>`;
      }
    );
  }
}