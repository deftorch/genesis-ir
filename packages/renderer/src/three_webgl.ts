import { IRDocument } from '@genesis/types';

/**
 * Three.js / WebGL Renderer Backend.
 * @stability BETA
 */
export class ThreeDWebGLRenderer {
  renderToHtml(doc: IRDocument): string {
    const canvas3d = doc.canvas as any;
    const is3D = canvas3d && canvas3d.canvas_type === '3d';
    
    const width = is3D ? canvas3d.width : 800;
    const height = is3D ? canvas3d.height : 600;
    const antialias = is3D ? canvas3d.render_settings?.antialiasing !== 'none' : true;
    const shadows = is3D ? !!canvas3d.render_settings?.shadows : false;
    
    // Background setting
    let bgColorHex = '#000000';
    if (is3D && canvas3d.background?.type === 'color') {
      bgColorHex = canvas3d.background.value;
    }

    // Default lighting settings
    const lightingType = is3D ? canvas3d.default_lighting?.type : 'unlit';
    const ambientColor = is3D ? canvas3d.default_lighting?.ambient_color : '#ffffff';
    const ambientIntensity = is3D ? canvas3d.default_lighting?.ambient_intensity : 1.0;

    // Build the objects setup code
    const objects = doc.objects || [];
    let meshesCode = '';
    objects.forEach((obj: any) => {
      if (obj.type === 'mesh_3d') {
        const materialId = obj.material_id;
        const matNode = objects.find((o: any) => o.id === materialId);
        const matColor = matNode?.style?.color || '#00ff00';
        
        meshesCode += `
        // Create mesh: ${obj.id}
        const geometry_${obj.id} = new THREE.BoxGeometry(1, 1, 1);
        const material_${obj.id} = new THREE.MeshPhongMaterial({ color: '${matColor}' });
        const mesh_${obj.id} = new THREE.Mesh(geometry_${obj.id}, material_${obj.id});
        mesh_${obj.id}.position.set(${obj.x || 0}, ${obj.y || 0}, ${obj.z || 0});
        scene.add(mesh_${obj.id});
        `;
      }
    });

    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Genesis 3D WebGL Render</title>
  <style>
    body { margin: 0; overflow: hidden; }
    canvas { width: ${width}px; height: ${height}px; display: block; }
  </style>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
</head>
<body>
  <script>
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('${bgColorHex}');

    const camera = new THREE.PerspectiveCamera(75, ${width} / ${height}, 0.1, 1000);
    camera.position.set(0, 0, 5);

    const renderer = new THREE.WebGLRenderer({ antialias: ${antialias} });
    renderer.setSize(${width}, ${height});
    renderer.shadowMap.enabled = ${shadows};
    document.body.appendChild(renderer.domElement);

    // Setup ambient light
    const ambientLight = new THREE.AmbientLight('${ambientColor}', ${ambientIntensity});
    scene.add(ambientLight);

    if ('${lightingType}' !== 'unlit') {
      const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
      dirLight.position.set(5, 10, 7);
      dirLight.castShadow = ${shadows};
      scene.add(dirLight);
    }

    ${meshesCode}

    function animate() {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    }
    animate();
  </script>
</body>
</html>
    `.trim();

    return html;
  }
}
