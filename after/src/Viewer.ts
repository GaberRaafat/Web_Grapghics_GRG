import {AxesHelper, BoxGeometry, Color, GridHelper, MathUtils, Mesh, MeshBasicMaterial, OrthographicCamera, PerspectiveCamera, Scene, Vector2, Vector3, WebGLRenderer} from 'three';
import {Resizer} from './resizer';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js'
import { Document2D } from './documents/Document2D';
import type { IDocument } from './documents/IDocument';
import { Document3D } from './documents/Document3D';

interface WallData {
    type: 'wall';
    start: Vector3;
    end: Vector3;
    angle: number;
    length: number;
    id: string;
}

class Viewer{
    container;
    renderer;
    document2D:Document2D;
    document3D:Document3D;
    activeDocument:IDocument;
    lastWallStart?: Vector3;
    lastWallEnd?: Vector3;
    walls: WallData[] = [];
    private wallListElement: HTMLElement;

    constructor(container:HTMLElement){
        this.container=container;
   
        this.renderer=this.createRenderer();
        this.renderer.setSize(container.clientWidth,container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        container.append(this.renderer.domElement);
     
        this.document2D=new Document2D(this.renderer.domElement);
        this.document3D=new Document3D(this.renderer.domElement);
        this.activeDocument=this.document2D;

        this.wallListElement = document.getElementById('wallList') as HTMLElement;
        
        // Subscribe to wall creation events
        this.document2D.onWallCreated = (start: Vector3, end: Vector3) => {
            this.lastWallStart = start;
            this.lastWallEnd = end;
            
            // Calculate wall data
            const wallVec = new Vector2(end.x - start.x, end.y - start.y);
            const length = wallVec.length();
            const angle = Math.atan2(wallVec.y, wallVec.x);
            
            // Create wall data object with unique ID
            const wallData: WallData = {
                type: 'wall',
                start,
                end,
                angle,
                length,
                id: 'wall_' + Date.now()
            };
            
            // Add to walls array
            this.walls.push(wallData);
            
            // Update wall information display
            this.updateWallInformation();
            
            // Create wall in 3D view
            this.document3D.createWall(start, end);
        };

        document.addEventListener('mousedown',this.onMouseDown.bind(this)); 
        document.addEventListener('mouseup',this.onMouseUp.bind(this));
        document.addEventListener('mousemove',this.onMouseMove.bind(this));
    }

    render(){
        this.activeDocument.render(this.renderer);
    }

    setView(type:string){
        if(type=='2d'){
            this.activeDocument=this.document2D;
            // Show dimension labels and wall info panel
            const labels = document.querySelectorAll('.dimension-label');
            labels.forEach(label => {
                (label as HTMLElement).style.display = 'block';
            });
            const wallInfoPanel = document.querySelector('.wall-info-panel');
            if (wallInfoPanel instanceof HTMLElement) {
                wallInfoPanel.style.display = 'block';
            }
            this.document2D.zoomFit();
        }else{
            // Disable wall drawing when switching to 3D
            this.disableWallDrawing();
            // Hide dimension labels and wall info panel
            const labels = document.querySelectorAll('.dimension-label');
            labels.forEach(label => {
                (label as HTMLElement).style.display = 'none';
            });
            const wallInfoPanel = document.querySelector('.wall-info-panel');
            if (wallInfoPanel instanceof HTMLElement) {
                wallInfoPanel.style.display = 'none';
            }
            this.activeDocument=this.document3D;
            
            // Ensure proper camera positioning in 3D
            this.document3D.zoomFit();
        }
    }
  
    createRenderer(){
        var renderer=new WebGLRenderer({antialias:true});
        return renderer;
    }

    animate(){
         this.render();
    requestAnimationFrame(this.animate.bind(this));
    }
      onMouseDown(e:MouseEvent){
            this.activeDocument.onMouseDown(e);
    }
    onMouseUp(e:MouseEvent){
         this.activeDocument.onMouseUp(e);
    }
    onMouseMove(e:MouseEvent){
        this.activeDocument.onMouseMove(e);
    }
    zoomFit(){
        this.activeDocument.zoomFit();
    }

    enableWallDrawing() {
        if (this.activeDocument instanceof Document2D) {
            this.activeDocument.enableWallDrawing();
        }
    }

    disableWallDrawing() {
        if (this.activeDocument instanceof Document2D) {
            this.activeDocument.disableWallDrawing();
        }
    }

    private updateWallInformation() {
        if (!this.wallListElement) return;
        
        // Clear existing content
        this.wallListElement.innerHTML = '';
        
        // Add information for each wall
        this.walls.forEach((wall, index) => {
            const wallItem = document.createElement('div');
            wallItem.className = 'wall-item';
            wallItem.innerHTML = `
                <div class="wall-property">
                    <span class="property-label">Wall ${index + 1}</span>
                </div>
                <div class="wall-property">
                    <span class="property-label">Length</span>
                    <span class="property-value">${wall.length.toFixed(2)}m</span>
                </div>
                <div class="wall-property">
                    <span class="property-label">Angle</span>
                    <span class="property-value">${(wall.angle * 180 / Math.PI).toFixed(1)}°</span>
                </div>
                <div class="wall-property">
                    <span class="property-label">Start</span>
                    <span class="property-value">(${wall.start.x.toFixed(1)}, ${wall.start.y.toFixed(1)})</span>
                </div>
                <div class="wall-property">
                    <span class="property-label">End</span>
                    <span class="property-value">(${wall.end.x.toFixed(1)}, ${wall.end.y.toFixed(1)})</span>
                </div>
            `;
            this.wallListElement.appendChild(wallItem);
        });
    }

    clearAllWalls() {
        // Clear the walls array
        this.walls = [];
        
        // Update wall information display
        this.updateWallInformation();
        
        // Clear walls in both 2D and 3D views
        if (this.document2D instanceof Document2D) {
            this.document2D.clearAllWalls();
        }
        if (this.document3D instanceof Document3D) {
            this.document3D.clearAllWalls();
        }
    }
}

export {Viewer};