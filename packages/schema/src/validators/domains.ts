import { ValidationResult, ValidationError } from './types.js';

export function validatePhysicalAndPrint(doc: any): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const domain = doc.meta?.domain;
  const activeDomains = doc.meta?.active_domains || [];

  const isPrint = domain === 'print' || activeDomains.includes('print');
  const isPackaging = domain === 'packaging' || activeDomains.includes('packaging');
  const isSignage = domain === 'signage' || activeDomains.includes('signage');

  if (isPrint && doc.canvas && doc.canvas.dpi_sync_policy === 'strict') {
    const canvasDpi = doc.canvas.dpi;
    const physicalDpi = doc.physical?.dpi;
    if (typeof canvasDpi === 'number' && typeof physicalDpi === 'number' && canvasDpi !== physicalDpi) {
      errors.push({ path: 'canvas.dpi', message: `DPI mismatch: Canvas DPI (${canvasDpi}) does not match physical DPI (${physicalDpi})`, keyword: 'dpi-mismatch' });
    }
  }

  if (isPackaging) {
    const objects = doc.objects || [];
    const hasDieline = objects.some((obj: any) => obj.type === 'print_dieline');
    if (!hasDieline) {
      errors.push({ path: 'objects', message: "Packaging domain documents require at least one 'print_dieline' node", keyword: 'missing-dieline' });
    }
  }

  if (isSignage && doc.physical && typeof doc.physical.safe_zone_mm === 'number') {
    const safeZone = doc.physical.safe_zone_mm;
    const width = doc.physical.width_mm || doc.canvas?.width || 0;
    const height = doc.physical.height_mm || doc.canvas?.height || 0;
    const xMin = safeZone, xMax = width - safeZone, yMin = safeZone, yMax = height - safeZone;

    const objects = doc.objects || [];
    objects.forEach((obj: any, idx: number) => {
      const x = typeof obj.x === 'number' ? obj.x : 0;
      const y = typeof obj.y === 'number' ? obj.y : 0;
      const w = typeof obj.width === 'number' ? obj.width : 0;
      const h = typeof obj.height === 'number' ? obj.height : 0;
      if (x < xMin || (x + w) > xMax || y < yMin || (y + h) > yMax) {
        warnings.push({ path: `objects[${idx}]`, message: `Content area of node ${obj.id || idx} exceeds physical safe zone (${safeZone}mm)`, keyword: 'exceeds-safe-zone', severity: 'warning' });
      }
    });
  }

  const objects = doc.objects || [];
  objects.forEach((obj: any, idx: number) => {
    if (obj.type === 'print_bleed_guide' && (typeof obj.width !== 'number' || typeof obj.height !== 'number')) {
      errors.push({ path: `objects[${idx}]`, message: "print_bleed_guide node must have numerical width and height", keyword: 'invalid-bleed-guide' });
    }
    if (obj.type === 'print_safe_guide' && (typeof obj.width !== 'number' || typeof obj.height !== 'number')) {
      errors.push({ path: `objects[${idx}]`, message: "print_safe_guide node must have numerical width and height", keyword: 'invalid-safe-guide' });
    }
  });

  return { valid: errors.length === 0, errors, warnings };
}

