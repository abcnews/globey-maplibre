/**
 * @file
 * Render a dataset as a spike layer in ThreeJS.
 */

import type { maplibregl } from '../components/mapLibre/index';
import * as THREE from 'three';

interface SpikeLayerOptions {
  id: string;
  baseDiameter?: number;
  coords?: [number, number][]; // Optional initial data
}

export default class SpikeLayer implements maplibregl.CustomLayerInterface {
  id: string;
  type: 'custom' = 'custom';
  renderingMode: '3d' = '3d';

  protected map?: maplibregl.Map;
  protected camera?: THREE.Camera;
  protected scene?: THREE.Scene;
  protected renderer?: THREE.WebGLRenderer;
  protected mesh?: THREE.InstancedMesh;

  protected baseMatrices: THREE.Matrix4[] = [];
  protected baseDiameter: number;
  protected count: number = 0;

  // Internal store for coordinates if set before onAdd
  private pendingCoords: [number, number][] | null = null;

  constructor({ id, baseDiameter = 100000, coords }: SpikeLayerOptions) {
    this.id = id;
    this.baseDiameter = baseDiameter;
    if (coords) this.pendingCoords = coords;
  }

  onAdd(map: maplibregl.Map, gl: WebGLRenderingContext | WebGL2RenderingContext): void {
    this.map = map;
    this.camera = new THREE.Camera();
    this.scene = new THREE.Scene();
    this.renderer = new THREE.WebGLRenderer({
      canvas: map.getCanvas(),
      context: gl,
      antialias: true
    });
    this.renderer.autoClear = false;

    // If we have data waiting, initialize the mesh now
    if (this.pendingCoords) {
      this.initMesh(this.pendingCoords);
      this.pendingCoords = null;
    }
  }

  /**
   * Public API to set locations.
   * Handles both "pre-init" and "post-init" scenarios.
   */
  setLocations(coords: [number, number][]): void {
    if (!this.map) {
      // Not added to map yet, store for onAdd
      this.pendingCoords = coords;
      return;
    }
    this.initMesh(coords);
  }

  /**
   * Internal method to build the THREE objects once context is available
   */
  private initMesh(coords: [number, number][]): void {
    if (!this.map || !this.scene) return;

    // Clean up old mesh if exists
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      (this.mesh.material as THREE.Material).dispose();
    }

    this.count = coords.length;
    this.baseMatrices = coords.map(lngLat => {
      const modelMatrixArray = this.map!.transform.getMatrixForModel(lngLat, 0);
      return new THREE.Matrix4().fromArray(modelMatrixArray);
    });

    const geometry = new THREE.ConeGeometry(0.5, 1, 12);
    geometry.translate(0, 0.5, 0);
    const material = new THREE.MeshBasicMaterial();

    this.mesh = new THREE.InstancedMesh(geometry, material, this.count);

    // Default to scale 0 so they don't pop in until updateData is called
    const zeroScale = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < this.count; i++) {
      this.mesh.setMatrixAt(i, zeroScale);
    }

    this.scene.add(this.mesh);
  }

  updateData(heights: Float32Array, colours: Float32Array): void {
    if (!this.mesh || heights.length !== this.count) {
      return;
    }

    const tempMatrix = new THREE.Matrix4();
    const tempColour = new THREE.Color();
    const w = this.baseDiameter;

    for (let i = 0; i < this.count; i++) {
      tempMatrix.copy(this.baseMatrices[i]);
      const height = heights[i];
      if (!height) {
        continue;
      }

      tempMatrix.scale(new THREE.Vector3(w, heights[i], w));
      this.mesh.setMatrixAt(i, tempMatrix);

      tempColour.setRGB(colours[i * 3], colours[i * 3 + 1], colours[i * 3 + 2]);
      this.mesh.setColorAt(i, tempColour);
    }

    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;

    this.map?.triggerRepaint();
  }


  protected onPreRender(): void {}

  render(gl: WebGLRenderingContext | WebGL2RenderingContext, args: maplibregl.CustomRenderMethodInput): void {
    if (!this.camera || !this.renderer || !this.scene || !this.map || !this.mesh) return;

    this.onPreRender();
    this.camera.projectionMatrix = new THREE.Matrix4().fromArray(args.defaultProjectionData.mainMatrix);
    this.renderer.resetState();
    this.renderer.render(this.scene, this.camera);
  }

  onRemove(): void {
    if (this.mesh) {
      this.mesh.geometry.dispose();
      (this.mesh.material as THREE.Material).dispose();
    }
    this.renderer?.dispose();
  }
}
