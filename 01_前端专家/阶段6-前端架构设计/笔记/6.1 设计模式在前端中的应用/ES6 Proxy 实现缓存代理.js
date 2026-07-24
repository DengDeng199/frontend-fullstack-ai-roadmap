function cacheProxy(target){
    const cache = new Map()
    return new Proxy(target, {
        get(obj, prop){
            if(prop in cache) return cache.get(prop)
            const value = obj[prop]
            cache.set(prop, value)
            return value
        }
    })
}

const heavyConfig = cacheProxy(loadHeavyConfig()) // 重复读取不重复计算