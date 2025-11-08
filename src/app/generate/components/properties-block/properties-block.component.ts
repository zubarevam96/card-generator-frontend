// src/app/generate/components/properties-block/properties-block.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardPropertiesComponent } from './card-properties/card-properties.component';
import { CanvasPropertiesComponent } from './canvas-properties/canvas-properties.component';
import { CanvasService } from '../../../services/canvas.service';
import { Card } from '../../../models/card.model';

@Component({
  selector: 'app-properties-block',
  standalone: true,
  imports: [CommonModule, CardPropertiesComponent, CanvasPropertiesComponent],
  templateUrl: './properties-block.component.html',
  styleUrls: ['./properties-block.component.css']
})
export class PropertiesBlockComponent {
  selectedCard: Card | null = null;
  showCanvasProps = false;

  constructor(private canvasService: CanvasService) {
    this.canvasService.selectedCard$.subscribe(card => (this.selectedCard = card));
    this.canvasService.showCanvasProps$.subscribe(show => (this.showCanvasProps = show));
  }
}
