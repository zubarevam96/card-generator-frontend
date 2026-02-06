// src/app/generate/components/properties-block/properties-block.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardPropertiesComponent } from './card-properties/card-properties.component';
import { CanvasPropertiesComponent } from './canvas-properties/canvas-properties.component';
import { TemplatePropertiesComponent } from './template-properties/template-properties.component';
import { CanvasService } from '../../../services/canvas.service';
import { LoggingService } from '../../../services/logging.service';
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
  selectedCardsCount = 0;

  constructor(private canvasService: CanvasService, private loggingService: LoggingService) {
    this.canvasService.selectedCard$.subscribe(card => {
      this.selectedCard = card;
      this.loggingService.log('properties-block', 'debug', 'Selected card changed', {
        cardId: card?.id ?? null
      });
    });
    this.canvasService.selectedTemplate$.subscribe(template => {
      this.selectedTemplate = template;
      this.loggingService.log('properties-block', 'debug', 'Selected template changed', {
        templateId: template?.id ?? null
      });
    });
    this.canvasService.selectedCards$.subscribe(cards => {
      this.selectedCardsCount = cards.length;
      this.loggingService.log('properties-block', 'debug', 'Selected cards count changed', {
        count: cards.length
      });
    });
  }
}
