import * as opentype from 'opentype.js';
import { parseSVG, makeAbsolute } from 'svg-path-parser';
import { IRFontSpec, IRGlyphContent } from '@genesis/types';

/**
 * Convert SVG path data to opentype.js Path, flipping y-axis.
 * OpenType y-axis grows upwards, SVG y-axis grows downwards.
 * Formula: y_ot = units_per_em - y_svg
 * @stability STABLE
 */
export function svgPathToOTPath(d: string, upm: number): opentype.Path {
  const path = new opentype.Path();
  const commands = parseSVG(d);
  makeAbsolute(commands);

  let currentX = 0;
  let currentY = 0;
  let prevX2 = 0;
  let prevY2 = 0;
  let lastCurveType: 'cubic' | 'quadratic' | null = null;

  for (const cmd of commands) {
    const code = cmd.code;
    switch (code) {
      case 'M': {
        const x = cmd.x;
        const y = upm - cmd.y;
        path.moveTo(x, y);
        currentX = cmd.x;
        currentY = cmd.y;
        lastCurveType = null;
        break;
      }
      case 'L': {
        const x = cmd.x;
        const y = upm - cmd.y;
        path.lineTo(x, y);
        currentX = cmd.x;
        currentY = cmd.y;
        lastCurveType = null;
        break;
      }
      case 'H': {
        const x = cmd.x;
        const y = upm - currentY;
        path.lineTo(x, y);
        currentX = cmd.x;
        lastCurveType = null;
        break;
      }
      case 'V': {
        const x = currentX;
        const y = upm - cmd.y;
        path.lineTo(x, y);
        currentY = cmd.y;
        lastCurveType = null;
        break;
      }
      case 'C': {
        const x1 = cmd.x1;
        const y1 = upm - cmd.y1;
        const x2 = cmd.x2;
        const y2 = upm - cmd.y2;
        const x = cmd.x;
        const y = upm - cmd.y;
        path.curveTo(x1, y1, x2, y2, x, y);
        prevX2 = cmd.x2;
        prevY2 = cmd.y2;
        currentX = cmd.x;
        currentY = cmd.y;
        lastCurveType = 'cubic';
        break;
      }
      case 'S': {
        let x1 = currentX;
        let y1 = currentY;
        if (lastCurveType === 'cubic') {
          x1 = 2 * currentX - prevX2;
          y1 = 2 * currentY - prevY2;
        }
        const x1_ot = x1;
        const y1_ot = upm - y1;
        const x2 = cmd.x2;
        const y2 = upm - cmd.y2;
        const x = cmd.x;
        const y = upm - cmd.y;
        path.curveTo(x1_ot, y1_ot, x2, y2, x, y);
        prevX2 = cmd.x2;
        prevY2 = cmd.y2;
        currentX = cmd.x;
        currentY = cmd.y;
        lastCurveType = 'cubic';
        break;
      }
      case 'Q': {
        const x1 = cmd.x1;
        const y1 = upm - cmd.y1;
        const x = cmd.x;
        const y = upm - cmd.y;
        path.quadTo(x1, y1, x, y);
        prevX2 = cmd.x1;
        prevY2 = cmd.y1;
        currentX = cmd.x;
        currentY = cmd.y;
        lastCurveType = 'quadratic';
        break;
      }
      case 'T': {
        let x1 = currentX;
        let y1 = currentY;
        if (lastCurveType === 'quadratic') {
          x1 = 2 * currentX - prevX2;
          y1 = 2 * currentY - prevY2;
        }
        const x1_ot = x1;
        const y1_ot = upm - y1;
        const x = cmd.x;
        const y = upm - cmd.y;
        path.quadTo(x1_ot, y1_ot, x, y);
        prevX2 = x1;
        prevY2 = y1;
        currentX = cmd.x;
        currentY = cmd.y;
        lastCurveType = 'quadratic';
        break;
      }
      case 'Z': {
        path.close();
        lastCurveType = null;
        break;
      }
    }
  }
  return path;
}

/**
 * Helper to calculate sfnt table checksum.
 */
function calculateTableChecksum(data: Buffer): number {
  let sum = 0;
  const len = data.length;
  const alignedLen = Math.ceil(len / 4) * 4;
  for (let i = 0; i < alignedLen; i += 4) {
    let val = 0;
    if (i < len) val |= data[i] << 24;
    if (i + 1 < len) val |= data[i + 1] << 16;
    if (i + 2 < len) val |= data[i + 2] << 8;
    if (i + 3 < len) val |= data[i + 3];
    sum = (sum + (val >>> 0)) >>> 0;
  }
  return sum;
}

interface TableRecord {
  tag: string;
  checksum: number;
  offset: number;
  length: number;
  data: Buffer;
}

/**
 * Inject a custom binary table into an OpenType/TrueType sfnt font buffer.
 * Correctly updates directory records, offsets, checksums, and the head checkSumAdjustment.
 */
