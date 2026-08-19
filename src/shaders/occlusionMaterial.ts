import * as THREE from 'three';

/**
 * Inject a depth-comparison occlusion pass into an existing MeshPhysicalMaterial
 * via onBeforeCompile. Occluded fragments (behind real-world geometry) are
 * discarded so virtual furniture is hidden behind real objects.
 */
export function applyOcclusion(
  material: THREE.Material,
  depthTex: THREE.Texture,
  projectionMatrix: THREE.Matrix4,
  viewMatrix: THREE.Matrix4,
): void {
  const mat = material as THREE.MeshPhysicalMaterial;

  // Extract near/far from the projection matrix.
  const proj = projectionMatrix.elements;
  const near = proj[14] / (proj[10] - 1);
  const far = proj[14] / (proj[10] + 1);

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uDepthTex = { value: depthTex };
    shader.uniforms.uProjMat = { value: projectionMatrix };
    shader.uniforms.uViewMat = { value: viewMatrix };
    shader.uniforms.uDepthNear = { value: near };
    shader.uniforms.uDepthFar = { value: far };

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
varying vec3 vOccludeWorldPos;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
vOccludeWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
uniform sampler2D uDepthTex;
uniform mat4 uProjMat;
uniform mat4 uViewMat;
uniform float uDepthNear;
uniform float uDepthFar;
varying vec3 vOccludeWorldPos;`,
      )
      .replace(
        '#include <opaque_fragment>',
        `#include <opaque_fragment>
{
  vec4 camClip = uProjMat * uViewMat * vec4(vOccludeWorldPos, 1.0);
  vec2 uv = (camClip.xy / camClip.w) * 0.5 + 0.5;
  float sceneDepthNorm = texture2D(uDepthTex, uv).r;
  float fragCameraZ = -(uViewMat * vec4(vOccludeWorldPos, 1.0)).z;
  float fragDepthNorm = clamp((fragCameraZ - uDepthNear) / (uDepthFar - uDepthNear), 0.0, 1.0);
  if (fragDepthNorm > sceneDepthNorm + 0.005) {
    discard;
  }
}`,
      );
  };

  // Force re-compile.
  (material as { needsUpdate?: boolean }).needsUpdate = true;
}

/**
 * Remove the occlusion pass by restoring the material's default onBeforeCompile.
 */
export function clearOcclusion(material: THREE.Material): void {
  const mat = material as THREE.MeshPhysicalMaterial;
  if (mat.onBeforeCompile) {
    mat.onBeforeCompile = () => {};
    (material as { needsUpdate?: boolean }).needsUpdate = true;
  }
}
