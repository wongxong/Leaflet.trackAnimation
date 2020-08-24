import L from 'leaflet';
import { TrackLayer } from './trackLayer';
import { Draw } from './draw';

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
    // 初始化轨迹数据
    this._latlngs = latlngs.map(d => {
      return L.latLng(d);
    });
    // 初始化轨迹 layer 并添加到地图
    this._layer = new TrackLayer().addTo(map);
    // 获取 canvas 
    this._canvas = this._layer.getContainer();
    // 获取绘制上下文
    this._ctx = this._layer.getContext();
    // 初始化 绘制 实例
    this._draw = new Draw(this);

    // 初始化参数
    // 当前绘制进度 0 - 1
    this._percent = null;
    // 是否正在绘制
    this._animating = false;
    // 帧 计时器
    this._timer = null;
    // 上一帧 时间戳
    this._fpsStartTime = null;
    // 绘制记录
    this._bufferTracks = [];
    // 扩充的 轨迹数据
    this._expandTracks = this._addPath(this._latlngs);

    const img = new Image();

    img.crossOrigin = 'anonymous';

    img.onload = () => {
      this._img = img;
    };

    img.src = 'https://linghuam.github.io/Leaflet.TrackPlayBack/examples/ship.png';

    this.on('tick', ({ percent }) => {
      // 每一帧的处理
      this._handleTick(percent);
    });
    this.on('tickEnd', () => {
      // 最后一帧结束的处理
      this._handleTickEnd();
    });
    this._layer.on('update', () => {
      // 轨迹 layer update 的处理
      this._handleLayerUpdate();
    });
  },
  start() {
    if(this._animating) return;
    this._animating = true;
    // 开始绘制轨迹前，先调整地图的视角和缩放
    this._map.fitBounds(this._latlngs);
    // 如果有绘制记录，继续之前的绘制，启动 / 暂停 功能
    if(this._bufferTracks.length) {
      // 根据绘制记录重置 _fpsStartTime 的值
      this._fpsStartTime = Date.now() - this.options.duraion * this._percent;
    }
    // 开始 帧 绘制
    this._timer = L.Util.requestAnimFrame(this._tick, this);
  },
  stop() {
    // 停止绘制轨迹
    if(!this._animating) return;
    this._animating = false;
    if(this._timer) {
      // 停止 帧 绘制
      L.Util.cancelAnimFrame(this._timer);
      this._timer = null;
      this._fpsStartTime = null;
    }
  },
  replay() {
    // 重新绘制轨迹动画
    // 先停止绘制
    // 清除绘制记录
    // 开始绘制
    this.stop();
    this._bufferTracks = [];
    this.start();
  },
  remove() {
    // 销毁轨迹绘制的实例
    // 停止绘制
    // 清除绘制记录
    // 移除轨迹 layer
    // 移除自定义事件
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
    this._draw.render();
  },
  _handleTickEnd() {
    this._animating = false;
    this._map.flyToBounds(this._latlngs, {
      duration: 1.2
    });
  },
  _handleLayerUpdate() {
    if(this._animating) return;
    this._draw.render();
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
  }
});

L.trackAnimation = (map, latlngs, options) => {
  return new L.TrackAnimation(map, latlngs, options);
};