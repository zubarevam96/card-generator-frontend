import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CanvasService } from '../../../../services/canvas.service';
import { Canvas } from '../../../../models/canvas.model';

@Component({
  selector: 'app-canvas-properties',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './canvas-properties.component.html'
})
export class CanvasPropertiesComponent {
  canvas: Canvas = new Canvas();

  constructor(private canvasService: CanvasService) {
    this.canvasService.canvas$.subscribe(c => (this.canvas = { ...c }));
  }

  updateCanvas() {
    this.canvasService.updateCanvas(this.canvas);
  }
}
