import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PropertiesBlockComponent } from './components/properties-block/properties-block.component';
import { CanvasBlockComponent } from './components/canvas-block/canvas-block.component';
import { TemplatesBlockComponent } from './components/templates-block/templates-block.component';
import { ImagesLibraryComponent } from '../images-library/images-library.component';

@Component({
  selector: 'app-generate',
  standalone: true,
  imports: [CommonModule, PropertiesBlockComponent, CanvasBlockComponent, TemplatesBlockComponent, ImagesLibraryComponent],
  templateUrl: './generate.component.html',
  styleUrls: ['./generate.component.css']
})
export class GenerateComponent {
  activeTab: 'canvas' | 'images' = 'canvas';
  
  showProperties = true;
  showTemplates = true;

  leftWidth = 320;
  rightWidth = 320;
  readonly collapsedRailWidth = 48;
  readonly dividerWidth = 8;
  readonly minSideWidth = 200;
  readonly maxSideWidth = 620;
  readonly minCenterWidth = 400;

  private draggingSide: 'left' | 'right' | null = null;
  private dragStartX = 0;
  private dragStartWidth = 0;

  get gridTemplateColumns(): string {
    const left = this.showProperties ? `${this.leftWidth}px` : `${this.collapsedRailWidth}px`;
    const right = this.showTemplates ? `${this.rightWidth}px` : `${this.collapsedRailWidth}px`;
    return `${left} ${this.dividerWidth}px 1fr ${this.dividerWidth}px ${right}`;
  }

  toggleProperties(): void {
    this.showProperties = !this.showProperties;

    if (!this.showProperties) {
      this.draggingSide = null;
    }
  }

  toggleTemplates(): void {
    this.showTemplates = !this.showTemplates;

    if (!this.showTemplates) {
      this.draggingSide = null;
    }
  }

  switchTab(tab: 'canvas' | 'images'): void {
    this.activeTab = tab;
  }

  startDrag(side: 'left' | 'right', event: MouseEvent): void {
    if ((side === 'left' && !this.showProperties) || (side === 'right' && !this.showTemplates)) {
      return;
    }

    this.draggingSide = side;
    this.dragStartX = event.clientX;
    this.dragStartWidth = side === 'left' ? this.leftWidth : this.rightWidth;
    event.preventDefault();
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (!this.draggingSide) {
      return;
    }

    const delta = event.clientX - this.dragStartX;
    const viewportWidth = window.innerWidth;
    const totalPadding = 24; // 12px padding on each side
    const availableWidth = viewportWidth - totalPadding - (this.dividerWidth * 2);

    if (this.draggingSide === 'left') {
      const newLeftWidth = this.dragStartWidth + delta;
      const currentRightWidth = this.showTemplates ? this.rightWidth : this.collapsedRailWidth;
      const remainingForCenter = availableWidth - newLeftWidth - currentRightWidth;
      
      // Ensure center has minimum width
      const maxAllowedLeft = availableWidth - currentRightWidth - this.minCenterWidth;
      this.leftWidth = this.clamp(newLeftWidth, this.minSideWidth, Math.min(this.maxSideWidth, maxAllowedLeft));
    } else {
      const rightDelta = this.dragStartX - event.clientX;
      const newRightWidth = this.dragStartWidth + rightDelta;
      const currentLeftWidth = this.showProperties ? this.leftWidth : this.collapsedRailWidth;
      const remainingForCenter = availableWidth - currentLeftWidth - newRightWidth;
      
      // Ensure center has minimum width
      const maxAllowedRight = availableWidth - currentLeftWidth - this.minCenterWidth;
      this.rightWidth = this.clamp(newRightWidth, this.minSideWidth, Math.min(this.maxSideWidth, maxAllowedRight));
    }
  }

  @HostListener('document:mouseup')
  onMouseUp(): void {
    this.draggingSide = null;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }
}
