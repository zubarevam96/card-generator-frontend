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
    this.canvas.canvasWidth = 595;
    this.canvas.canvasHeight = 842;
    this.updateCanvas();
  }

  setA4Landscape() {
    this.canvas.canvasWidth = 842;
    this.canvas.canvasHeight = 595;
    this.updateCanvas();
  }

  setEurogameSmall() {
    // 41mm × 63mm
    this.canvas.canvasWidth = 155;
    this.canvas.canvasHeight = 238;
    this.updateCanvas();
  }

  setEurogameMedium() {
    // 45mm × 68mm
    this.canvas.canvasWidth = 170;
    this.canvas.canvasHeight = 257;
    this.updateCanvas();
  }

  setEurogameLarge() {
    // 59mm × 92mm
    this.canvas.canvasWidth = 223;
    this.canvas.canvasHeight = 348;
    this.updateCanvas();
  }
}
