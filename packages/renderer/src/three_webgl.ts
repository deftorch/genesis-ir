import { IRDocument } from '@genesis/types';

/**
 * GeometryFactory maps mesh/primitive types to Three.js geometries.
 * @stability STABLE
 */
export const GeometryFactory = {
  create(primitive: string, params: Record<string, number> = {}): string {
    switch (primitive) {
      case 'sphere':
        return `new THREE.SphereGeometry(${params.radius ?? 0.5}, ${params.widthSegments ?? 32}, ${params.heightSegments ?? 16})`;
      case 'cylinder':
        return `new THREE.CylinderGeometry(${params.radiusTop ?? 0.5}, ${params.radiusBottom ?? 0.5}, ${params.height ?? 1}, ${params.radialSegments ?? 32})`;
      case 'cone':
        return `new THREE.ConeGeometry(${params.radius ?? 0.5}, ${params.height ?? 1}, ${params.radialSegments ?? 32})`;
      case 'torus':
        return `new THREE.TorusGeometry(${params.radius ?? 0.5}, ${params.tube ?? 0.2}, ${params.radialSegments ?? 16}, ${params.tubularSegments ?? 100})`;
      case 'plane':
        return `new THREE.PlaneGeometry(${params.width ?? 1}, ${params.height ?? 1})`;
      case 'capsule':
        return `new THREE.CapsuleGeometry(${params.radius ?? 0.5}, ${params.length ?? 1}, ${params.capSegments ?? 4}, ${params.radialSegments ?? 8})`;
      case 'box':
      default:
        return `new THREE.BoxGeometry(${params.width ?? 1}, ${params.height ?? 1}, ${params.depth ?? 1})`;
    }
  }
};

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

    // Default camera settings
    const fov = is3D && canvas3d.default_camera?.fov ? canvas3d.default_camera.fov : 75;
    const near = is3D && canvas3d.default_camera?.near_clip !== undefined ? canvas3d.default_camera.near_clip : 0.1;
    const far = is3D && canvas3d.default_camera?.far_clip !== undefined ? canvas3d.default_camera.far_clip : 1000;
    const posX = is3D && canvas3d.default_camera?.position?.x !== undefined ? canvas3d.default_camera.position.x : 0;
    const posY = is3D && canvas3d.default_camera?.position?.y !== undefined ? canvas3d.default_camera.position.y : 0;
    const posZ = is3D && canvas3d.default_camera?.position?.z !== undefined ? canvas3d.default_camera.position.z : 5;
    const lookAtX = is3D && canvas3d.default_camera?.look_at?.x !== undefined ? canvas3d.default_camera.look_at.x : 0;
    const lookAtY = is3D && canvas3d.default_camera?.look_at?.y !== undefined ? canvas3d.default_camera.look_at.y : 0;
    const lookAtZ = is3D && canvas3d.default_camera?.look_at?.z !== undefined ? canvas3d.default_camera.look_at.z : 0;

    // Build the objects setup code
    const objects = doc.objects || [];
    let meshesCode = '';
    objects.forEach((obj: any) => {
      if (obj.type === 'mesh_3d') {
        const materialId = obj.content?.material_id ?? obj.material_id;
        const matNode = objects.find((o: any) => o.id === materialId) as any;
        const style = (matNode?.style || {}) as any;
        const matColor = style.color || '#00ff00';
        
        // PBR / Material properties
        const roughness = style.roughness ?? 0.5;
        const metalness = style.metalness ?? 0.0;
        const opacity = style.opacity ?? 1.0;
        const transparent = opacity < 1.0 ? 'true' : 'false';
        const wireframe = style.wireframe ? 'true' : 'false';
        const matType = style.material_type || 
          (style.roughness !== undefined || style.metalness !== undefined ? 'standard' : 'phong');

        const matProps: string[] = [`color: '${matColor}'`];
        if (style.opacity !== undefined) {
          matProps.push(`opacity: ${opacity}`);
          matProps.push(`transparent: ${transparent}`);
        }
        if (style.wireframe !== undefined) {
          matProps.push(`wireframe: ${wireframe}`);
        }

        // Add support for emissive color
        if (style.emissive !== undefined) {
          matProps.push(`emissive: '${style.emissive}'`);
        }

        let materialClass = 'MeshPhongMaterial';
        if (matType === 'standard') {
          materialClass = 'MeshStandardMaterial';
          matProps.push(`roughness: ${roughness}`);
          matProps.push(`metalness: ${metalness}`);
        }

        // Coordinates & Transforms
        const x = obj.geometry?.x ?? obj.x ?? 0;
        const y = obj.geometry?.y ?? obj.y ?? 0;
        const z = obj.geometry?.z ?? obj.z ?? 0;
        const rotX = obj.geometry?.rotation_x ?? obj.rotation_x ?? 0;
        const rotY = obj.geometry?.rotation_y ?? obj.rotation_y ?? 0;
        const rotZ = obj.geometry?.rotation_z ?? obj.rotation_z ?? 0;
        const scaleX = obj.geometry?.scale_x ?? obj.scale_x ?? 1;
        const scaleY = obj.geometry?.scale_y ?? obj.scale_y ?? 1;
        const scaleZ = obj.geometry?.scale_z ?? obj.scale_z ?? 1;

        // Geometries - Use GeometryFactory and support mesh_type, primitive in content or root
        const primitive = obj.content?.primitive ?? obj.primitive ?? obj.geometry?.mesh_type ?? 'box';
        const params = obj.content?.primitive_params ?? obj.primitive_params ?? {};
        const geometryCode = GeometryFactory.create(primitive, params);

        meshesCode += `
        // Create mesh: ${obj.id}
        const geometry_${obj.id} = ${geometryCode};
        const material_${obj.id} = new THREE.${materialClass}({ ${matProps.join(', ')} });
        const mesh_${obj.id} = new THREE.Mesh(geometry_${obj.id}, material_${obj.id});
        mesh_${obj.id}.position.set(${x}, ${y}, ${z});
        mesh_${obj.id}.rotation.set(${rotX}, ${rotY}, ${rotZ});
        mesh_${obj.id}.scale.set(${scaleX}, ${scaleY}, ${scaleZ});
        mesh_${obj.id}.castShadow = ${shadows};
        mesh_${obj.id}.receiveShadow = ${shadows};
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
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r147/three.min.js"></script>
  <script src="https://unpkg.com/three@0.147.0/examples/js/controls/OrbitControls.js"></script>
</head>
<body>
  <script>
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('${bgColorHex}');

    const camera = new THREE.PerspectiveCamera(${fov}, ${width} / ${height}, ${near}, ${far});
    camera.position.set(${posX}, ${posY}, ${posZ});
    camera.lookAt(${lookAtX}, ${lookAtY}, ${lookAtZ});

    const renderer = new THREE.WebGLRenderer({ antialias: ${antialias} });
    renderer.setSize(${width}, ${height});
    renderer.shadowMap.enabled = ${shadows};
    document.body.appendChild(renderer.domElement);

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.set(${lookAtX}, ${lookAtY}, ${lookAtZ});

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
      controls.update();
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
