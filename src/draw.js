
function getter(obj, source, key) {
  Object.defineProperty(obj, key, {
    get() {
      return source[key];
    }
  });
}

export class Draw {
  constructor(track) {
    this._track = track;

    [ 
      'options', 
      '_map', 
      '_ctx', 
      '_canvas', 
      '_bufferTracks', 
      '_layer' 
    ].forEach(k => {
      getter(this, this._track, k);
    });
  }

  render() {
    if(!this._bufferTracks.length) return;

    this._clearCanvas();

    const points = this._bufferTracks.map(d => {
      const point = this._map.latLngToLayerPoint(d);
      point.rotate = d.rotate;
      return point;
    });

    this._drawCanvasShip(points);
    this._drawShipImage(points);
    this._drawTrackLine(points);
  }

  _clearCanvas() {
    const bounds = this._layer.getBounds();

    if(bounds) {
      const size = bounds.getSize();
      this._ctx.clearRect(bounds.min.x, bounds.min.y, size.x, size.y);
    } else {
      this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
    }
  }

  _drawCanvasShip(points) {
    const ctx = this._ctx;
    const w = 8;
    const h = 20;
    const dh = h / 3;
    const length = points.length;
    const last = points[length - 1];

    ctx.save();
    ctx.beginPath();
    ctx.fillStyle = 'green';
    ctx.translate(last.x, last.y);
    ctx.rotate(last.rotate + Math.PI);
    
    ctx.moveTo(0, 0 - h / 2);
    ctx.lineTo(0 - w / 2, 0 - h / 2);
    ctx.lineTo(0 - w / 2, 0 + h / 2 - dh);
    ctx.lineTo(0, 0 + h / 2);
    ctx.lineTo(0 + w / 2, 0 + h / 2 - dh);
    ctx.lineTo(0 + w / 2, 0 - h / 2);

    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  _drawShipImage(points) {
    if(!this._img) {
      return this._drawCanvasShip(points);
    }
    const ctx = this._ctx;
    const w = 12;
    const h = 25;
    const length = points.length;
    const last = points[length - 1];

    ctx.save();
    ctx.translate(last.x, last.y);
    ctx.rotate(last.rotate);
    ctx.drawImage(this._img, - w / 2, - h / 2, w, h);
    ctx.restore();
  }

  _drawTrackLine(points) {
    const ctx = this._ctx;
    const length = points.length;
    const first = points[0];

    ctx.save();
    ctx.beginPath();

    ctx.strokeStyle = '#1C54E2';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.3;

    ctx.moveTo(first.x, first.y);

    for(let i = 1; i < length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }

    ctx.stroke();
    ctx.restore();
  }
}