export function validateDomainCompatibilities(doc: any): ValidationResult {
  const errors: ValidationError[] = [];
  const domain = doc.meta?.domain;
  const activeDomains = doc.meta?.active_domains || [];

  const has3D = domain === '3d' || activeDomains.includes('3d');
  const hasVisual = domain === 'visual' || activeDomains.includes('visual');
  if (hasVisual && has3D) {
    const canvas = doc.canvas;
    const is3DCanvas = canvas && ('camera_3d' in canvas || (canvas.context && canvas.context.type === '3d'));
    if (!is3DCanvas) {
      errors.push({ path: 'canvas', message: 'Visual domain cannot contain 3D domain without IR3DViewport canvas', keyword: 'invalid-3d-canvas' });
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validate3DViewportAndNodes(doc: any): ValidationResult {
  const errors: ValidationError[] = [];
  const domain = doc.meta?.domain;
  const activeDomains = doc.meta?.active_domains || [];
  const is3D = domain === '3d' || activeDomains.includes('3d') || (doc.canvas && doc.canvas.canvas_type === '3d');

  if (is3D) {
    const objects = doc.objects || [];
    const hasCamera3D = objects.some((obj: any) => obj.type === 'camera_3d');
    if (!hasCamera3D) {
      errors.push({ path: 'objects', message: 'IR3DViewport requires at least one camera_3d node', keyword: 'missing-camera_3d' });
    }

    objects.forEach((obj: any, idx: number) => {
      if (obj.type === 'mesh_3d') {
        const matId = obj.material_id;
        if (!matId) {
          errors.push({ path: `objects[${idx}].material_id`, message: `mesh_3d node '${obj.id || idx}' is missing material_id`, keyword: 'missing-material-id' });
        } else {
          const referencedNode = objects.find((o: any) => o.id === matId);
          if (!referencedNode || referencedNode.type !== 'material_3d') {
            errors.push({ path: `objects[${idx}].material_id`, message: `mesh_3d node '${obj.id || idx}' references an invalid material_id: '${matId}'`, keyword: 'invalid-material-id' });
          }
        }
      }
    });
  }

  return { valid: errors.length === 0, errors };
}

export function validateDocumentDomain(doc: any): ValidationResult {
  const errors: ValidationError[] = [];
  const objects = doc.objects || [];

  objects.forEach((obj: any, idx: number) => {
    if (obj.type === 'doc_heading') {
      const level = obj.level;
      if (typeof level !== 'number' || level < 1 || level > 6 || !Number.isInteger(level)) {
        errors.push({ path: `objects[${idx}].level`, message: `doc_heading '${obj.id || idx}' must have an integer level between 1 and 6, got ${level}`, keyword: 'invalid-heading-level' });
      }
    }
    if (obj.type === 'doc_list_item') {
      const parentId = obj.parent_id;
      if (parentId) {
        const parent = objects.find((o: any) => o.id === parentId);
        if (!parent || parent.type !== 'doc_list') {
          errors.push({ path: `objects[${idx}].parent_id`, message: `doc_list_item '${obj.id || idx}' must be inside a doc_list, but parent '${parentId}' is not a doc_list`, keyword: 'orphan-list-item' });
        }
      } else {
        errors.push({ path: `objects[${idx}].parent_id`, message: `doc_list_item '${obj.id || idx}' must have a parent_id pointing to a doc_list`, keyword: 'orphan-list-item' });
      }
    }
    if (obj.type === 'doc_code_block') {
      if (!obj.language || typeof obj.language !== 'string') {
        errors.push({ path: `objects[${idx}].language`, message: `doc_code_block '${obj.id || idx}' must have a language field`, keyword: 'missing-code-language' });
      }
    }
  });

  return { valid: errors.length === 0, errors };
}

export function validateDiagramDomain(doc: any): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const objects = doc.objects || [];
  const validBpmnTypes = ['start_event', 'end_event', 'task', 'gateway', 'intermediate_event', 'sub_process'];
  const objectIds = new Set(objects.map((o: any) => o.id));

  objects.forEach((obj: any, idx: number) => {
    if (obj.type === 'diagram_edge') {
      if (obj.source_id && !objectIds.has(obj.source_id)) {
        errors.push({ path: `objects[${idx}].source_id`, message: `diagram_edge '${obj.id || idx}' references non-existent source_id '${obj.source_id}'`, keyword: 'dangling-edge-ref' });
      }
      if (obj.target_id && !objectIds.has(obj.target_id)) {
        errors.push({ path: `objects[${idx}].target_id`, message: `diagram_edge '${obj.id || idx}' references non-existent target_id '${obj.target_id}'`, keyword: 'dangling-edge-ref' });
      }
    }
    if (obj.type === 'bpmn_element') {
      if (!obj.bpmn_type || !validBpmnTypes.includes(obj.bpmn_type)) {
        errors.push({ path: `objects[${idx}].bpmn_type`, message: `bpmn_element '${obj.id || idx}' has invalid bpmn_type '${obj.bpmn_type}'. Valid types: ${validBpmnTypes.join(', ')}`, keyword: 'invalid-bpmn-type' });
      }
    }
  });

  const edges = objects.filter((o: any) => o.type === 'diagram_edge');
  if (edges.length > 0) {
    const adjacency: Record<string, string[]> = {};
    for (const e of edges) {
      if (e.source_id && e.target_id) {
        if (!adjacency[e.source_id]) adjacency[e.source_id] = [];
        adjacency[e.source_id].push(e.target_id);
      }
    }

    const visited = new Set<string>();
    const recStack = new Set<string>();
    let hasCycle = false;

    function dfs(node: string): boolean {
      visited.add(node);
      recStack.add(node);
      for (const neighbor of (adjacency[node] || [])) {
        if (!visited.has(neighbor)) {
          if (dfs(neighbor)) return true;
        } else if (recStack.has(neighbor)) {
          return true;
        }
      }
      recStack.delete(node);
      return false;
    }

    for (const nodeId of Object.keys(adjacency)) {
      if (!visited.has(nodeId)) {
        if (dfs(nodeId)) {
          hasCycle = true;
          break;
        }
      }
    }

    if (hasCycle) {
      warnings.push({ path: 'objects', message: 'Cyclic reference detected in diagram graph edges', keyword: 'cyclic-graph', severity: 'warning' });
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function validateMusicDomain(doc: any): ValidationResult {
  const errors: ValidationError[] = [];
  const musicSpec = doc.music_spec;
  if (!musicSpec) return { valid: true, errors: [] };

  if (musicSpec.project) {
    const bpm = musicSpec.project.bpm;
    if (typeof bpm === 'number' && (bpm < 20 || bpm > 300)) {
      errors.push({ path: 'music_spec.project.bpm', message: `BPM must be between 20 and 300, got ${bpm}`, keyword: 'invalid-bpm-range' });
    }
  }

  const tracks = musicSpec.tracks || [];
  tracks.forEach((track: any, ti: number) => {
    const clips = track.clips || [];
    clips.forEach((clip: any, ci: number) => {
      const notes = clip.notes || [];
      notes.forEach((note: any, ni: number) => {
        if (typeof note.pitch === 'number' && (note.pitch < 0 || note.pitch > 127)) {
          errors.push({ path: `music_spec.tracks[${ti}].clips[${ci}].notes[${ni}].pitch`, message: `MIDI note pitch must be between 0 and 127, got ${note.pitch}`, keyword: 'invalid-midi-pitch' });
        }
      });
    });
  });

  const instruments = musicSpec.instruments || [];
  instruments.forEach((inst: any, ii: number) => {
    if (inst.type === 'synthesizer' && !inst.synth_params) {
      errors.push({ path: `music_spec.instruments[${ii}].synth_params`, message: `Synthesizer instrument '${inst.id || ii}' must have synth_params`, keyword: 'missing-synth-params' });
    }
  });

  const allEffects = [...(musicSpec.master_effects || []), ...tracks.flatMap((t: any) => t.effects || [])];
  allEffects.forEach((fx: any, fi: number) => {
    if (fx.type === 'reverb' && (fx.params === undefined || fx.params.room_size === undefined)) {
      errors.push({ path: `music_spec.effects[${fi}]`, message: `Reverb effect '${fx.id || fi}' must have room_size param`, keyword: 'missing-reverb-room-size' });
    }
  });

  return { valid: errors.length === 0, errors };
}

export function validatePixelDomain(doc: any): ValidationResult {
  const errors: ValidationError[] = [];
  const pixelSpec = doc.pixel_spec;
  if (!pixelSpec) return { valid: true, errors: [] };

  if (pixelSpec.canvas) {
    const pw = pixelSpec.canvas.pixel_width;
    if (typeof pw === 'number' && (pw < 8 || pw > 512)) {
      errors.push({ path: 'pixel_spec.canvas.pixel_width', message: `pixel_width must be between 8 and 512, got ${pw}`, keyword: 'invalid-pixel-width' });
    }
  }

  if (pixelSpec.palette && pixelSpec.palette.locked === true) {
    if (!pixelSpec.palette.colors || pixelSpec.palette.colors.length === 0) {
      errors.push({ path: 'pixel_spec.palette', message: 'Locked palette must have at least one color defined', keyword: 'locked-palette-empty' });
    }
  }

  const tags = pixelSpec.animation_tags || [];
  tags.forEach((tag: any, ti: number) => {
    if (typeof tag.from_frame === 'number' && typeof tag.to_frame === 'number') {
      if (tag.from_frame > tag.to_frame) {
        errors.push({ path: `pixel_spec.animation_tags[${ti}]`, message: `SpriteTag '${tag.id || ti}' has from_frame (${tag.from_frame}) > to_frame (${tag.to_frame})`, keyword: 'invalid-sprite-tag-range' });
      }
    }
  });

  const tilemaps = pixelSpec.tilemaps || [];
  tilemaps.forEach((tm: any, tmi: number) => {
    const expectedLen = (tm.map_width || 0) * (tm.map_height || 0);
    const layers = tm.layers || [];
    layers.forEach((layer: any, li: number) => {
      if (layer.data && Array.isArray(layer.data)) {
        if (layer.data.length !== expectedLen) {
          errors.push({ path: `pixel_spec.tilemaps[${tmi}].layers[${li}].data`, message: `TilemapLayer data length (${layer.data.length}) must equal map_width × map_height (${expectedLen})`, keyword: 'invalid-tilemap-data-length' });
        }
      }
    });
  });

  return { valid: errors.length === 0, errors };
}

export function validateFontDomain(doc: any): ValidationResult {
  const errors: ValidationError[] = [];
  const fontSpec = doc.font_spec;
  if (!fontSpec) return { valid: true, errors: [] };

  if (fontSpec.units_per_em !== undefined) {
    if (fontSpec.units_per_em !== 1000 && fontSpec.units_per_em !== 2048) {
      errors.push({ path: 'font_spec.units_per_em', message: `units_per_em must be exactly 1000 or 2048, got ${fontSpec.units_per_em}`, keyword: 'invalid-em-unit' });
    }
  }

  const gridGroupNames = new Set((fontSpec.grid_groups || []).map((g: any) => g.name));
  const kerningPairs = fontSpec.kerning_pairs || [];
  kerningPairs.forEach((pair: any, pi: number) => {
    if (pair.left_class && gridGroupNames.size > 0 && !gridGroupNames.has(pair.left_class)) {
      errors.push({ path: `font_spec.kerning_pairs[${pi}].left_class`, message: `Kerning pair left_class '${pair.left_class}' not found in grid_groups`, keyword: 'invalid-kerning-class' });
    }
    if (pair.right_class && gridGroupNames.size > 0 && !gridGroupNames.has(pair.right_class)) {
      errors.push({ path: `font_spec.kerning_pairs[${pi}].right_class`, message: `Kerning pair right_class '${pair.right_class}' not found in grid_groups`, keyword: 'invalid-kerning-class' });
    }
  });

  return { valid: errors.length === 0, errors };
}

export function validateMockupDomain(doc: any): ValidationResult {
  const errors: ValidationError[] = [];
  const mockupSpec = doc.mockup_spec;
  if (!mockupSpec) return { valid: true, errors: [] };

  const objectIds = new Set((doc.objects || []).map((o: any) => o.id));
  const devices = mockupSpec.devices || [];
  devices.forEach((device: any, di: number) => {
    if (device.screen_content_node_id && !objectIds.has(device.screen_content_node_id)) {
      errors.push({ path: `mockup_spec.devices[${di}].screen_content_node_id`, message: `Device '${device.id || di}' references non-existent screen_content_node_id '${device.screen_content_node_id}'`, keyword: 'invalid-screen-content-ref' });
    }
    if (mockupSpec.view_mode === '3d_perspective' && device.view_angle === 'custom') {
      if (!device.custom_rotation) {
        errors.push({ path: `mockup_spec.devices[${di}].custom_rotation`, message: `Device '${device.id || di}' with custom view_angle must have custom_rotation`, keyword: 'missing-custom-rotation' });
      }
    }
  });

  return { valid: errors.length === 0, errors };
}
