import * as THREE from 'three';
import type { DepthSource } from './DepthSource';

/**
 * Depth source backed by Depth Anything V2 Small running in-browser
 * via @huggingface/transformers (ONNX Runtime Web under the hood).
 *
 * The model is not loaded until loadModel() is called — triggered by
 * the user toggling to ML mode in the UI.
 */
export function createMLDepthSource(): DepthSource {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let pipeline: any = null;
  let loading = false;

  async function loadModel(): Promise<void> {
    if (pipeline || loading) return;
    loading = true;
    try {
      const { pipeline: createPipeline } = await import('@huggingface/transformers');
      pipeline = await createPipeline(
        'depth-estimation',
        'onnx-community/depth-anything-v2-small',
        { device: 'webgpu' },
      );
    } catch (err) {
      console.warn('[MLDepthSource] WebGPU unavailable, falling back to WASM:', err);
      try {
        const { pipeline: createPipeline } = await import('@huggingface/transformers');
        pipeline = await createPipeline(
          'depth-estimation',
          'onnx-community/depth-anything-v2-small',
          { device: 'wasm' },
        );
      } catch (wasmErr) {
        console.error('[MLDepthSource] Failed to load depth model:', wasmErr);
        loading = false;
        throw wasmErr;
      }
    }
    loading = false;
  }

  function isAvailable(): boolean {
    return pipeline != null;
  }

  async function getDepthTexture(
    _frame: XRFrame,
    _view: XRView,
    gl: WebGL2RenderingContext,
    _binding: XRWebGLBinding | null,
  ): Promise<THREE.Texture | null> {
    if (!pipeline) return null;

    try {
      // Read the current canvas into an ImageData for the ML pipeline.
      const width = gl.drawingBufferWidth;
      const height = gl.drawingBufferHeight;
      const pixels = new Uint8Array(width * height * 4);
      gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

      // Flip vertically (WebGL readPixels is bottom-up).
      const rowBytes = width * 4;
      const flipped = new Uint8Array(pixels.length);
      for (let y = 0; y < height; y++) {
        const src = (height - 1 - y) * rowBytes;
        const dst = y * rowBytes;
        flipped.set(pixels.subarray(src, src + rowBytes), dst);
      }

      // Convert to ImageData for the pipeline.
      const imageData = new ImageData(new Uint8ClampedArray(flipped.buffer), width, height);

      const result = await pipeline(imageData);
      // result.depth is a RawImage with .data (Uint8Array or Float32Array)
      const depthData = result.depth.data;
      const depthSize = result.depth.width * result.depth.height;

      // Normalize to 0..1 float array.
      const floatData = new Float32Array(depthSize);
      const isFloat = depthData instanceof Float32Array;
      for (let i = 0; i < depthSize; i++) {
        floatData[i] = isFloat ? depthData[i] : depthData[i] / 255;
      }

      const tex = new THREE.DataTexture(
        floatData,
        result.depth.width,
        result.depth.height,
        THREE.RedFormat,
        THREE.FloatType,
      );
      tex.minFilter = THREE.NearestFilter;
      tex.magFilter = THREE.NearestFilter;
      tex.needsUpdate = true;
      return tex;
    } catch (err) {
      console.warn('[MLDepthSource] Inference failed:', err);
      return null;
    }
  }

  function dispose(): void {
    if (pipeline?.dispose) pipeline.dispose();
    pipeline = null;
    loading = false;
  }

  return {
    name: 'ml' as const,
    isAvailable,
    getDepthTexture,
    dispose,
    loadModel,
  } as DepthSource & { loadModel: () => Promise<void> };
}
