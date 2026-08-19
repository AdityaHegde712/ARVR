import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { applyOcclusion, clearOcclusion } from './occlusionMaterial';

type TestableMaterial = {
  onBeforeCompile?: (shader: unknown) => void;
  version?: number;
};

function makeShaderStub() {
  return {
    uniforms: {} as Record<string, { value: unknown }>,
    vertexShader: '#include <common>\n#include <begin_vertex>',
    fragmentShader: '#include <common>\n#include <opaque_fragment>',
  };
}

describe('occlusion rendering', () => {
  it('injects the depth-comparison pass into a physical material when depth is available', () => {
    const material = new THREE.MeshPhysicalMaterial() as unknown as TestableMaterial;
    const depthTex = new THREE.Texture();
    const projection = new THREE.PerspectiveCamera(70, 1, 0.1, 10).projectionMatrix;
    const view = new THREE.Matrix4();

    applyOcclusion(material as unknown as THREE.Material, depthTex, projection, view);

    // three r162's needsUpdate is a setter-only accessor that bumps version.
    expect(material.version).toBe(1);
    expect(typeof material.onBeforeCompile).toBe('function');

    const shader = makeShaderStub();
    material.onBeforeCompile!(shader);

    expect(shader.uniforms.uDepthTex.value).toBe(depthTex);
    expect(shader.uniforms.uDepthNear.value).toBeCloseTo(0.1, 5);
    expect(shader.uniforms.uDepthFar.value).toBeCloseTo(10, 5);
    expect(shader.vertexShader).toContain('vOccludeWorldPos');
    expect(shader.fragmentShader).toContain('uDepthTex');
    expect(shader.fragmentShader).toContain('discard');
  });

  it('removes the occlusion pass when depth is no longer available', () => {
    const material = new THREE.MeshPhysicalMaterial() as unknown as TestableMaterial;
    const depthTex = new THREE.Texture();
    const projection = new THREE.PerspectiveCamera(70, 1, 0.1, 10).projectionMatrix;
    const view = new THREE.Matrix4();

    applyOcclusion(material as unknown as THREE.Material, depthTex, projection, view);
    clearOcclusion(material as unknown as THREE.Material);

    expect(material.version).toBe(2);

    const shader = makeShaderStub();
    material.onBeforeCompile!(shader);

    expect(shader.uniforms.uDepthTex).toBeUndefined();
    expect(shader.fragmentShader).not.toContain('uDepthTex');
  });

  it('leaves a material untouched when clearing occlusion that was never applied', () => {
    const material = {} as unknown as TestableMaterial;

    clearOcclusion(material as unknown as THREE.Material);

    expect(material.onBeforeCompile).toBeUndefined();
    expect(material.version).toBeUndefined();
  });
});