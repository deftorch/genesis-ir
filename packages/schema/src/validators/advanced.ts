import { ValidationResult, ValidationError } from './types.js';
import { validateSecretRef } from '@genesis/types';

export function validateAsset(asset: any): ValidationResult {
  const errors: ValidationError[] = [];

  if (!asset) {
    return { valid: false, errors: [{ path: '', message: 'Asset is null or undefined', keyword: 'required' }] };
  }

  if (!asset.asset_id) {
    errors.push({ path: 'asset_id', message: 'Asset asset_id is required', keyword: 'required' });
  }

  if (!asset.uri || typeof asset.uri !== 'string' || !asset.uri.startsWith('asset://')) {
    errors.push({ path: 'uri', message: 'Asset uri is required and must start with "asset://"', keyword: 'invalid-uri-scheme' });
  }

  if (!asset.checksum || typeof asset.checksum !== 'string' || asset.checksum.length !== 64) {
    errors.push({ path: 'checksum', message: 'Asset checksum is required and must be a valid SHA-256 hex string', keyword: 'invalid-checksum' });
  }

  if (!asset.type) {
    errors.push({ path: 'type', message: 'Asset type is required', keyword: 'required' });
  } else {
    const meta = asset.metadata || {};
    if (asset.type === 'image') {
      if (!meta.dimensions || typeof meta.dimensions.width !== 'number' || typeof meta.dimensions.height !== 'number') {
        errors.push({ path: 'metadata.dimensions', message: 'Image asset must specify dimensions in metadata', keyword: 'required-dimensions' });
      }
    } else if (asset.type === 'audio') {
      if (typeof meta.duration_ms !== 'number') {
        errors.push({ path: 'metadata.duration_ms', message: 'Audio asset must specify duration_ms in metadata', keyword: 'required-duration' });
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateTimeline(doc: any): ValidationResult {
  const errors: ValidationError[] = [];
  const timeline = doc.timeline;

  if (timeline) {
    if (typeof timeline.duration_ms !== 'number' || timeline.duration_ms <= 0) {
      errors.push({ path: 'timeline.duration_ms', message: 'Timeline duration_ms is required and must be greater than 0', keyword: 'invalid-duration' });
    }

    if (timeline.tracks) {
      if (!Array.isArray(timeline.tracks)) {
        errors.push({ path: 'timeline.tracks', message: 'Timeline tracks must be an array', keyword: 'invalid-tracks' });
      } else {
        timeline.tracks.forEach((track: any, idx: number) => {
          if (!track.clips || !Array.isArray(track.clips)) {
            errors.push({ path: `timeline.tracks[${idx}].clips`, message: 'Track clips must be an array', keyword: 'invalid-clips' });
            return;
          }
          if (track.allow_overlap === false) {
            const clips = track.clips;
            for (let i = 0; i < clips.length; i++) {
              for (let j = i + 1; j < clips.length; j++) {
                const c1 = clips[i];
                const c2 = clips[j];
                const overlap = c1.start_ms < c2.start_ms + c2.duration_ms && c2.start_ms < c1.start_ms + c1.duration_ms;
                if (overlap) {
                  errors.push({ path: `timeline.tracks[${idx}].clips`, message: `Clips "${c1.id}" and "${c2.id}" overlap on track "${track.id}" where overlap is disallowed`, keyword: 'clip-overlap' });
                }
              }
            }
          }
        });
      }
    }

    if (timeline.keyframes) {
      for (const [nodeId, keyframes] of Object.entries(timeline.keyframes)) {
        if (!Array.isArray(keyframes)) continue;
        keyframes.forEach((kf: any, idx: number) => {
          const prop = kf.property;
          const val = kf.value;
          if (['geometry.x', 'geometry.y', 'geometry.width', 'geometry.height', 'style.opacity'].includes(prop)) {
            if (typeof val !== 'number') {
              errors.push({ path: `timeline.keyframes.${nodeId}[${idx}].value`, message: `Type mismatch: property "${prop}" requires a number, received ${typeof val}`, keyword: 'type-mismatch' });
            }
          }
        });
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateDataBinding(doc: any): ValidationResult {
  const errors: ValidationError[] = [];
  const bindingsList: { path: string; binding: any }[] = [];

  if (doc.bindings && typeof doc.bindings === 'object') {
    for (const [key, b] of Object.entries(doc.bindings)) {
      bindingsList.push({ path: `bindings.${key}`, binding: b });
    }
  }

  if (doc.objects) {
    doc.objects.forEach((obj: any, idx: number) => {
      if (obj.bindings) {
        for (const [key, b] of Object.entries(obj.bindings)) {
          bindingsList.push({ path: `objects[${idx}].bindings.${key}`, binding: b });
        }
      }
    });
  }

  for (const { path, binding } of bindingsList) {
    if (!binding) continue;

    if (binding.source === 'api_rest' && !binding.endpoint) {
      errors.push({ path: `${path}.endpoint`, message: 'Endpoint is required for api_rest source', keyword: 'required-endpoint' });
    }

    if (binding.auth && binding.auth.token) {
      const token = binding.auth.token;
      if (!validateSecretRef(token)) {
        errors.push({ path: `${path}.auth.token`, message: 'Token must use env:, vault:, or secret: prefix', keyword: 'secret-ref-required' });
      }
    }

    if (binding.transforms && Array.isArray(binding.transforms)) {
      binding.transforms.forEach((tr: any, tIdx: number) => {
        if (tr.op === 'filter' && (!tr.params || typeof tr.params !== 'object' || Object.keys(tr.params).length === 0)) {
          errors.push({ path: `${path}.transforms[${tIdx}].params`, message: 'Params are required for filter transform operation', keyword: 'required-params' });
        }
      });
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateInteractionModel(doc: any): ValidationResult {
  const errors: ValidationError[] = [];
  const models: { path: string; model: any }[] = [];

  if (doc.interaction_model) {
    models.push({ path: 'interaction_model', model: doc.interaction_model });
  }
  if (doc.objects) {
    doc.objects.forEach((obj: any, idx: number) => {
      if (obj.interaction_model) {
        models.push({ path: `objects[${idx}].interaction_model`, model: obj.interaction_model });
      }
    });
  }

  for (const { path, model } of models) {
    if (!model || !model.states) continue;

    for (const [stateId, state] of Object.entries(model.states)) {
      const transitions = (state as any).transitions;
      if (transitions && Array.isArray(transitions)) {
        transitions.forEach((tr: any, trIdx: number) => {
          if (tr.actions && Array.isArray(tr.actions)) {
            tr.actions.forEach((act: any, actIdx: number) => {
              const actPath = `${path}.states.${stateId}.transitions[${trIdx}].actions[${actIdx}]`;
              if (['navigate', 'toggle_state', 'scroll_to'].includes(act.type)) {
                if (!act.target_id) {
                  errors.push({ path: `${actPath}.target_id`, message: `target_id is required for ${act.type} action`, keyword: 'required-target' });
                }
              } else if (act.type === 'play_animation') {
                if (!act.animation_id) {
                  errors.push({ path: `${actPath}.animation_id`, message: 'animation_id is required for play_animation action', keyword: 'required-animation' });
                }
              } else if (act.type === 'open_modal') {
                if (!act.modal_id) {
                  errors.push({ path: `${actPath}.modal_id`, message: 'modal_id is required for open_modal action', keyword: 'required-modal' });
                }
              }
            });
          }
        });
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
