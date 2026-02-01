import { generateGuid, hashString, stableStringify } from '../shared/id-utils';

export class Card {
  id: string;
  name: string;
  templateHtml: string;
  variables: { [key: string]: string };
  variableFontSizes: { [key: string]: number };
  templateId: string; // Always required for cards - cards must be linked to a template
  canvasId: string; // Canvas this card belongs to

  constructor(
    name: string,
    templateHtml: string,
    templateId: string,
    canvasId: string,
    id?: string,
    variables: { [key: string]: string } = {},
    variableFontSizes: { [key: string]: number } = {}
  ) {
    this.id = id ?? generateGuid();
    this.name = name;
    this.templateHtml = templateHtml;
    this.templateId = templateId;
    this.canvasId = canvasId;
    this.variables = { ...variables }; // Create a new object to ensure proper reference
    this.variableFontSizes = { ...variableFontSizes };
  }

  get hash(): string {
    return hashString(
      stableStringify({
        name: this.name,
        templateHtml: this.templateHtml,
        variables: this.variables,
        variableFontSizes: this.variableFontSizes,
        templateId: this.templateId,
        canvasId: this.canvasId
      })
    );
  }

  get renderedHtml(): string {
    let html = this.templateHtml;
    for (const [key, value] of Object.entries(this.variables)) {
      const fontSize = this.variableFontSizes?.[key];
      const replacement = fontSize !== undefined && fontSize !== null
        ? (() => {
            const lineHeight = Math.round(fontSize * 1.2) || fontSize || 12;
            const isBlockContent = /<\s*(div|p|ul|ol|li|table|tr|td|th|section|article|header|footer|h1|h2|h3|h4|h5|h6)[^>]*>/i.test(value);
            const tag = isBlockContent ? 'div' : 'span';
            const display = isBlockContent ? 'block' : 'inline-block';
            return `<${tag} style="font-size: ${fontSize}px; line-height: ${lineHeight}px; display: ${display};">${value}</${tag}>`;
          })()
        : value;
      html = html.replace(new RegExp(`{{${key}}}`, 'g'), replacement);
    }
    return html;
  }
}