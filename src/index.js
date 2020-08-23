import L from 'leaflet';
import { TrackLayer } from './trackLayer';

L.TrackAnimation = L.Class.extend({
  includes: L.Evented.prototype || L.Mixin.Events,
  options: {
    duraion: 5000,
    trackLine: {
      show: true,
      color: 'green',
      lineWidth: 2
    },
    trackMarker: {
      show: true,
      src: '',
      width: 12,
      height: 25,
      fillColor: 'red',
      render: null
    },
    trackPoint: {
      show: false,
      src: '',
      width: 12,
      height: 12,
      fillColor: 'red',
      render: null
    }
  },
  initialize(map, latlngs, options) {
    L.Util.setOptions(this, options);
    this._map = map;
    this._latlngs = latlngs.map(d => {
      return L.latLng(d);
    });
    this._layer = new TrackLayer().addTo(map);
    this._canvas = this._layer.getContainer();
    this._ctx = this._layer.getContext();

    this._percent = null;
    this._animating = false;
    this._timer = null;
    this._fpsStartTime = null;
    this._bufferTracks = [];
    this._expandTracks = this._addPath(this._latlngs);

    const img = new Image();

    img.crossOrigin = 'anonymous';

    img.onload = () => {
      this._img = img;
    };

    img.src = 'https://linghuam.github.io/Leaflet.TrackPlayBack/examples/ship.png';

    this.on('tick', ({ percent }) => {
      this._handleTick(percent);
    });
    this.on('tickEnd', () => {
      this._handleTickEnd();
    });
    this._layer.on('update', () => {
      this._handleLayerUpdate();
    });
  },
  start() {
    if(this._animating) return;
    this._animating = true;
    this._map.fitBounds(this._latlngs, {
      duraion: 1000
    });
    if(this._bufferTracks.length) {
      this._fpsStartTime = Date.now() - this.options.duraion * this._percent;
    }
    this._timer = L.Util.requestAnimFrame(this._tick, this);
  },
  stop() {
    if(!this._animating) return;
    this._animating = false;
    if(this._timer) {
      L.Util.cancelAnimFrame(this._timer);
      this._timer = null;
      this._fpsStartTime = null;
    }
  },
  replay() {
    this.stop();
    this._bufferTracks = [];
    this.start();
  },
  remove() {
    this.stop();
    this._bufferTracks = [];
    this._layer.remove();
    this.off('tick');
    this.off('tickEnd');
  },
  _tick() {
    const t = Date.now();

    if(!this._fpsStartTime) {
      this._fpsStartTime = t;
    }

    const percent = (t - this._fpsStartTime) / this.options.duraion;

    if(percent >= 1) {
      this.fire('tick', { percent: 1 });
      this.stop();
      this.fire('tickEnd');
    } else {
      this._timer = L.Util.requestAnimFrame(this._tick, this);
      this.fire('tick', { percent });
    }
  },
  _handleTick(percent) {
    this._percent = percent;
    const end = percent * this._expandTracks.length;
    this._bufferTracks = this._expandTracks.slice(0, end);
    const last = this._bufferTracks[this._bufferTracks.length - 1];
    if(last) {
      this._map.setView(last);
    }
    this._draw();
  },
  _handleTickEnd() {
    this._animating = false;
    this._map.flyToBounds(this._latlngs);
  },
  _handleLayerUpdate() {
    if(this._animating) return;
    this._draw();
  },
  _clearCanvas() {
    const bounds = this._layer.getBounds();

    if(bounds) {
      const size = bounds.getSize();
      this._ctx.clearRect(bounds.min.x, bounds.min.y, size.x, size.y);
    } else {
      this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
    }
  },
  _draw() {
    if(!this._bufferTracks.length) return;

    this._clearCanvas();

    const points = this._bufferTracks.map(d => {
      const point = this._map.latLngToLayerPoint(d);
      point.rotate = d.rotate;
      return point;
    });

    // this._drawCanvasShip(points);
    this._drawShipImage(points);
    this._drawCanvasTrackLine(points);
  },
  _drawCanvasTrackLine(points) {
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
  },
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
  },
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
  },
  _addPath(latlngs) {
    const total_num = this.options.duraion / 10;
    const length = latlngs.length;
    
    let total_distance = 0;
    let distances = [];
    let expand_tracks = [];

    for(let i = 1; i < length; i++) {
      const distance = this._getDistance(latlngs[i - 1], latlngs[i]);
      total_distance += distance;
      distances.push(distance);
    }

    let percents = [ 0 ];

    for(let i = 1; i < length; i++) {
      const percent = (distances[i - 1] / total_distance).toFixed(2);
      percents[i] = percent[i - 1] + parseFloat(percent);
      expand_tracks = expand_tracks.concat(this._getPath(latlngs[i - 1], latlngs[i], percent * total_num));
    }

    return expand_tracks;
  },
  _getDistance(latlng1, latlng2) {
    return this._map.latLngToLayerPoint(latlng1).distanceTo(this._map.latLngToLayerPoint(latlng2));
  },
  _getPath(start, end, num) {
    let result = [];

    if(num > 0) {
      const rotate = Math.atan2(end.lng - start.lng, end.lat - start.lat)

      for(let i = 0; i < num; i++) {
        const latlng = L.latLng(
          (end.lat - start.lat) / num * i + start.lat,
          (end.lng - start.lng) / num * i + start.lng
        );
        latlng.rotate = rotate;
        result.push(latlng);
      }
    }

    return result;
  },
  _getLayerPoint() {}
});

L.trackAnimation = (map, latlngs, options) => {
  return new L.TrackAnimation(map, latlngs, options);
};