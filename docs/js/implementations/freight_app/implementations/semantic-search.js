import { t } from '../../kernel/core_abstractions/i18n/index.js';

// Same CDN + version pin as loadTransformers()'s dynamic import and download-models.mjs's WASM_BASE_URL.
const ONNX_WASM_CDN = 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.1/dist/';

let extractor = null;
let initPromise = null;
let transformersPromise = null;

// Lazy CDN import: keeps this module Node-ESM-loadable (no top-level https: import) while
// still fetching the real lib in the browser when the feature actually runs. Cached so the
// jsdelivr fetch happens once, not once per preloadModel()/getEmbedding() call.
function loadTransformers() {
    if (!transformersPromise) {
        transformersPromise = import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.1');
    }
    return transformersPromise;
}

// loader param is a test seam (default: real CDN loader) — do not pass it in production call sites.
export async function initPipeline(loader = loadTransformers) {
    const { pipeline, env } = await loader();

    // Static GitHub-Pages host bundles no models — load remotely at runtime instead of from a
    // local /models/ dir that's never populated in the served output.
    env.allowRemoteModels = true; // fetch models from HuggingFace at runtime
    env.allowLocalModels = false; // no local /models/ on a static deploy
    env.backends.onnx.wasm.wasmPaths = ONNX_WASM_CDN; // ONNX wasm backend from the same CDN as loadTransformers()
    env.useBrowserCache = true; // cache the fetched model in-browser so it's a one-time download per client

    const progressCallback = (info) => {
        // Only track the main model file so we don't spam the UI with multiple jobs
        if (!info.file || !info.file.endsWith('.onnx')) return;

        if (info.status === 'progress' || info.status === 'download') {
            const loadedMB = info.loaded ? (info.loaded / 1024 / 1024).toFixed(1) : 0;
            const totalMB = info.total ? (info.total / 1024 / 1024).toFixed(1) : 0;
            const sizeText = info.total ? ` (${loadedMB}MB / ${totalMB}MB)` : '';

            window.dispatchEvent(new CustomEvent('vdg:job-progress', {
                detail: {
                    id: 'ai-model-download',
                    name: t('bg_jobs.downloading_model', { file: 'Semantic Search Engine' }) + sizeText,
                    progress: info.progress || 0,
                    status: 'downloading'
                }
            }));
        }
    };

    try {
        console.log('[SemanticSearch] Loading Xenova/paraphrase-multilingual-MiniLM-L12-v2...'); // DEV
        extractor = await pipeline('feature-extraction', 'Xenova/paraphrase-multilingual-MiniLM-L12-v2', {
            quantized: true,
            progress_callback: progressCallback
        });
        
        // Dispatch final done when the entire pipeline is loaded
        window.dispatchEvent(new CustomEvent('vdg:job-progress', {
            detail: {
                id: 'ai-model-download',
                name: t('bg_jobs.downloading_model', { file: 'Semantic Search Engine' }),
                progress: 100,
                status: 'done'
            }
        }));
    } catch (e) {
        console.warn('[SemanticSearch] Failed to load multilingual model, falling back to MiniLM...', e); // DEV
        try {
            extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
                quantized: true,
                progress_callback: progressCallback
            });
            
            window.dispatchEvent(new CustomEvent('vdg:job-progress', {
                detail: {
                    id: 'ai-model-download',
                    name: t('bg_jobs.downloading_model', { file: 'Semantic Search Engine' }),
                    progress: 100,
                    status: 'done'
                }
            }));
        } catch (e2) {
            console.error('[SemanticSearch] Completely failed to load any model', e2); // DEV
            extractor = null;

            window.dispatchEvent(new CustomEvent('vdg:job-progress', {
                detail: {
                    id: 'ai-model-download',
                    name: t('bg_jobs.downloading_model', { file: 'Semantic Search Engine' }),
                    status: 'error',
                    error: 'Network error or model unavailable'
                }
            }));
        }
    }
}

export function preloadModel() {
    if (!initPromise && !extractor) {
        console.log('[SemanticSearch] Background pre-fetching model started...'); // DEV
        initPromise = initPipeline();
    }
}

// reinit param is a test seam (default: real initPipeline) — do not pass it in production call sites.
export async function getEmbedding(text, reinit = initPipeline) {
    if (!text || text.trim() === '') return null;

    // If we haven't even started loading, start it now
    if (!initPromise && !extractor) {
        initPromise = reinit();
    }
    
    // If the model is not ready yet (still downloading), DO NOT BLOCK.
    // Return null immediately so the hybrid search can gracefully fall back to BM25-only.
    if (!extractor) {
        return null;
    }
    
    // Generate embedding
    try {
        const output = await extractor(text, { pooling: 'mean', normalize: true });
        return Array.from(output.data);
    } catch(e) {
        console.warn('[SemanticSearch] Embedding generation failed', e); // DEV
        return null;
    }
}
