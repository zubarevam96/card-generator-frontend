let nextCanvasId = 1;

export class Canvas {
    id: number;
    name: string;
    cardWidth: number;
    cardHeight: number;
    canvasWidth: number;
    canvasHeight: number;
    distanceBetweenCards: number
    distanceFromBorders: number;

    constructor(
        name: string = 'Canvas',
        cardWidth: number = 250,
        cardHeight: number = 350,
        canvasWidth: number = 595,
        canvasHeight: number = 842,
        distanceBetweenCards: number = 5,
        distanceFromBorders: number = 10,
        id?: number
    ) {
        if (id) {
            this.id = id;
            if (id >= nextCanvasId) nextCanvasId = id + 1;
        } else {
            this.id = nextCanvasId++;
        }
        this.name = name;
        this.cardWidth = cardWidth;
        this.cardHeight = cardHeight;
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.distanceBetweenCards = distanceBetweenCards;
        this.distanceFromBorders = distanceFromBorders;
    }
}
