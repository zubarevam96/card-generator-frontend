// src/app/generate/components/properties-block/properties-block.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardPropertiesComponent } from './card-properties/card-properties.component';
import { CanvasPropertiesComponent } from './canvas-properties/canvas-properties.component';
import { TemplatePropertiesComponent } from './template-properties/template-properties.component';
import { CanvasService } from '../../../services/canvas.service';
import { Card } from '../../../models/card.model';
import { Template } from '../../../models/template.model';

@Component({
  selector: 'app-properties-block',
  standalone: true,
  imports: [CommonModule, CardPropertiesComponent, CanvasPropertiesComponent, TemplatePropertiesComponent],
  templateUrl: './properties-block.component.html',
  styleUrls: ['./properties-block.component.css']
})
export class PropertiesBlockComponent {
  selectedCard: Card | null = null;
  selectedTemplate: Template | null = null;

  constructor(private canvasService: CanvasService) {
    this.canvasService.selectedCard$.subscribe(card => (this.selectedCard = card));
    this.canvasService.selectedTemplate$.subscribe(template => (this.selectedTemplate = template));
  }
}
