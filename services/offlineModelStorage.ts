/**
 * GeoSick-AI IndexedDB Offline Model Storage Engine
 * 
 * Stores ~18MB ONNX model binaries and taxonomy metadata locally inside the browser.
 * Enables zero-latency inference and true offline edge capability with no cloud dependence.
 */

const DB_NAME = 'geosick_offline_db';
const DB_VERSION = 1;
const MODEL_STORE = 'models';
const METADATA_STORE = 'metadata';

export interface ModelCacheStatus {
    clinicalCached: boolean;
    clinicalSize: number;
    clinicalUpdated?: string;
    envCached: boolean;
    envSize: number;
    envUpdated?: string;
}

/**
 * Opens and initializes the IndexedDB database
 */
function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        if (typeof window === 'undefined' || !window.indexedDB) {
            reject(new Error('IndexedDB is not available in this environment.'));
            return;
        }

        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(MODEL_STORE)) {
                db.createObjectStore(MODEL_STORE, { keyPath: 'key' });
            }
            if (!db.objectStoreNames.contains(METADATA_STORE)) {
                db.createObjectStore(METADATA_STORE, { keyPath: 'key' });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Retrieves a model ArrayBuffer from IndexedDB
 */
export async function getModelFromCache(key: string): Promise<ArrayBuffer | null> {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(MODEL_STORE, 'readonly');
            const store = tx.objectStore(MODEL_STORE);
            const req = store.get(key);

            req.onsuccess = () => {
                if (req.result && req.result.buffer instanceof ArrayBuffer) {
                    resolve(req.result.buffer);
                } else {
                    resolve(null);
                }
            };
            req.onerror = () => reject(req.error);
        });
    } catch (e) {
        console.warn(`[IndexedDB] Error fetching model '${key}':`, e);
        return null;
    }
}

/**
 * Saves a model ArrayBuffer into IndexedDB
 */
export async function saveModelToCache(key: string, buffer: ArrayBuffer): Promise<void> {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(MODEL_STORE, 'readwrite');
            const store = tx.objectStore(MODEL_STORE);
            const req = store.put({
                key,
                buffer,
                byteSize: buffer.byteLength,
                updated: Date.now()
            });

            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    } catch (e) {
        console.warn(`[IndexedDB] Error caching model '${key}':`, e);
    }
}

/**
 * Checks if a specific model is cached
 */
export async function isModelInCache(key: string): Promise<boolean> {
    try {
        const db = await openDB();
        return new Promise((resolve) => {
            const tx = db.transaction(MODEL_STORE, 'readonly');
            const store = tx.objectStore(MODEL_STORE);
            const req = store.count(key);
            req.onsuccess = () => resolve(req.result > 0);
            req.onerror = () => resolve(false);
        });
    } catch {
        return false;
    }
}

/**
 * Retrieves cached metadata (e.g. class mappings)
 */
export async function getMetadataFromCache<T>(key: string): Promise<T | null> {
    try {
        const db = await openDB();
        return new Promise((resolve) => {
            const tx = db.transaction(METADATA_STORE, 'readonly');
            const store = tx.objectStore(METADATA_STORE);
            const req = store.get(key);
            req.onsuccess = () => resolve(req.result ? req.result.data : null);
            req.onerror = () => resolve(null);
        });
    } catch {
        return null;
    }
}

/**
 * Saves metadata into IndexedDB
 */
export async function saveMetadataToCache(key: string, data: any): Promise<void> {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(METADATA_STORE, 'readwrite');
            const store = tx.objectStore(METADATA_STORE);
            const req = store.put({
                key,
                data,
                updated: Date.now()
            });
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    } catch (e) {
        console.warn(`[IndexedDB] Error saving metadata '${key}':`, e);
    }
}

/**
 * Loads a model from cache, or fetches from URL with progress reporting and writes to cache
 */
