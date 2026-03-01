import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CanvasService } from '../../../../services/canvas.service';
import { Canvas } from '../../../../models/canvas.model';

// Conversion constants
const MM_TO_PX = 96 / 25.4; // 96 DPI -> px per mm = 96 / 25.4 = 3.779527559055118
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

@Component({
  selector: 'app-canvas-properties',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './canvas-properties.component.html'
})
export class CanvasPropertiesComponent {
  canvas: Canvas = new Canvas();
  // Computed A4 sizes in pixels (rounded)
  a4PortraitWidth = Math.round(A4_WIDTH_MM * MM_TO_PX);
  a4PortraitHeight = Math.round(A4_HEIGHT_MM * MM_TO_PX);
  a4LandscapeWidth = Math.round(A4_HEIGHT_MM * MM_TO_PX);
  a4LandscapeHeight = Math.round(A4_WIDTH_MM * MM_TO_PX);
  // Eurogame card presets in mm
  smallCardMm = { w: 41, h: 63 };
  mediumCardMm = { w: 45, h: 68 };
  largeCardMm = { w: 59, h: 92 };
  // MTG standard card preset in mm
  mtgCardMm = { w: 63, h: 88 };
  // Computed pixel sizes for presets
  smallCardWidth = Math.round(this.smallCardMm.w * MM_TO_PX);
  smallCardHeight = Math.round(this.smallCardMm.h * MM_TO_PX);
  mediumCardWidth = Math.round(this.mediumCardMm.w * MM_TO_PX);
  mediumCardHeight = Math.round(this.mediumCardMm.h * MM_TO_PX);
  largeCardWidth = Math.round(this.largeCardMm.w * MM_TO_PX);
  largeCardHeight = Math.round(this.largeCardMm.h * MM_TO_PX);
  mtgCardWidth = Math.round(this.mtgCardMm.w * MM_TO_PX);
  mtgCardHeight = Math.round(this.mtgCardMm.h * MM_TO_PX);

  constructor(private canvasService: CanvasService) {
    this.canvasService.canvas$.subscribe(
      c =>
        (this.canvas = new Canvas(
          c.name,
          c.cardWidth,
          c.cardHeight,
          c.canvasWidth,
          c.canvasHeight,
          c.distanceBetweenCards,
          c.distanceFromBorders,
          c.id
        ))
    );
  }

  updateCanvas() {
    this.canvasService.updateCanvas(this.canvas);
  }

  setA4Portrait() {
    // Use precise mm->px conversion
    this.canvas.canvasWidth = this.a4PortraitWidth;
    this.canvas.canvasHeight = this.a4PortraitHeight;
    this.updateCanvas();
  }

  setA4Landscape() {
    this.canvas.canvasWidth = this.a4LandscapeWidth;
    this.canvas.canvasHeight = this.a4LandscapeHeight;
    this.updateCanvas();
  }

  setEurogameSmall() {
    // 41mm × 63mm -> px
    this.canvas.cardWidth = this.smallCardWidth;
    this.canvas.cardHeight = this.smallCardHeight;
    this.updateCanvas();
  }

  setEurogameMedium() {
    // 45mm × 68mm -> px
    this.canvas.cardWidth = this.mediumCardWidth;
    this.canvas.cardHeight = this.mediumCardHeight;
    this.updateCanvas();
  }

  setEurogameLarge() {
    // 59mm × 92mm -> px
    this.canvas.cardWidth = this.largeCardWidth;
    this.canvas.cardHeight = this.largeCardHeight;
    this.updateCanvas();
  }

  setMtgStandard() {
    // 63mm × 88mm -> px
    this.canvas.cardWidth = this.mtgCardWidth;
    this.canvas.cardHeight = this.mtgCardHeight;
    this.updateCanvas();
  }
}
