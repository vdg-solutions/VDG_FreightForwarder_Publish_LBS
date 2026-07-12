import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.1';
import { t } from '../i18n/index.js';

// Optimize for web environment with locally hosted models.
// Models are downloaded at build time (src/scripts/download-models.mjs) and served from
// /models/ (dist copies src/frontend/models → output/web/models). MUST allow local models
// or Transformers.js errors "both local and remote models are disabled".
// Models load from the Hugging Face CDN (public Xenova models) — the 118MB quantized ONNX exceeds
// GitHub Pages' 100MB/file limit, so it is NOT bundled. First run fetches + browser-caches it.
// env.remoteHost defaults to https://huggingface.co (allowed by the CSP in _headers).
env.allowLocalModels = false;
env.allowRemoteModels = true;
env.backends.onnx.wasm.wasmPaths = '/wasm/'; // serve WASM locally too
env.useBrowserCache = true;

let extractor = null;
let initPromise = null;

async function initPipeline() {
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

export async function getEmbedding(text) {
    if (!text || text.trim() === '') return null;
    
    // If we haven't even started loading, start it now
    if (!initPromise && !extractor) {
        initPromise = initPipeline();
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
