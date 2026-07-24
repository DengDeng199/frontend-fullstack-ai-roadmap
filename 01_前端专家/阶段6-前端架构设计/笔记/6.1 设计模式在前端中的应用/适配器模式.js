// // 统一接口
// interface IMap {
//     render(container): void;
//     setCenter(lng, lat): void
// }

// // 高德适配器
// class AMapAdapter implements IMap {
//     constructor() { this.map = new AMap.Map() }
//     render(c) { this.map.setContainer(c) }
//     setCenter(lng, lat) { this.map.setCenter([lng, lat]) }
// }

// // 百度适配器
// class BMapAdapter implements IMap {
//     constructor() { this.map = new BMap.Map() }
//     render(c) { this.map = new BMap.Map(c) }
//     setCenter(lng, lat) { this.map.centerAndZoom(new BMap.Point(lng, lat), 12) }
// }

// // 业务代码智能依赖IMap，还地图只换适配器
// const map = useBaidu ? new BMapAdapter() : new AMapAdapter()
// map.setCenter(116.404, 39.915)


// 后端老接口适配
function adaptLegacy(resp){
    return {
        status: resp.code === 0 ? 'ok' : 'fail',
        payload: resp.data
    }
}

// 不同数据源（MQTT / WebSocket / REST）上报的监测数据格式不一，用适配器归一化：
function adaptToStation(raw, source){
    const adapters = {
        mqtt: (r) => ({ id: r.stationId, value: r.value, ts: r.timestamp }),
        rest: (r) => ({ id: r.id, value: r.measure, ts: r.time }),
    }
    return adapters[source]?.(raw) ?? raw
}