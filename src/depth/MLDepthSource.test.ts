import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import { createMLDepthSource } from './MLDepthSource';
import type { DepthSource } from './DepthSource';

type MLDepthSource = DepthSource & { loadModel: () => Promise<void> };

// The ML pipeline downloads a real model — mock it at the module boundary.
const { mockPipeline } = vi.hoisted(() => ({ mockPipeline: vi.fn() }));

vi.mock('@huggingface/transformers', () => ({ pipeline: mockPipeline }));

// jsdom has no ImageData constructor; the ML source needs one to feed the pipeline.
class FakeImageData {
  data: Uint8ClampedArray;
  width: number;
  height: number;

  constructor(data: Uint8ClampedArray, width: number, height: number) {
    this.data = data;
    this.width = width;
    this.height = height;
  }
}

function makeFakeGl(): WebGL2RenderingContext {
  return {
    drawingBufferWidth: 3,
    drawingBufferHeight: 1,
    RGBA: 0x1908,
    UNSIGNED_BYTE: 0x1401,
    readPixels: (
      _x: number,
      _y: number,
      _w: number,
      _h: number,
      _format: number,
      _type: number,
      pixels: Uint8Array,
    ) => {
      pixels.fill(128);
    },
  } as unknown as WebGL2RenderingContext;
}

const fakeFrame = {} as XRFrame;
const fakeView = {} as XRView;

describe('ML depth model loading', () => {
  beforeEach(() => {
    mockPipeline.mockReset();
    vi.stubGlobal('ImageData', FakeImageData);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reports the ML source as unavailable until the model is loaded', () => {
    const source = createMLDepthSource() as MLDepthSource;

    expect(source.isAvailable()).toBe(false);
  });

  it('loads the Depth Anything V2 Small model when ML mode activates', async () => {
    mockPipeline.mockResolvedValue({});
    const source = createMLDepthSource() as MLDepthSource;

    await source.loadModel();

    expect(mockPipeline).toHaveBeenCalledWith(
      'depth-estimation',
      'onnx-community/depth-anything-v2-small',
      expect.objectContaining({ device: 'webgpu' }),
    );
    expect(source.isAvailable()).toBe(true);
  });

  it('falls back to WASM when WebGPU is unavailable', async () => {
    mockPipeline
      .mockRejectedValueOnce(new Error('webgpu not supported'))
      .mockResolvedValueOnce({});
    const source = createMLDepthSource() as MLDepthSource;

    await source.loadModel();

    expect(mockPipeline).toHaveBeenCalledTimes(2);
    expect(mockPipeline).toHaveBeenLastCalledWith(
      'depth-estimation',
      'onnx-community/depth-anything-v2-small',
      expect.objectContaining({ device: 'wasm' }),
    );
    expect(source.isAvailable()).toBe(true);
  });

  it('degrades gracefully when the model fails to load', async () => {
    mockPipeline.mockRejectedValue(new Error('network down'));
    const source = createMLDepthSource() as MLDepthSource;

    await expect(source.loadModel()).rejects.toThrow('network down');

    expect(source.isAvailable()).toBe(false);
  });
});

describe('ML depth inference', () => {
  beforeEach(() => {
    mockPipeline.mockReset();
    vi.stubGlobal('ImageData', FakeImageData);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns no depth while the model is still loading', async () => {
    const source = createMLDepthSource() as MLDepthSource;

    await expect(
      source.getDepthTexture(fakeFrame, fakeView, makeFakeGl(), null),
    ).resolves.toBeNull();
  });

  it('produces a depth texture from ML inference', async () => {
    const fakePipeline = vi.fn();
    mockPipeline.mockResolvedValue(fakePipeline);
    const source = createMLDepthSource() as MLDepthSource;
    await source.loadModel();

    fakePipeline.mockResolvedValue({
      depth: { data: new Uint8Array([0, 128, 255]), width: 3, height: 1 },
    });

    const texture = await source.getDepthTexture(
      fakeFrame,
      fakeView,
      makeFakeGl(),
      null,
    );

    expect(texture).toBeInstanceOf(THREE.DataTexture);
    const data = (texture as THREE.DataTexture).image.data as unknown as Float32Array;
    expect(data).toHaveLength(3);
    expect(data[0]).toBeCloseTo(0, 2);
    expect(data[1]).toBeCloseTo(128 / 255, 2);
    expect(data[2]).toBeCloseTo(1, 2);
  });

  it('returns no depth instead of crashing when inference fails', async () => {
    const fakePipeline = vi.fn();
    mockPipeline.mockResolvedValue(fakePipeline);
    const source = createMLDepthSource() as MLDepthSource;
    await source.loadModel();

    fakePipeline.mockRejectedValue(new Error('inference boom'));

    await expect(
      source.getDepthTexture(fakeFrame, fakeView, makeFakeGl(), null),
    ).resolves.toBeNull();
  });
});