export async function loadOrFetchModel(
    key: string,
    url: string,
    onProgress?: (progressPercent: number) => void
): Promise<ArrayBuffer> {
    // 1. Try cache first
    const cachedBuffer = await getModelFromCache(key);
    if (cachedBuffer) {
        if (onProgress) onProgress(100);
        return cachedBuffer;
    }

    // 2. Fetch from network
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to download model from ${url} (Status ${response.status})`);
    }

    const contentLength = response.headers.get('content-length');
    const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;

    if (!response.body || totalBytes === 0) {
        // Fallback for non-streamable responses
        const buffer = await response.arrayBuffer();
        await saveModelToCache(key, buffer);
        if (onProgress) onProgress(100);
        return buffer;
    }

    // Stream with progress
    const reader = response.body.getReader();
    let receivedBytes = 0;
    const chunks: Uint8Array[] = [];

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
            chunks.push(value);
            receivedBytes += value.length;
            if (onProgress && totalBytes > 0) {
                const pct = Math.min(99, Math.round((receivedBytes / totalBytes) * 100));
                onProgress(pct);
            }
        }
    }

    // Assemble final buffer
    const allChunks = new Uint8Array(receivedBytes);
    let position = 0;
    for (const chunk of chunks) {
        allChunks.set(chunk, position);
        position += chunk.length;
    }

    const finalBuffer = allChunks.buffer;

    // Cache asynchronously
    await saveModelToCache(key, finalBuffer);
    if (onProgress) onProgress(100);

    return finalBuffer;
}

/**
 * Returns cache status and storage footprints for both models
 */
export async function getModelCacheStatus(): Promise<ModelCacheStatus> {
    try {
        const db = await openDB();
        return new Promise((resolve) => {
            const tx = db.transaction(MODEL_STORE, 'readonly');
            const store = tx.objectStore(MODEL_STORE);
            const getAllReq = store.getAll();

            getAllReq.onsuccess = () => {
                const items = getAllReq.result || [];
                const clinicalItem = items.find((i: any) => i.key === 'clinical_onnx');
                const envItem = items.find((i: any) => i.key === 'environmental_onnx');

                resolve({
                    clinicalCached: !!clinicalItem,
                    clinicalSize: clinicalItem ? clinicalItem.byteSize : 0,
                    clinicalUpdated: clinicalItem?.updated ? new Date(clinicalItem.updated).toLocaleTimeString() : undefined,
                    envCached: !!envItem,
                    envSize: envItem ? envItem.byteSize : 0,
                    envUpdated: envItem?.updated ? new Date(envItem.updated).toLocaleTimeString() : undefined,
                });
            };

            getAllReq.onerror = () => {
                resolve({ clinicalCached: false, clinicalSize: 0, envCached: false, envSize: 0 });
            };
        });
    } catch {
        return { clinicalCached: false, clinicalSize: 0, envCached: false, envSize: 0 };
    }
}

/**
 * Pre-caches both clinical and environmental models and their taxonomy dictionaries
 */
export async function precacheAllModels(
    onProgress?: (modelName: string, pct: number) => void
): Promise<void> {
    // 1. Environmental Model
    if (onProgress) onProgress('Environmental Model (65 Classes)', 10);
    await loadOrFetchModel(
        'environmental_onnx',
        '/models/geosick_environmental_model.onnx',
        (pct) => onProgress && onProgress('Environmental Model (65 Classes)', pct)
    );

    // 2. Environmental Metadata
    try {
        const envMetaRes = await fetch('/models/geosick_environmental_model_classes.json');
        if (envMetaRes.ok) {
            const data = await envMetaRes.json();
            await saveMetadataToCache('env_classes', data);
        }
    } catch {}

    // 3. Clinical Model
    if (onProgress) onProgress('Clinical Model (200 Classes)', 10);
    await loadOrFetchModel(
        'clinical_onnx',
        '/models/geosick_clinical_model.onnx',
        (pct) => onProgress && onProgress('Clinical Model (200 Classes)', pct)
    );

    // 4. Clinical Metadata
    try {
        const clinicalMetaRes = await fetch('/models/geosick_clinical_model_classes.json');
        if (clinicalMetaRes.ok) {
            const data = await clinicalMetaRes.json();
            await saveMetadataToCache('clinical_classes', data);
        }
    } catch {}

    if (onProgress) onProgress('All Models Ready (Offline)', 100);
}

/**
 * Purges the entire IndexedDB offline model cache
 */
export async function clearAllCache(): Promise<void> {
    try {
        const db = await openDB();
        const tx = db.transaction([MODEL_STORE, METADATA_STORE], 'readwrite');
        tx.objectStore(MODEL_STORE).clear();
        tx.objectStore(METADATA_STORE).clear();
        await new Promise((res) => {
            tx.oncomplete = () => res(true);
        });
    } catch (e) {
        console.warn('[IndexedDB] Could not clear cache:', e);
    }
}
