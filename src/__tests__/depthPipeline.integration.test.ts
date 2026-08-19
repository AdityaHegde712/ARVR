import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import {
  initScene,
  requestARSession,
  startAnimationLoop,
  getScene,
  getModelMeshes,
  dispose,
} from '../xr/ARScene';
import { getActiveSource } from '../depth/depthManager';
import { applyOcclusion, clearOcclusion } from '../shaders/occlusionMaterial';
import type { DepthSource } from '../depth/DepthSource';

// jsdom has no WebGL — substitute the renderer so the frame loop can run.
const { createFakeRenderer, rendererInstances } = vi.hoisted(() => {
  const rendererInstances: Array<{
    setAnimationLoop: ReturnType<typeof vi.fn>;
    getContext: ReturnType<typeof vi.fn>;
    render: ReturnType<typeof vi.fn>;
    dispose: ReturnType<typeof vi.fn>;
  }> = [];

  function createFakeRenderer() {
    const renderer = {
      setSize: vi.fn(),
      setPixelRatio: vi.fn(),
      setClearColor: vi.fn(),
      xr: {
        enabled: false,
        setReferenceSpaceType: vi.fn(),
        setSession: vi.fn(async () => {}),
      },
      setAnimationLoop: vi.fn(),
      getContext: vi.fn(() => ({})),
      properties: { get: vi.fn(() => ({ __webglTexture: undefined })) },
      render: vi.fn(),
      dispose: vi.fn(),
    };
    rendererInstances.push(renderer);
    return renderer;
  }

  return { createFakeRenderer, rendererInstances };
});

vi.mock('three', async (importActual) => {
  const actual = await importActual<typeof import('three')>();
  return { ...actual, WebGLRenderer: vi.fn(() => createFakeRenderer()) };
});

// The depth manager is external to the frame loop; stub it so each test can
// supply a source that records how often depth is requested.
vi.mock('../depth/depthManager', () => ({
  initDepthSources: vi.fn(),
  setSession: vi.fn(),
  setMode: vi.fn(),
  getActiveSource: vi.fn(),
  getMode: vi.fn(() => 'api'),
  isAppleDevice: vi.fn(() => false),
  disposeAll: vi.fn(),
}));

vi.mock('../shaders/occlusionMaterial', () => ({
  applyOcclusion: vi.fn(),
  clearOcclusion: vi.fn(),
}));

const getActiveSourceMock = vi.mocked(getActiveSource);
const applyOcclusionMock = vi.mocked(applyOcclusion);
const clearOcclusionMock = vi.mocked(clearOcclusion);

function makeFakeSession() {
  return {
    addEventListener: vi.fn(),
    requestReferenceSpace: vi.fn(async () => ({})),
    end: vi.fn(async () => {}),
    depthUsage: 'cpu-optimized',
    depthDataFormat: 'float32',
  };
}

function makeFakeFrame() {
  return { getViewerPose: vi.fn(() => ({ views: [{}] })) };
}

function driveFrames(count: number, frame = makeFakeFrame()) {
  const loopCallback = rendererInstances[0].setAnimationLoop.mock.calls[0][0];
  for (let i = 0; i < count; i++) {
    loopCallback(i, frame);
  }
}

async function startArPipeline() {
  const canvas = document.createElement('canvas');
  initScene(canvas);
  Object.defineProperty(navigator, 'xr', {
    value: {
      isSessionSupported: vi.fn(async () => true),
      requestSession: vi.fn(async () => makeFakeSession()),
    },
    configurable: true,
  });
  await requestARSession();
  startAnimationLoop();
}

function makeApiSource(): DepthSource & { getDepthTexture: ReturnType<typeof vi.fn> } {
  return {
    name: 'api',
    isAvailable: () => true,
    getDepthTexture: vi.fn(() => null),
    dispose: vi.fn(),
  };
}

function makeMlSource(): DepthSource & { getDepthTexture: ReturnType<typeof vi.fn> } {
  return {
    name: 'ml',
    isAvailable: () => true,
    getDepthTexture: vi.fn(async () => null),
    dispose: vi.fn(),
  };
}

describe('depth data refresh rate', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    rendererInstances.length = 0;
    await startArPipeline();
  });

  afterEach(() => {
    dispose();
  });

  it('fetches depth data from the WebXR API source on every animation frame', () => {
    const apiSource = makeApiSource();
    getActiveSourceMock.mockReturnValue(apiSource);

    driveFrames(5);

    expect(apiSource.getDepthTexture).toHaveBeenCalledTimes(5);
  });

  it('throttles ML depth inference to approximately every 10th frame', () => {
    const mlSource = makeMlSource();
    getActiveSourceMock.mockReturnValue(mlSource);

    driveFrames(9);
    expect(mlSource.getDepthTexture).not.toHaveBeenCalled();

    driveFrames(1);
    expect(mlSource.getDepthTexture).toHaveBeenCalledTimes(1);

    driveFrames(10);
    expect(mlSource.getDepthTexture).toHaveBeenCalledTimes(2);
  });
});

describe('occlusion rendering in the frame loop', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    rendererInstances.length = 0;
    await startArPipeline();
  });

  afterEach(() => {
    dispose();
  });

  it('applies occlusion to every furniture mesh when depth data is available', () => {
    const scene = getScene()!;
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshPhysicalMaterial(),
    );
    scene.add(mesh);

    const apiSource = makeApiSource();
    apiSource.getDepthTexture.mockReturnValue(new THREE.Texture());
    getActiveSourceMock.mockReturnValue(apiSource);

    driveFrames(1);

    expect(applyOcclusionMock).toHaveBeenCalledWith(
      mesh.material,
      expect.any(THREE.Texture),
      expect.anything(),
      expect.anything(),
    );
  });

  it('clears occlusion from furniture meshes when depth data is unavailable', () => {
    const scene = getScene()!;
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshPhysicalMaterial(),
    );
    scene.add(mesh);

    const unavailableSource = {
      name: 'api' as const,
      isAvailable: () => false,
      getDepthTexture: vi.fn(() => null),
      dispose: vi.fn(),
    };
    getActiveSourceMock.mockReturnValue(unavailableSource);

    driveFrames(1);

    expect(clearOcclusionMock).toHaveBeenCalledWith(mesh.material);
    expect(applyOcclusionMock).not.toHaveBeenCalled();
  });

  it('occludes only furniture meshes that use a physical material', () => {
    const scene = getScene()!;
    const physicalMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshPhysicalMaterial(),
    );
    const basicMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial(),
    );
    scene.add(physicalMesh);
    scene.add(basicMesh);

    const apiSource = makeApiSource();
    apiSource.getDepthTexture.mockReturnValue(new THREE.Texture());
    getActiveSourceMock.mockReturnValue(apiSource);

    driveFrames(1);

    expect(getModelMeshes()).toEqual([physicalMesh]);
    expect(applyOcclusionMock).toHaveBeenCalledTimes(1);
    expect(applyOcclusionMock).toHaveBeenCalledWith(
      physicalMesh.material,
      expect.any(THREE.Texture),
      expect.anything(),
      expect.anything(),
    );
  });
});