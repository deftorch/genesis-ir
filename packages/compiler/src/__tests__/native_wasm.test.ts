import { describe, it, expect } from 'vitest';
import { createIRDocument } from '@genesis/types';
import { nativeComputeLayout, runLayoutBenchmark } from '../native_wasm.js';

describe('Native WASM Compiler Fallbacks & Benchmarks', () => {
  const mockDoc = createIRDocument({
    domain: 'visual',
    canvas: {
      width: 800,
      height: 600,
      color_space: 'sRGB',
    },
  });

  mockDoc.objects = [
    {
      id: 'root-group',
      type: 'group',
      parent_id: null,
      children: ['child-1', 'child-2'],
      geometry: { x: 0, y: 0, width: 200, height: 200 },
    },
    {
      id: 'child-1',
      type: 'shape',
      parent_id: 'root-group',
      children: [],
      geometry: { x: 10, y: 20, width: 50, height: 50 },
    },
    {
      id: 'child-2',
      type: 'shape',
      parent_id: 'root-group',
      children: [],
      geometry: { x: 70, y: 20, width: 80, height: 100 },
    },
  ];

  it('nativeComputeLayout correctly resolves position top-down via fallback layouter', () => {
    const layout = nativeComputeLayout(mockDoc);

    expect(layout['root-group']).toBeDefined();
    expect(layout['child-1']).toBeDefined();
    expect(layout['child-2']).toBeDefined();

    // root-group width calculation from child geometries:
    // child-1: x=10, w=50 -> maxX=60
    // child-2: x=70, w=80 -> maxX=150
    // child-1: y=20, h=50 -> maxY=70
    // child-2: y=20, h=100 -> maxY=120
    // Since root-group type is group: width=150-10=140, height=120-20=100
    expect(layout['root-group'].width).toBe(140);
    expect(layout['root-group'].height).toBe(100);

    // child-1 absolute position: root_x + child_x = 0 + 10 = 10
    expect(layout['child-1'].x).toBe(10);
    expect(layout['child-1'].y).toBe(20);

    // child-2 absolute position: root_x + child_x = 0 + 70 = 70
    expect(layout['child-2'].x).toBe(70);
    expect(layout['child-2'].y).toBe(20);
  });

  it('runLayoutBenchmark reports execution speeds and multipliers', () => {
    const report = runLayoutBenchmark(mockDoc, 50);

    expect(report.jsDurationMs).toBeGreaterThanOrEqual(0);
    expect(report.wasmDurationMs).toBeGreaterThanOrEqual(0);
    expect(report.wasmSpeedupMultiplier).toBeGreaterThan(0);
    expect(typeof report.wasmAvailable).toBe('boolean');
  });
});
