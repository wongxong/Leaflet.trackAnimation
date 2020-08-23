import L from 'leaflet';

export const TrackLayer = L.Renderer.extend({
  onAdd(map) {
    // 当 map 添加 layer 时，创建 canvas 画布并添加到 layer 容器中
    this._container = L.DomUtil.create('canvas', 'leaflet-zoom-animated');
    this._ctx = this._container.getContext('2d');

    const pane = map.getPane(this.options.pane);

    pane.appendChild(this._container);

    this._update();
  },
  onRemove() {
    // 当 layer 移除时，移除 dom 并且解除 layer 绑定的事件处理程序
    L.DomUtil.remove(this._container);
    this.off('update');
  },
  getContainer() {
    // 获取 canvas 画布
    return this._container;
  },
  getContext() {
    // 获取画布的绘制上下文
    return this._ctx;
  },
  getBounds() {
    // 获取 layer 的范围
    return this._bounds;
  },
  _update() {
    // 调用 L.Render.prototype._update 处理 layer dom，bounds / zoom / translate ...
    if(this._map._animatingZoom && this._bounds) {
      return;
    }

    L.Renderer.prototype._update.call(this);

    // 设置 canvas 画布尺寸
    const min = this._bounds.min;
    const size = this._bounds.getSize();
    const m = L.Browser.retina ? 2 : 1;

    // 设置 canvas 的位置
    L.DomUtil.setPosition(this._container, min);

    // 设置 canvas 的画布和画板宽高
    this._container.width = m * size.x;
    this._container.height = m * size.y;

    // 设置 canvas 的画板宽高
    this._container.style.width = size.x + 'px';
    this._container.style.height = size.y + 'px';

    // 如果是 retina 屏，context 放大 m 倍
    if(L.Browser.retina) {
      this._ctx.scale(m, m);
    }

    // 将 context 的中心原点(0, 0) 设置到 (-1 * min.x, -1 * min.y)
    this._ctx.translate(-1 * min.x, -1 * min.y);

    // 手动触发 update Event，可在其他地方添加 update 事件处理函数
    this.fire('update');
  }
});