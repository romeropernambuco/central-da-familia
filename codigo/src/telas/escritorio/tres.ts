// Só as peças do Three.js (r160, licença MIT) que a cena do Escritório usa. Este arquivo é buscado por import() dinâmico:
// o 3D só entra na memória quando a pessoa abre a tela Escritório.
// @ts-ignore: o pacote three não traz tipos; a cena usa as peças como `any`
export { WebGLRenderer, PCFSoftShadowMap, Scene, HemisphereLight, DirectionalLight, PointLight, BoxGeometry, CylinderGeometry, CircleGeometry, MeshBasicMaterial, ConeGeometry, MeshLambertMaterial, Color, BufferGeometry, BufferAttribute, Mesh, Group, Vector2, Vector3, OrthographicCamera, Raycaster } from 'three'
// @ts-ignore: Three r160 sem tipos neste projeto.
export { Box3, InstancedMesh, Matrix4 } from 'three'