export function injectTable(fontBuffer: Buffer, tag: string, tableData: Buffer): Buffer {
  const numTables = fontBuffer.readUInt16BE(4);
  const tables: TableRecord[] = [];

  for (let i = 0; i < numTables; i++) {
    const recordOffset = 12 + i * 16;
    const tableTag = fontBuffer.toString('ascii', recordOffset, recordOffset + 4);
    const checksum = fontBuffer.readUInt32BE(recordOffset + 4);
    const offset = fontBuffer.readUInt32BE(recordOffset + 8);
    const length = fontBuffer.readUInt32BE(recordOffset + 12);

    const data = Buffer.alloc(length);
    fontBuffer.copy(data, 0, offset, offset + length);

    tables.push({ tag: tableTag, checksum, offset, length, data });
  }

  const existingIdx = tables.findIndex(t => t.tag === tag);
  if (existingIdx !== -1) {
    tables.splice(existingIdx, 1);
  }

  tables.push({
    tag,
    checksum: calculateTableChecksum(tableData),
    offset: 0,
    length: tableData.length,
    data: tableData
  });

  tables.sort((a, b) => a.tag.localeCompare(b.tag));

  const newNumTables = tables.length;
  let currentOffset = 12 + newNumTables * 16;

  for (const table of tables) {
    while (currentOffset % 4 !== 0) {
      currentOffset++;
    }
    table.offset = currentOffset;
    currentOffset += table.length;
  }

  const headTable = tables.find(t => t.tag === 'head');
  if (headTable) {
    if (headTable.data.length >= 12) {
      headTable.data.writeUInt32BE(0, 8);
    }
    headTable.checksum = calculateTableChecksum(headTable.data);
  }

  const finalSize = Math.ceil(currentOffset / 4) * 4;
  const outBuf = Buffer.alloc(finalSize);

  outBuf.write('OTTO', 0, 'ascii');
  outBuf.writeUInt16BE(newNumTables, 4);
  const searchRange = Math.pow(2, Math.floor(Math.log2(newNumTables || 1))) * 16;
  outBuf.writeUInt16BE(searchRange, 6);
  const entrySelector = Math.floor(Math.log2(Math.pow(2, Math.floor(Math.log2(newNumTables || 1)))));
  outBuf.writeUInt16BE(entrySelector, 8);
  const rangeShift = (newNumTables * 16) - searchRange;
  outBuf.writeUInt16BE(rangeShift, 10);

  for (let i = 0; i < tables.length; i++) {
    const table = tables[i];
    const recordOffset = 12 + i * 16;

    outBuf.write(table.tag, recordOffset, 'ascii');
    outBuf.writeUInt32BE(table.checksum, recordOffset + 4);
    outBuf.writeUInt32BE(table.offset, recordOffset + 8);
    outBuf.writeUInt32BE(table.length, recordOffset + 12);

    table.data.copy(outBuf, table.offset);
  }

  const totalChecksum = calculateTableChecksum(outBuf);
  const checkSumAdjustment = (0xB1B0AFBA - totalChecksum) >>> 0;

  if (headTable) {
    outBuf.writeUInt32BE(checkSumAdjustment, headTable.offset + 8);
  }

  return outBuf;
}

/**
 * Build legacy format 0 kern table.
 */
export function buildKernTable(pairs: { left: number; right: number; value: number }[]): Buffer {
  const sortedPairs = [...pairs].sort((a, b) => {
    if (a.left !== b.left) return a.left - b.left;
    return a.right - b.right;
  });

  const nPairs = sortedPairs.length;
  const subtableLength = 14 + nPairs * 6;
  const totalLength = 4 + subtableLength;

  const buf = Buffer.alloc(totalLength);
  
  buf.writeUInt16BE(0, 0); // version 0
  buf.writeUInt16BE(1, 2); // nTables = 1

  buf.writeUInt16BE(0, 4); // subtable version 0
  buf.writeUInt16BE(subtableLength, 6);
  buf.writeUInt16BE(1, 8); // coverage

  buf.writeUInt16BE(nPairs, 10);
  const searchRange = Math.pow(2, Math.floor(Math.log2(nPairs || 1))) * 6;
  buf.writeUInt16BE(searchRange, 12);
  const entrySelector = Math.floor(Math.log2(Math.pow(2, Math.floor(Math.log2(nPairs || 1)))));
  buf.writeUInt16BE(entrySelector, 14);
  const rangeShift = (nPairs * 6) - searchRange;
  buf.writeUInt16BE(rangeShift, 16);

  let offset = 18;
  for (const pair of sortedPairs) {
    buf.writeUInt16BE(pair.left, offset);
    buf.writeUInt16BE(pair.right, offset + 2);
    buf.writeInt16BE(pair.value, offset + 4);
    offset += 6;
  }

  return buf;
}

/**
 * Compile IRFontSpec to standard binary OpenType font.
 * Includes mapping metrics, glyph paths, kerning pairs, and OpenType features (GSUB).
 * @stability STABLE
 */
