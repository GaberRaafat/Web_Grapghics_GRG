import { Vector3, Vector2, PlaneGeometry, MeshBasicMaterial, DoubleSide, Mesh } from "three";
import type { Document2D } from "../documents/Document2D";
import type { ICommand } from "./ICommand";

export class CreateWallCommand implements ICommand {
    document: Document2D;
    startPoint: Vector3 | null = null;
    endPoint: Vector3 | null = null;
    mouse: Vector2 = new Vector2();
    isDrawing: boolean = false;
    previewWall: Mesh | null = null;
    continuousMode: boolean = false;
    private keyDownHandler: (e: KeyboardEvent) => void;

    constructor(document: Document2D) {
        this.document = document;
        this.keyDownHandler = this.onKeyDown.bind(this);
        window.addEventListener('keydown', this.keyDownHandler);
    }

    cleanup() {
        window.removeEventListener('keydown', this.keyDownHandler);
        this.resetDrawing();
    }

    private onKeyDown(e: KeyboardEvent) {
        if (e.key === 'Escape' && this.isDrawing) {
            this.resetDrawing();
            this.document.disableWallDrawing();
        }
    }

    onMouseDown(e: MouseEvent) {
        if (e.button !== 0) return; // Only handle left click

        const rect = this.document.getBoundingClientRect();
        this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        
        if (!this.isDrawing) {
            // First click - set start point
            this.startPoint = this.document.unproject(new Vector3(this.mouse.x, this.mouse.y, 0));
            this.isDrawing = true;
        } else {
            const endPoint = this.document.unproject(new Vector3(this.mouse.x, this.mouse.y, 0));
            if (this.startPoint && endPoint.distanceTo(this.startPoint) > 0.1) {
                this.endPoint = endPoint;
                this.execute();
                
                if (e.shiftKey) {
                    this.startPoint = this.endPoint;
                    this.endPoint = null;
                } else {
                    this.resetDrawing();
                }
            }
        }
    }

    onMouseMove(e: MouseEvent) {
        const rect = this.document.getBoundingClientRect();
        this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        if (this.isDrawing && this.startPoint) {
            const currentPoint = this.document.unproject(new Vector3(this.mouse.x, this.mouse.y, 0));
            this.updatePreviewWall(currentPoint);
        }
    }

    onMouseUp(e: MouseEvent) {
        // We handle everything in onMouseDown now
    }

    private updatePreviewWall(currentPoint: Vector3) {
        if (!this.startPoint) return;

        const wallVec = new Vector2(
            currentPoint.x - this.startPoint.x,
            currentPoint.y - this.startPoint.y
        );
        const length = wallVec.length();
        const angle = Math.atan2(wallVec.y, wallVec.x);

        if (this.previewWall) {
            this.document.removeObject(this.previewWall);
            if (this.previewWall.geometry) {
                this.previewWall.geometry.dispose();
            }
            if (this.previewWall.material instanceof MeshBasicMaterial) {
                this.previewWall.material.dispose();
            }
            this.previewWall = null;
        }

        // Create new preview wall
        const geometry = new PlaneGeometry(length, 0.3);
        const material = new MeshBasicMaterial({
            color: 0x4a90e2,
            transparent: true,
            opacity: 0.5,
            side: DoubleSide
        });

        this.previewWall = new Mesh(geometry, material);
        this.previewWall.position.set(
            (this.startPoint.x + currentPoint.x) / 2,
            (this.startPoint.y + currentPoint.y) / 2,
            0
        );
        this.previewWall.rotation.z = angle;
        this.document.addObject(this.previewWall);
    }

    private resetDrawing() {
        this.isDrawing = false;
        this.startPoint = null;
        this.endPoint = null;
        this.continuousMode = false;
        
        if (this.previewWall) {
            this.document.removeObject(this.previewWall);
            if (this.previewWall.geometry) {
                this.previewWall.geometry.dispose();
            }
            if (this.previewWall.material instanceof MeshBasicMaterial) {
                this.previewWall.material.dispose();
            }
            this.previewWall = null;
        }
    }

    execute() {
        if (this.startPoint && this.endPoint) {
            this.document.drawWall(this.startPoint, this.endPoint);
        }
    }
}