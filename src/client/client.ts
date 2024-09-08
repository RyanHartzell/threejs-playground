import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Trying to apply blur + gaussian noise + pixelate to lower resolution
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass';
import { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass';
import { BloomPass } from 'three/examples/jsm/postprocessing/BloomPass';
import { SSAARenderPass } from 'three/examples/jsm/postprocessing/SSAARenderPass';
import { RenderPixelatedPass } from 'three/examples/jsm/postprocessing/RenderPixelatedPass';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass';

// Should explore effects and passes from THIS library instead of the three-native ones which are inefficient and fairly slow
// import {BloomEffect, GaussianBlurPass, NoiseEffect} from 'postprocessing'

function main () {
    const myCanvas = document.getElementById("can") as HTMLCanvasElement;
    var cwidth = myCanvas.width
    var cheight = myCanvas.height

    const manager = new THREE.LoadingManager();
    const loader = new GLTFLoader(manager);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera( 10, window.innerWidth / window.innerHeight, 0.01, 20000 );
    camera.position.set(100, 0, 100);

    const renderer = new THREE.WebGLRenderer( {canvas: myCanvas} );
    renderer.setSize( cwidth, cheight );
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 2;
    // document.body.appendChild( renderer.domElement );

    const composer = new EffectComposer( renderer );

    const controls = new OrbitControls( camera, renderer.domElement );

    // const fakesun = new THREE.PointLight(0xFFFFFF, 100, 200, 20);
    // fakesun.visible = true;
    // fakesun.position.set(200, 0, 0);
    // scene.add(fakesun)

    const sun = new THREE.DirectionalLight( 0xFFFFFF, 20.);
    sun.castShadow = true;
    sun.position.set(1,0,0); // should update to be in X/Z plane
    scene.add( sun );

    // Load our NASA GLTF of our satellite (with PBR materials)
    let sat: THREE.Object3D;
    // loader.load( './../assets/ICESat2.glb', function ( gltf ) {
    loader.load( 'assets/ICESat2.glb', function ( gltf ) {
            sat = gltf.scene;

            sun.target = sat;

            scene.add( sat );
            scene.add( sun.target );

            camera.lookAt( sat.position );

        }, function (xhr) { console.log((xhr.loaded / xhr.total) * 100 + "% loaded"); } , function ( err ) { console.log("", err) }
    )

    // Wait to add to scene until we set it as the target of the directional light (sun)
    // scene.add(sat.scene);

    // Tester scene
    // const geometry = new THREE.SphereGeometry()
    // const material = new THREE.MeshPhongMaterial({
    //     color: 0x00ff00
    // })

    // const sphere = new THREE.Mesh(geometry, material)
    // scene.add(sphere)

    window.addEventListener('resize', onWindowResize, false)
    function onWindowResize() {
        cwidth = myCanvas.width
        cheight = myCanvas.height

        camera.aspect = cwidth / cheight
        camera.updateProjectionMatrix()
        renderer.setSize(cwidth, cheight)
        composer.render()
    }

    // window.addEventListener('click', onclick, false)
    // var clickcounter = 0;
    // function onclick() {
    //     console.log("click! " + clickcounter);
    //     (Math.floor(clickcounter % 2) == 0) ? camera.lookAt(sat.position) : camera.lookAt(fakesun.position);
    //     clickcounter += 1;
    // }

    function apply_basic_sensor_model() {
        // Maybe someday I'll write my own set of shaders for this part :)

        const renderPass = new SSAARenderPass( scene, camera );
        composer.addPass( renderPass );

        // blur
        const bokehPass = new BokehPass( scene, camera, {
            focus: 1,
            aperture: THREE.MathUtils.degToRad(camera.fov),
            maxblur: 0.0035
        } );
        composer.addPass( bokehPass )

        const effectFilm = new FilmPass(2.8);
        composer.addPass( effectFilm )

        const bloomPass = new BloomPass(0.8, 7, 1.1);
        composer.addPass( bloomPass )

        // pixelate (down sample raster to 20% of viewport width and height)
        // Too cartoonish, should instead just fix the redner output width and height directly (will be quicker to shade as well)
        // const renderPixelatedPass = new RenderPixelatedPass( 3, scene, camera );
        // composer.addPass( renderPixelatedPass );

        const outputPass = new OutputPass();
        composer.addPass( outputPass );
    }

    function animate() {
        requestAnimationFrame(animate)

        if ( sat ) {
            sat.rotation.x += 0.01
            sat.rotation.y += 0.005
        }

        controls.update();

        // use composer's render function
        composer.render();
    }

    // function render() {
    //     renderer.render(scene, camera)
    // }


    // Set up composer effect passes
    apply_basic_sensor_model()

    // Here's where we update our render with whatever has changed
    animate()
}

window.addEventListener('load', main)