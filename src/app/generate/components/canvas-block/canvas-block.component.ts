import { Component, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { CardService } from '../../../services/card.service';

@Component({
  selector: 'app-canvas-block',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './canvas-block.component.html',
  encapsulation: ViewEncapsulation.ShadowDom
})
export class CanvasBlockComponent {
    safeHtml: SafeHtml = '';

    constructor(private cardService: CardService, private sanitizer: DomSanitizer) {
    this.cardService.currentCard$.subscribe(card => {
        this.safeHtml = this.sanitizer.bypassSecurityTrustHtml(card?.html ?? '');
    });
    }
}