export function compileFontSpec(
  spec: IRFontSpec,
  glyphs: IRGlyphContent[]
): ArrayBuffer {
  // Decision #10: units_per_em must be 1000 or 2048
  if (spec.units_per_em !== 1000 && spec.units_per_em !== 2048) {
    throw new Error('Invalid units_per_em: Must be either 1000 or 2048 (Decision #10)');
  }

  // Create .notdef glyph
  const notdefGlyph = new opentype.Glyph({
    name: '.notdef',
    unicode: 0,
    advanceWidth: 500,
    path: new opentype.Path(),
  });

  // Map glyph contents to opentype.Glyph instances
  const otGlyphs = glyphs.map(g => {
    const combinedPath = new opentype.Path();
    if (g.contours) {
      for (const contour of g.contours) {
        const otPath = svgPathToOTPath(contour.d, spec.units_per_em);
        combinedPath.commands.push(...otPath.commands);
      }
    }

    return new opentype.Glyph({
      name: g.glyph_name,
      unicode: g.unicode && g.unicode > 0 ? g.unicode : undefined,
      advanceWidth: g.advance_width,
      path: combinedPath,
    });
  });

  const allGlyphs = [notdefGlyph, ...otGlyphs];

  // Initialize opentype.js Font
  const font = new opentype.Font({
    familyName: spec.family_name,
    styleName: spec.style_name,
    unitsPerEm: spec.units_per_em,
    ascender: spec.metrics.ascender,
    descender: spec.metrics.descender,
    glyphs: allGlyphs,
  });

  // Build a map of glyph name -> index for lookups
  const glyphIndexMap = new Map<string, number>();
  allGlyphs.forEach((g, idx) => {
    if (g.name) {
      glyphIndexMap.set(g.name, idx);
    }
  });

  // Map OpenType features (GSUB) via font.substitution
  if (spec.opentype_features) {
    for (const feat of spec.opentype_features) {
      for (const rule of feat.rules) {
        // Map glyph names to their compiled indices
        const inputIndices = rule.input_glyphs.map(name => glyphIndexMap.get(name)).filter((idx): idx is number => idx !== undefined);
        const outputIndices = rule.output_glyphs.map(name => glyphIndexMap.get(name)).filter((idx): idx is number => idx !== undefined);

        if (inputIndices.length === 0 || outputIndices.length === 0) {
          continue;
        }

        if (rule.type === 'single_sub') {
          // Single substitution: maps 1 input glyph to 1 output glyph
          for (let i = 0; i < inputIndices.length; i++) {
            (font.substitution as any).addSingle(feat.tag, {
              sub: inputIndices[i],
              by: outputIndices[0]
            });
          }
        } else if (rule.type === 'ligature_sub') {
          // Ligature substitution: maps multiple input glyphs to 1 output glyph
          (font.substitution as any).addLigature(feat.tag, {
            sub: inputIndices,
            by: outputIndices[0]
          });
        } else if (rule.type === 'alternate_sub') {
          // Alternate substitution: maps 1 input glyph to multiple choices of output glyphs
          (font.substitution as any).addAlternate(feat.tag, {
            sub: inputIndices[0],
            by: outputIndices
          });
        }
      }
    }
  }

  // Generate the initial compiled font array buffer from opentype.js
  let fontBuffer: any = Buffer.from(font.toArrayBuffer());

  // Map Kerning pairs (GPOS / legacy kern table)
  if (spec.kerning_pairs && spec.kerning_pairs.length > 0) {
    // Expand kerning classes if defined
    const groupMap = new Map<string, { side: 'left' | 'right'; glyphs: string[] }>();
    if (spec.grid_groups) {
      for (const group of spec.grid_groups) {
        groupMap.set(group.name, { side: group.side, glyphs: group.glyphs });
      }
    }

    const resolvedPairs: { left: number; right: number; value: number }[] = [];

    for (const pair of spec.kerning_pairs) {
      // Resolve left items
      let leftGlyphs: string[] = [];
      const leftGroup = groupMap.get(pair.left_class);
      if (leftGroup) {
        leftGlyphs = leftGroup.glyphs;
      } else {
        leftGlyphs = [pair.left_class];
      }

      // Resolve right items
      let rightGlyphs: string[] = [];
      const rightGroup = groupMap.get(pair.right_class);
      if (rightGroup) {
        rightGlyphs = rightGroup.glyphs;
      } else {
        rightGlyphs = [pair.right_class];
      }

      for (const leftName of leftGlyphs) {
        const leftIdx = glyphIndexMap.get(leftName);
        if (leftIdx === undefined) continue;

        for (const rightName of rightGlyphs) {
          const rightIdx = glyphIndexMap.get(rightName);
          if (rightIdx === undefined) continue;

          resolvedPairs.push({
            left: leftIdx,
            right: rightIdx,
            value: pair.value
          });
        }
      }
    }

    if (resolvedPairs.length > 0) {
      // Generate binary kern table format 0 and inject it
      const kernTableData = buildKernTable(resolvedPairs);
      fontBuffer = injectTable(fontBuffer, 'kern', kernTableData);
    }
  }

  // Return as standard ArrayBuffer
  const finalArrayBuffer = new ArrayBuffer(fontBuffer.length);
  const view = new Uint8Array(finalArrayBuffer);
  view.set(fontBuffer);
  return finalArrayBuffer;
}
