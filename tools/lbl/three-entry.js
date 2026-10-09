// The only parts of three.js (r186, 0.186.1) the book uses, bundled into
// layer-by-layer-2/app/engine/three.js so the book works offline and loads less.
// Rebuild (in any folder with `npm i three@0.186.1 esbuild`):
//   npx esbuild tools/lbl/three-entry.js --bundle --format=esm --minify --legal-comments=eof \
//     --outfile=layer-by-layer-2/app/engine/three.js
// Add a name here if engine code starts using another three.js class.
export {
  BufferGeometry, ClampToEdgeWrapping, Color, DataArrayTexture, DepthTexture, Float32BufferAttribute, GLSL3, Group,
  LinearFilter, LinearMipmapLinearFilter, LinearSRGBColorSpace, Matrix4, Mesh, NearestFilter, NoColorSpace, NormalBlending,
  OrthographicCamera, PerspectiveCamera, RGBAFormat, Raycaster, Scene, ShaderMaterial, Sphere, Uint16BufferAttribute,
  Uint32BufferAttribute, UnsignedByteType, UnsignedIntType, Vector2, Vector3, Vector4, WebGLRenderTarget, WebGLRenderer,
  MathUtils, Quaternion, Box3, LineSegments, LineDashedMaterial,
} from 'three';
export { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
