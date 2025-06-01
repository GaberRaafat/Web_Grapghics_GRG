import {AxesHelper, Box3, BoxGeometry, Color, DoubleSide, GridHelper, MathUtils, Mesh, MeshBasicMaterial, OrthographicCamera, PerspectiveCamera, PlaneGeometry, Raycaster, Scene, Vector2, Vector3, WebGLRenderer} from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js'
import { Resizer } from '../resizer';
import type { IDocument } from './IDocument';
import type { ICommand } from '../commands/ICommand';
import { CreateWallCommand } from '../commands/CreateWallCommand';
import { ZoomFitCommand } from '../commands/ZoomFitCommand';

interface WallObject {
    wall: Mesh;
    outline: Mesh;
    dimensionLabel: HTMLDivElement;
    length: number;
}

class Document2D implements IDocument{
    container;
    scene;
    camera;
    controls;
    activeCommand:ICommand | null = null;
    wallCommand:CreateWallCommand;
    onWallCreated?: (start: Vector3, end: Vector3) => void;
    private raycaster: Raycaster;
    private mouse: Vector2;
    private walls: WallObject[] = [];
    private highlightedWall: WallObject | null = null;
    private selectedWall: WallObject | null = null;
     
    constructor(canvas:HTMLElement){
        this.container=canvas;
        this.scene=this.createScene();
        this.camera=this.createCamera();
        new Resizer(canvas,this.camera);
        this.controls=this.addControls();
        this.addCube();
        this.addGridHelper();
        document.addEventListener('mousedown',this.onMouseDown.bind(this)); 
        document.addEventListener('mouseup',this.onMouseUp.bind(this));
        document.addEventListener('mousemove',this.onMouseMove.bind(this));
        document.addEventListener('keydown', this.onKeyDown.bind(this));
        this.controls.addEventListener('change', this.updateDimensionLabels.bind(this));
        this.zoomFit();
        this.wallCommand = new CreateWallCommand(this);
        this.raycaster = new Raycaster();
        this.mouse = new Vector2();
    }

    private onKeyDown(e: KeyboardEvent) {
        if (e.key === 'Delete' && this.selectedWall) {
            this.deleteWall(this.selectedWall);
            this.selectedWall = null;
        }
    }

    private createDimensionLabel(length: number): HTMLDivElement {
        const label = document.createElement('div');
        label.className = 'dimension-label';
        label.textContent = `${length.toFixed(2)}m`;
        document.body.appendChild(label);
        return label;
    }

    private updateDimensionLabels() {
        this.walls.forEach(wallObj => {
            const wallPos = wallObj.wall.position.clone();
            // Project wall position to screen coordinates
            const screenPos = wallPos.project(this.camera);
            
            // Convert to pixel coordinates
            const x = (screenPos.x * 0.5 + 0.5) * this.container.clientWidth;
            const y = (-screenPos.y * 0.5 + 0.5) * this.container.clientHeight;

            // Update label position
            wallObj.dimensionLabel.style.left = `${x}px`;
            wallObj.dimensionLabel.style.top = `${y}px`;
        });
    }

    private deleteWall(wallObj: WallObject) {
        // Remove from scene
        this.scene.remove(wallObj.wall);
        this.scene.remove(wallObj.outline);
        
        // Remove dimension label
        wallObj.dimensionLabel.remove();
        
        // Remove from walls array
        const index = this.walls.indexOf(wallObj);
        if (index > -1) {
            this.walls.splice(index, 1);
        }

        // Dispose of geometries and materials
        wallObj.wall.geometry.dispose();
        wallObj.outline.geometry.dispose();
        if (wallObj.wall.material instanceof MeshBasicMaterial) {
            wallObj.wall.material.dispose();
        }
        if (wallObj.outline.material instanceof MeshBasicMaterial) {
            wallObj.outline.material.dispose();
        }
    }

