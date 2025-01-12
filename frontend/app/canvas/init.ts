import CanvasKitInit from "canvaskit-wasm"

const initCanvasKit = async () => {
  const ck = await CanvasKitInit({
    locateFile: (file: string): string => `https://unpkg.com/canvaskit-wasm@0.39.1/bin/${file}`,
  })
  return ck;
}
export default initCanvasKit