import { generateGuid, hashString, stableStringify } from '../shared/id-utils';

export class Canvas {
    id: string;
    name: string;
    cardWidth: number;
    cardHeight: number;
    canvasWidth: number;
    canvasHeight: number;
    distanceBetweenCards: number
    distanceFromBorders: number;
    hashValue: string;
    hashUpToDate: boolean;

    constructor(
        name: string = 'Canvas',
        cardWidth: number = 250,
        cardHeight: number = 350,
        canvasWidth: number = 595,
        canvasHeight: number = 842,
        distanceBetweenCards: number = 5,
        distanceFromBorders: number = 10,
        id?: string,
        hashValue?: string,
        hashUpToDate: boolean = true
    ) {
        this.id = id ?? generateGuid();
        this.name = name;
        this.cardWidth = cardWidth;
        this.cardHeight = cardHeight;
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.distanceBetweenCards = distanceBetweenCards;
        this.distanceFromBorders = distanceFromBorders;
        if (hashUpToDate) {
            this.hashValue = hashValue ?? this.computeHash();
            this.hashUpToDate = true;
        } else {
            this.hashValue = hashValue ?? '';
            this.hashUpToDate = false;
        }
    }

    get hash(): string {
        return this.hashValue;
    }

    refreshHash() {
        this.hashValue = this.computeHash();
        this.hashUpToDate = true;
    }

    markHashOutdated() {
        this.hashUpToDate = false;
    }

    private computeHash(): string {
        return hashString(
            stableStringify({
                name: this.name,
                cardWidth: this.cardWidth,
                cardHeight: this.cardHeight,
                canvasWidth: this.canvasWidth,
                canvasHeight: this.canvasHeight,
                distanceBetweenCards: this.distanceBetweenCards,
                distanceFromBorders: this.distanceFromBorders
            })
        );
    }
}
