import { IRDocument, IRNode } from '@genesis/types';
import { computeLayout, ComputedLayoutMap } from './layout.js';

/**
 * Render IRDocument to an HTML DOM structure (Interactive LIR).
 * Used for domains like 'interactive' or 'document' where logic/scripts are executable.
 * @stability BETA
 */
export function renderToHTMLDOM(doc: IRDocument): { html: string; scripts: string[] } {
  const layoutMap = computeLayout(doc);
  const nodes = doc.objects || [];
  const nodeMap = new Map<string, IRNode>();
  
  for (const node of nodes) {
    nodeMap.set(node.id, node);
  }

  // Identify roots
  const roots = nodes.filter(node => !node.parent_id || !nodeMap.has(node.parent_id));

  // Canvas size
  const width = (doc.canvas as any).width ?? 800;
  const height = (doc.canvas as any).height ?? 600;

  let htmlContent = '';
  const scripts: string[] = [];

  function renderNode(nodeId: string): string {
    const node = nodeMap.get(nodeId);
    const layout = layoutMap[nodeId];
    if (!node || !layout) return '';

    let contentStr = '';
    const style = node.style || {};
    
    // Convert absolute layout to CSS inline styles
    let css = `position: absolute; left: ${layout.x}px; top: ${layout.y}px; width: ${layout.width}px; height: ${layout.height}px;`;
    if (style.background_color) css += ` background-color: ${style.background_color};`;
    if (style.opacity !== undefined) css += ` opacity: ${style.opacity};`;
    
    // Inject i18n translation swap if needed
    let displayString = '';
    if (node.content && 'raw' in node.content) {
      displayString = (node.content as any).raw || '';
      if (doc.i18n_context) {
        const lang = doc.i18n_context.default_language;
        if (doc.i18n_context.translations[lang]?.[displayString]) {
          displayString = doc.i18n_context.translations[lang][displayString];
        }
      }
    }

    if (node.content) {
      const content = node.content;
      if (content.kind === 'code_runner_cell') {
        // Render a UI wrapper for the code cell and extract its logic into the scripts array
        const cellId = `code-cell-${node.id}`;
        contentStr = `<div id="${cellId}" class="gir-code-cell" style="${css} border: 1px solid #333; background: #1e1e1e; color: #d4d4d4; font-family: monospace; padding: 10px; overflow: auto; box-sizing: border-box;">
          <div class="gir-code-header" style="border-bottom: 1px solid #444; margin-bottom: 8px; padding-bottom: 4px; font-size: 12px;">Language: ${content.language}</div>
          <pre style="margin:0;"><code>${content.source_code}</code></pre>
          <div id="${cellId}-output" class="gir-code-output" style="margin-top: 10px; padding: 5px; background: #000; display: none;"></div>
        </div>`;
        
        if (content.auto_execute && content.language === 'javascript') {
          scripts.push(`
            // Sandboxed Execution for Node ${node.id}
            (function() {
              const outputEl = document.getElementById('${cellId}-output');
              try {
                // Simple eval block. In production this should be in an iframe sandbox.
                const result = eval(${JSON.stringify(content.source_code)});
                if (outputEl) {
                  outputEl.style.display = 'block';
                  outputEl.innerText = '> ' + String(result);
                }
              } catch (e) {
                if (outputEl) {
                  outputEl.style.display = 'block';
                  outputEl.style.color = 'red';
                  outputEl.innerText = 'Error: ' + e.message;
                }
              }
            })();
          `);
        }
      } else if (content.kind === 'logic_trigger') {
        // Invisible DOM element that attaches event listeners
        contentStr = `<div id="trigger-${node.id}" style="${css} cursor: pointer;" title="Logic Trigger"></div>`;
        if (content.action_type === 'execute_script' && content.payload) {
          const evt = content.event_type.replace('on_', '').toLowerCase();
          scripts.push(`
            document.getElementById('trigger-${node.id}')?.addEventListener('${evt}', function(e) {
              eval(${JSON.stringify(content.payload.script || '')});
            });
          `);
        }
      } else if (content.kind === 'text') {
        const fontSize = (style.font_size as number) ?? 16;
        const color = (style.fill as string) ?? '#000000';
        css += ` font-size: ${fontSize}px; color: ${color};`;
        contentStr = `<div id="node-${node.id}" style="${css}">${displayString}</div>`;
      } else if (content.kind === 'image') {
        contentStr = `<img id="node-${node.id}" src="${content.asset_id}" style="${css} object-fit: ${(content.fit === 'fit' ? 'contain' : 'cover')};" />`;
      } else {
        // Generic fallback wrapper for shapes or groups
        contentStr = `<div id="node-${node.id}" style="${css}"></div>`;
      }
    } else {
      contentStr = `<div id="node-${node.id}" style="${css}"></div>`;
    }

    let childrenStr = '';
    for (const childId of node.children || []) {
      childrenStr += renderNode(childId);
    }

    if (childrenStr && !contentStr.includes('</div>')) {
      // If it's a structural group node
      contentStr = `<div id="node-${node.id}" style="${css}">${childrenStr}</div>`;
    } else if (childrenStr) {
      // Append children inside the wrapper if it's a container like flex_container
      contentStr = contentStr.replace('</div>', `${childrenStr}</div>`);
    }

    return contentStr;
  }

  for (const root of roots) {
    htmlContent += renderNode(root.id);
  }

  const fullHtml = `<div class="gir-interactive-canvas" style="position: relative; width: ${width}px; height: ${height}px; background: #ffffff; overflow: hidden;">
    ${htmlContent}
  </div>`;

  return {
    html: fullHtml,
    scripts,
  };
}
