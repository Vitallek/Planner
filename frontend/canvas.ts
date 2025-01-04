const canvasElement = document.getElementById('canvas');
const resizeCanvas = () => {
  //@ts-ignore
  canvasElement.width = window.innerWidth;
  //@ts-ignore
  canvasElement.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', event => {
  resizeCanvas();
})
interface NodeR {
  x: number,
  y: number,
  center: {
    x: number,
    y: number
  },
  width: number,
  height: number,
  selected: boolean,
  id: number,
  startForWires: number[],
  endForWires: number[]
};
interface Wire {
  id: number,
  selected: boolean,
  startNode: {
    id: number,
    x: number,
    y: number
  },
  endNode: {
    id: number,
    x: number,
    y: number
  }
}
const nodeActionsElement = document.getElementById('node_actions');
const rectStroke = 5;
const rectW = 200;
const rectWhalf = rectW / 2;
const rectH = 140;
const rectHhalf = rectH / 2;
let zoom = 1;
let rectangles: Array<NodeR> = [];
let wires: Array<Wire> = [];
let selectedRect: NodeR = null;
let selectedWire: Wire = null;
let selectedOffsetX,
  selectedOffsetY,
  initMouseX,
  initMouseY,
  canvDragInitX,
  canvDragInitY;
let isDragging = false;
let isWiring = false;
let actionsMenuTimeout;
const closeActionMenu = () => {
  nodeActionsElement.style.display = 'none';
}
const openActionMenu = () => {
  isDragging = false;
  nodeActionsElement.style.display = 'block';
  nodeActionsElement.style.left = `${initMouseX}px`;
  nodeActionsElement.style.top = `${initMouseY}px`;
}
let matrix=[1,0,0,1,0,0];
const toCanvasCoords = (mouseX, mouseY) => {
  let x = (mouseX - matrix[4]) / matrix[0];
  let y = (mouseY - matrix[5]) / matrix[3];
  return {x,y}
}
const toScreenCoords = (mouseX, mouseY) => {
  let x = mouseX * matrix[0] + mouseY * matrix[2] + matrix[4];
  let y = mouseX * matrix[1] + mouseY * matrix[3] + matrix[5];
  return {x,y};
}

const findNodeIndex = (mouseX, mouseY) => {
  const converted = toCanvasCoords(mouseX, mouseY);
  const x = converted.x;
  const y = converted.y;
  return rectangles.findIndex(rect =>
    x > rect.x &&
    x < rect.x + rectW &&
    y > rect.y &&
    y < rect.y + rectH
  );
}
const findWireIndex = (mouseX, mouseY) => {
  const converted = toCanvasCoords(mouseX, mouseY);
  const x = converted.x;
  const y = converted.y;
  // return wires.findIndex(wire => wire.contains(x, y));
}

