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

  setA4Portrait() {
    // 210mm x 297mm at 96 DPI: 755 x 1123 px
    this.canvas.canvasWidth = 755;
    this.canvas.canvasHeight = 1123;
    this.updateCanvas();
  }

  setA4Landscape() {
    // 297mm x 210mm at 96 DPI: 1123 x 755 px
    this.canvas.canvasWidth = 1123;
    this.canvas.canvasHeight = 755;
    this.updateCanvas();
  }

  setEurogameSmall() {
    // 41mm × 63mm
    this.canvas.cardWidth = 155;
    this.canvas.cardHeight = 238;
    this.updateCanvas();
  }

  setEurogameMedium() {
    // 45mm × 68mm
    this.canvas.cardWidth = 170;
    this.canvas.cardHeight = 257;
    this.updateCanvas();
  }

  setEurogameLarge() {
    // 59mm × 92mm
    this.canvas.cardWidth = 223;
    this.canvas.cardHeight = 348;
    this.updateCanvas();
  }
}