    onMouseDown(e:MouseEvent){
        if (e.button === 0) { // Left click
            // Update mouse position for raycasting
            const rect = this.container.getBoundingClientRect();
            this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

            // Handle wall selection
            this.raycaster.setFromCamera(this.mouse, this.camera);
            const intersects = this.raycaster.intersectObjects(this.walls.map(w => w.wall));

            // Reset previously selected wall
            if (this.selectedWall && this.selectedWall.wall.material instanceof MeshBasicMaterial) {
                this.selectedWall.wall.material.color.setHex(0x333333);
                this.selectedWall = null;
            }

            // Select new wall
            if (intersects.length > 0) {
                const intersectedObject = intersects[0].object;
                if (intersectedObject instanceof Mesh) {
                    const wallObj = this.walls.find(w => w.wall === intersectedObject);
                    if (wallObj && wallObj.wall.material instanceof MeshBasicMaterial) {
                        wallObj.wall.material.color.setHex(0xff0000); // Red for selection
                        this.selectedWall = wallObj;
                    }
                }
            }
        }

        // Handle active command mouse down
        if (this.activeCommand) {
            this.activeCommand.onMouseDown(e);
        }
    }
    removeObject(obj:any){
        this.scene.remove(obj);
    }
     addObject(obj:any){
        this.scene.add(obj);
    }
    getBoundingClientRect( ){
     return this.container.getBoundingClientRect();
    }
    unproject(vec: Vector3){
        return vec.unproject(this.camera);
    }
    onMouseUp(e:MouseEvent){
        if (this.activeCommand) {
            this.activeCommand.onMouseUp(e);
        }
    }
    drawWall(start:Vector3,end:Vector3){
        var wallVec=new Vector2(end.x-start.x,end.y-start.y);
        var length=wallVec.length();
        var angle=Math.atan2(wallVec.y,wallVec.x);
        
        // Create the main wall geometry
        var geometry=new PlaneGeometry(length, 0.3);
        var material=new MeshBasicMaterial({
            color: 0x333333,
            side: DoubleSide,
            transparent: false,
        });
        
        var mesh=new Mesh(geometry,material);
        mesh.position.set(
            ((start.x+end.x)/2),
            ((start.y+end.y)/2),
            0
        );
        mesh.rotation.z=angle;
        
        // Add wall outline for better visibility
        var outlineGeometry = new PlaneGeometry(length, 0.35);
        var outlineMaterial = new MeshBasicMaterial({
            color: 0x000000,
            side: DoubleSide,
            transparent: true,
            opacity: 0.3,
        });
        
        var outline = new Mesh(outlineGeometry, outlineMaterial);
        outline.position.copy(mesh.position);
        outline.rotation.copy(mesh.rotation);
        outline.position.z = -0.01;
        
        // Create dimension label
        const dimensionLabel = this.createDimensionLabel(length);
        
        this.scene.add(outline);
        this.scene.add(mesh);

        // Create wall object and add to walls array
        const wallObj = { 
            wall: mesh, 
            outline: outline, 
            dimensionLabel: dimensionLabel,
            length: length 
        };
        this.walls.push(wallObj);

        // Update label position
        this.updateDimensionLabels();

        // Emit wall created event
        if (this.onWallCreated) {
            this.onWallCreated(start, end);
        }
    }
    onMouseMove(e:MouseEvent){
        // Update mouse position for raycasting
        const rect = this.container.getBoundingClientRect();
        this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        // Handle wall highlighting
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.walls.map(w => w.wall));

        // Reset previously highlighted wall
        if (this.highlightedWall && this.highlightedWall !== this.selectedWall && 
            this.highlightedWall.wall.material instanceof MeshBasicMaterial) {
            this.highlightedWall.wall.material.color.setHex(0x333333);
            this.highlightedWall = null;
        }

        // Highlight new wall
        if (intersects.length > 0) {
            const intersectedObject = intersects[0].object;
            if (intersectedObject instanceof Mesh) {
                const wallObj = this.walls.find(w => w.wall === intersectedObject);
                if (wallObj && wallObj !== this.selectedWall && 
                    wallObj.wall.material instanceof MeshBasicMaterial) {
                    wallObj.wall.material.color.setHex(0x4a90e2); // Highlight color
                    this.highlightedWall = wallObj;
                }
            }
        }

        // Handle active command mouse move
        if (this.activeCommand) {
            this.activeCommand.onMouseMove(e);
        }
    }
    zoomFit(offset=1.1){
    new ZoomFitCommand(this).execute(offset);
    }
    render(renderer:WebGLRenderer){
        this.controls.update();
        renderer.render(this.scene,this.camera);
        this.updateDimensionLabels();
    }
    addControls(){
        var controls=new OrbitControls(this.camera,this.container);
        controls.enablePan=true;
        controls.enableRotate=false;
        controls.update();
        return controls;
    }
    addCube(){
        var geometry=new BoxGeometry(1,1,1);
        var material=new MeshBasicMaterial({color:'red'});
        var mesh=new Mesh(geometry,material);
        this.scene.add(mesh);
    }
    addGridHelper(){
        var grid=new GridHelper(100,100);
        this.scene.add(grid);
        grid.rotation.x=MathUtils.degToRad(90);
        var axesHelper=new AxesHelper(2);
        this.scene.add(axesHelper);
    }
    createScene(){
        var scene=new Scene();
        scene.background=new Color('white');
        return scene;
    }
    createCamera(){
       
        const camera=new OrthographicCamera(
            this.container.clientWidth/-2,
            this.container.clientWidth/2,
            this.container.clientHeight/2,
            this.container.clientHeight/-2,
            .1,
            100
        );
        camera.position.set(0,0,10);
        return camera;
    }
    createRenderer(){
        var renderer=new WebGLRenderer({antialias:true});
        return renderer;
    }
    enableWallDrawing() {
        this.activeCommand = this.wallCommand;
    }
    disableWallDrawing() {
        this.activeCommand = null;
    }
    clearAllWalls() {
        // Remove all walls and their associated elements
        while (this.walls.length > 0) {
            const wallObj = this.walls[0];
            this.deleteWall(wallObj);
        }
        
        // Reset selection and highlighting
        this.selectedWall = null;
        this.highlightedWall = null;
    }
}

export {Document2D};