import {AxesHelper, Box3, BoxGeometry, Color, DirectionalLight, ExtrudeGeometry, GridHelper, MathUtils, Mesh, MeshBasicMaterial, MeshStandardMaterial, OrthographicCamera, PerspectiveCamera, Plane, Raycaster, Scene, Shape, TextureLoader, Vector2, Vector3, WebGLRenderer, AmbientLight} from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js'
import { Resizer } from '../resizer';
import type { IDocument } from './IDocument';

export class Document3D implements IDocument{
    canvas;
    scene;
    camera;
    controls;
    walls: Mesh[] = [];
    private textureLoader: TextureLoader;

    constructor(canvas:HTMLElement){
        this.canvas=canvas;
        this.scene=this.createScene();
        this.camera=this.createCamera();
        new Resizer(canvas,this.camera);
        this.controls=this.addControls();
        this.addGridHelper();
        this.addLight();
        this.textureLoader = new TextureLoader();
    }

    onMouseUp(e: MouseEvent): void {}
    onMouseDown(e:MouseEvent): void {}
    onMouseMove(e:MouseEvent): void {}

    zoomFit(){
        if (this.walls.length === 0) {
            // Default camera position if no walls
            this.camera.position.set(20, 15, 20);
            this.camera.lookAt(0, 0, 0);
            this.controls.target.set(0, 0, 0);
        } else {
            const box = new Box3().setFromObject(this.scene);
            const size = box.getSize(new Vector3());
            const center = box.getCenter(new Vector3());

            // Calculate camera distance based on scene size
            const maxDim = Math.max(size.x, size.y, size.z);
            const distance = maxDim * 1.5;

            // Position camera at an angle
            this.camera.position.set(
                center.x + distance * 0.7,  // Slightly offset on X
                distance * 0.5,             // Higher up for better view
                center.z + distance * 0.7   // Slightly offset on Z
            );

            this.camera.lookAt(center);
            this.controls.target.copy(center);
        }
        
        this.controls.update();
    }

    render(renderer:WebGLRenderer){
        this.controls.update();
        renderer.render(this.scene,this.camera);
    }

    addLight(){
        // Add ambient light for better overall illumination
        const ambientLight = new AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        // Main directional light
        const mainLight = new DirectionalLight(0xffffff, 2);
        mainLight.position.set(5, 10, 5);
        mainLight.castShadow = true;
        this.scene.add(mainLight);

        // Secondary light for better wall definition
        const fillLight = new DirectionalLight(0xffffff, 1);
        fillLight.position.set(-5, 8, -5);
        fillLight.castShadow = true;
        this.scene.add(fillLight);
    }

    addControls(){
        var controls=new OrbitControls(this.camera,this.canvas);
        controls.enableDamping=true;
        controls.update();
        return controls;
    }

    addGridHelper(){
        var grid=new GridHelper(100,100);
        this.scene.add(grid);
        var axesHelper=new AxesHelper(2);
        this.scene.add(axesHelper);
    }

    createScene(){
        var scene=new Scene();
        scene.background=new Color('black');
        return scene;
    }

    createCamera(){
        const camera = new PerspectiveCamera(
            45,
            this.canvas.clientWidth/this.canvas.clientHeight,
            0.1,
            1000
        );
        camera.position.set(20, 15, 20);
        camera.lookAt(0, 0, 0);
        return camera;
    }

    createRenderer(){
        var renderer=new WebGLRenderer({antialias:true});
        return renderer;
    }
    
    createWall(start: Vector3, end: Vector3) {
        // Calculate wall dimensions
        const wallVec = new Vector2(end.x - start.x, end.y - start.y);
        const length = wallVec.length();
        const angle = Math.atan2(wallVec.y, wallVec.x);
        const height = 3; // Wall height in 3D

        // Create wall shape for horizontal orientation with vertical extrusion
        const shape = new Shape();
        shape.moveTo(-length/2, 0);      // Start at bottom left
        shape.lineTo(length/2, 0);       // Bottom right
        shape.lineTo(length/2, 0.3);     // Top right
        shape.lineTo(-length/2, 0.3);    // Top left
        shape.lineTo(-length/2, 0);      // Back to start

        const extrudeSettings = {
            steps: 1,
            depth: height,
            bevelEnabled: true,
            bevelThickness: 0.02,
            bevelSize: 0.01,
            bevelSegments: 3
        };

        // Create geometry and material
        const geometry = new ExtrudeGeometry(shape, extrudeSettings);
        
        // Rotate to make the extrusion go up
        geometry.rotateX(-Math.PI / 2);

        // Load all texture maps
        const textureURLs = {
            // Modern brick texture set
            diffuse: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/brick_diffuse.jpg',
            normal: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/brick_normal.jpg',
            roughness: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/brick_roughness.jpg',
            ao: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/brick_ao.jpg'
        };

        const textures = {
            diffuse: this.textureLoader.load(textureURLs.diffuse),
            normal: this.textureLoader.load(textureURLs.normal),
            roughness: this.textureLoader.load(textureURLs.roughness),
            ao: this.textureLoader.load(textureURLs.ao)
        };

        // Set texture properties
        Object.values(textures).forEach(texture => {
            texture.repeat.set(length / 2, height / 2);
            texture.wrapS = texture.wrapT = 1000;
        });

        // Create material with all texture maps
        const material = new MeshStandardMaterial({
            map: textures.diffuse,
            normalMap: textures.normal,
            normalScale: new Vector2(1, 1),
            roughnessMap: textures.roughness,
            roughness: 0.85,
            aoMap: textures.ao,
            aoMapIntensity: 1,
            metalness: 0.05,
            envMapIntensity: 1.0
        });

        // Create mesh and position it
        const wall = new Mesh(geometry, material);
        wall.castShadow = true;
        wall.receiveShadow = true;
        
        // Position the wall at grid level
        wall.position.set(
            (start.x + end.x) / 2,    // Center X
            0,                        // Place at grid level
            -(start.y + end.y) / 2    // Center Z
        );
        
        // Apply rotation after positioning
        wall.rotation.y = -angle;

        this.scene.add(wall);
        this.walls.push(wall);
    }

    removeAllWalls() {
        for (const wall of this.walls) {
            this.scene.remove(wall);
            wall.geometry.dispose();
            if (wall.material instanceof MeshStandardMaterial) {
                wall.material.map?.dispose();
                wall.material.normalMap?.dispose();
                wall.material.roughnessMap?.dispose();
                wall.material.aoMap?.dispose();
                wall.material.dispose();
            }
        }
        this.walls = [];
    }

    clearAllWalls() {
        // Remove all walls and clean up resources
        this.removeAllWalls();
    }
}