//@ts-ignore
CanvasKitInit({
  locateFile: (file) => '/frontend/node_modules/canvaskit-wasm/bin/' + file,
}).then(CanvasKit => {
  const surface = CanvasKit.MakeWebGLCanvasSurface(canvasElement);
  const canvas = surface.getCanvas();
  // an array representing the canvas affine transformation matrix 
  
  const paint = new CanvasKit.Paint();
  paint.setAntiAlias(true);
  paint.setColor(CanvasKit.Color(233, 214, 192, 1));

  function addNode(mouseX, mouseY) {
    const converted = toCanvasCoords(mouseX, mouseY);
    const x = converted.x - canvasElement.offsetLeft;
    const y = converted.y - canvasElement.offsetTop;
    const rect: NodeR = {
      x: x - rectWhalf,
      y: y - rectHhalf,
      center: {
        x: x,
        y: y
      },
      width: rectW,
      height: rectH,
      selected: false,
      id: rectangles.length,
      startForWires: [],
      endForWires: []
    };
    rectangles.push(rect);
    console.log(matrix, mouseX, mouseY, zoom, rectangles)
  }

  function addWire(rect1: NodeR, mouseX, mouseY) {
    const converted = toCanvasCoords(mouseX, mouseY);
    const x = converted.x - canvasElement.offsetLeft;
    const y = converted.y - canvasElement.offsetTop;
    const wireID = wires.length;
    const wire: Wire = {
      id: wireID,
      selected: false,
      startNode: {
        id: rect1.id,
        x: rect1.center.x,
        y: rect1.center.y
      },
      endNode: {
        id: null,
        x: x,
        y: y
      }
    };
    rect1.startForWires.push(wireID);
    wires.push(wire);
    console.log(matrix, mouseX, mouseY, zoom, wires);
    return wires.length - 1;
  }

  function draw() {
    canvas.clear(CanvasKit.TRANSPARENT);
    wires.forEach(wire => {
      const wireStart = wire.startNode;
      const wireEnd = wire.endNode;
      drawWire(wireStart.x, wireStart.y, wireStart.x, wireStart.y, wireEnd.x, wireEnd.y, wireEnd.x, wireEnd.y);
    })
    rectangles.forEach(rect => {
      paint.setColor(CanvasKit.Color(46, 49, 54, 1));
      canvas.drawRRect(CanvasKit.RRectXY(CanvasKit.XYWHRect(rect.x - rectStroke, rect.y - rectStroke, rect.width + 2 * rectStroke, rect.height + 2 * rectStroke), 14, 14), paint);
      paint.setColor(CanvasKit.Color(233, 214, 192, 1));
      canvas.drawRRect(CanvasKit.RRectXY(CanvasKit.XYWHRect(rect.x, rect.y, rect.width, rect.height), 14, 14), paint);
    });
    surface.flush();
  }

  function drawWire(startX, startY, controlX1, controlY1, controlX2, controlY2, endX, endY) {
    const path = new CanvasKit.Path();
    paint.setStyle(CanvasKit.PaintStyle.Stroke);
    paint.setStrokeWidth(5);
    path.moveTo(startX, startY);
    path.cubicTo(controlX1, controlY1, controlX2, controlY2, endX, endY);
    canvas.drawPath(path, paint);
    paint.setStyle(CanvasKit.PaintStyle.Fill);
  }
  const deleteNodeBtn = document.getElementById('deleteNode');
  deleteNodeBtn.onclick = (event) => {
    rectangles.splice(findNodeIndex(initMouseX, initMouseY), 1);
    closeActionMenu();
    draw();
  }

  const wireNodeBtn = document.getElementById('wireNode');
  wireNodeBtn.onclick = (event) => {
    closeActionMenu();
    isWiring = true;
    const newWireIndex = addWire(selectedRect, event.clientX, event.clientY);
    selectedWire = wires[newWireIndex];
    draw();
  }

  trackTransforms(canvas);
  function scaleDraw(ctx) {
    const pt = ctx.transformedPoint(initMouseX, initMouseY);
    matrix[4] += matrix[0] * pt.x + matrix[2] * pt.y;
    matrix[5] += matrix[1] * pt.x + matrix[3] * pt.y;
    ctx.translate(pt.x, pt.y);
    // zoom = Math.min(Math.max(0.95, zoom), 1.05);
    matrix[0] *= zoom;
    matrix[1] *= zoom;
    matrix[2] *= zoom;
    matrix[3] *= zoom;     
    ctx.scale(zoom, zoom);
    matrix[4] += matrix[0] * -pt.x + matrix[2] * -pt.y;
    matrix[5] += matrix[1] * -pt.x + matrix[3] * -pt.y;
    ctx.translate(-pt.x, -pt.y);
  }
  canvasElement.addEventListener('wheel', event => {
    event.preventDefault();
    initMouseX = event.clientX;
    initMouseY = event.clientY;
    event.deltaY < 0 ? zoom += 0.01 : zoom -= 0.01;
    if(zoom > 1.05) zoom = 1.05;
    if(zoom < 0.95) zoom = 0.95;
    scaleDraw(canvas);
    draw();
  })
  canvasElement.addEventListener('mousedown', (event) => {
    clearTimeout(actionsMenuTimeout)

    initMouseX = canvDragInitX = event.clientX;
    initMouseY = canvDragInitY = event.clientY;
    const x = event.clientX - canvasElement.offsetLeft;
    const y = event.clientY - canvasElement.offsetTop;
    selectedRect = rectangles[findNodeIndex(x, y)]
    isDragging = true;
    if (selectedRect) {
      selectedRect.selected = true;
      actionsMenuTimeout = setTimeout(() => {
        openActionMenu();
        return;
      }, 500)
      const versa = toScreenCoords(selectedRect.x, selectedRect.y);
      selectedOffsetX = x - versa.x;
      selectedOffsetY = y - versa.y;
    }

  });

  canvasElement.addEventListener('mousemove', (event) => {
    clearTimeout(actionsMenuTimeout);
    const x = event.clientX - canvasElement.offsetLeft;
    const y = event.clientY - canvasElement.offsetTop;
    
    if(isWiring) {
      const converted = toCanvasCoords(x, y);
      selectedWire.endNode.x = converted.x - canvasElement.offsetLeft;
      selectedWire.endNode.y = converted.y - canvasElement.offsetTop;
    }
    if (selectedRect && isDragging) {
      /** перетаскивается нода*/
      const converted = toCanvasCoords(x - selectedOffsetX, y - selectedOffsetY);
      selectedRect.startForWires.forEach(wireIndex => {
        const wire = wires[wireIndex];
        wire.startNode.x = converted.x + rectWhalf;
        wire.startNode.y = converted.y + rectHhalf;
      })
      selectedRect.endForWires.forEach(wireIndex => {
        const wire = wires[wireIndex];
        wire.endNode.x = converted.x + rectWhalf;
        wire.endNode.y = converted.y + rectHhalf;
      })
      selectedRect.x = converted.x;
      selectedRect.y = converted.y;
      selectedRect.center.x = converted.x + rectWhalf;
      selectedRect.center.y = converted.y + rectHhalf;

      console.log(rectangles, wires)
    }
    if(!selectedRect && isDragging) {
      /**перетаскивается экран */
      const movementX = x - canvDragInitX;
      const movementY = y - canvDragInitY;
      // const movement = Math.sqrt(movementX*movementX+movementY*movementY);
      matrix[4] += matrix[0] * movementX + matrix[2] * movementY;
      matrix[5] += matrix[1] * movementX + matrix[3] * movementY;
      canvas.translate(movementX, movementY);
      // rectangles.forEach(rect => {
      //   rect.x += movementX;
      //   rect.y += movementY;
      // })
    }
    draw();
    canvDragInitX = event.clientX;
    canvDragInitY = event.clientY;
  });

  canvasElement.addEventListener('mouseup', (event) => {
    clearTimeout(actionsMenuTimeout);
    isDragging = false;
    if(isWiring && selectedRect){
      selectedWire.endNode.x = selectedRect.center.x;
      selectedWire.endNode.y = selectedRect.center.y;
      selectedWire.endNode.id = selectedRect.id;
      selectedRect.endForWires.push(selectedWire.id);
      isWiring = false;
      draw();
      return;
    }
    if (!isWiring && !selectedRect && initMouseX == event.clientX && initMouseY == event.clientY) {
      addNode(event.clientX, event.clientY);
      draw();
    }
    // if(selectedRect) {
    //   selectedRect.selected = false;
    // }
  });

  function trackTransforms(ctx) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    let xform = svg.createSVGMatrix();
  
    const savedTransforms = [];
    let save = ctx.save;
    ctx.save = () => {
      savedTransforms.push(xform.translate(0, 0));
      return save.call(ctx);
    };
  
    let restore = ctx.restore;
    ctx.restore = () => {
      xform = savedTransforms.pop();
      return restore.call(ctx);
    };
  
    let scale = ctx.scale;
    ctx.scale = (sx, sy) => {
      xform = xform.scaleNonUniform(sx, sy);
      return scale.call(ctx, sx, sy);
    };
  
    let translate = ctx.translate;
    ctx.translate = function (dx, dy) {
      xform = xform.translate(dx, dy);
      return translate.call(ctx, dx, dy);
    };
  
    let pt = svg.createSVGPoint();
    ctx.transformedPoint = (x, y) => {
      pt.x = x;
      pt.y = y;
      return pt.matrixTransform(xform.inverse());
    };
  }
});