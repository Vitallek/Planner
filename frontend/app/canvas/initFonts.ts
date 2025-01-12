const cdn = 'https://storage.googleapis.com/skia-cdn/misc/';
const initCanvasFonts = async () => {
  const loadRoboto = fetch(cdn + 'Roboto-Regular.ttf').then((response) => response.arrayBuffer());
  return loadRoboto;
}
export default initCanvasFonts