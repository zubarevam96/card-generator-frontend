export class Canvas {
    cardWidth: number;
    cardHeight: number;
    canvasWidth: number;
    canvasHeight: number;
    distanceBetweenCards: number

    constructor(cardWidth: number = 250,
            cardHeight: number = 350,
            canvasWidth: number = 595,
            canvasHeight: number = 842,
            distanceBetweenCards: number = 5) {
        this.cardWidth = cardWidth;
        this.cardHeight = cardHeight;
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.distanceBetweenCards = distanceBetweenCards;
    }
}
