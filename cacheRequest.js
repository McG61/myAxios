// import axios from './cacheRequest';
// import {queryString} from './util';
// 毫秒转化为秒
const MS_TO_S = 1000;
// 默认超时时间（秒）
const DEFAULT_TIMEOUT = 3600;
// 一天的秒数
const DAY_TO_S = 86400;
// 最大存储限制
const MAX_SIZE = 25 * 1024;

// map存储的对象类
class ItemCache {
    constructor(data, timeout) {
        this.data = data;
        // 设定超时时间，设定为多少秒
        this.timeout = timeout;
        // 创建对象时候的时间，大约设定为数据获得的时间
        this.cacheTime = (new Date()).getTime;
    }
}

class ExpriesCache {
    // 定义静态数据map来作为缓存池
    static cacheMap = new Map();

    // 数据是否超时
    static isOverTime(name) {
        const data = ExpriesCache.cacheMap.get(name)

        // 没有数据 不存在
        if (!data) return true;

        // 获取系统当前时间戳
        const currentTime = (new Date()).getTime();      

        // 获取当前时间与存储时间的过去的秒数
        const overTime = (currentTime - data.cacheTime) / MS_TO_S;

        // 如果过去的秒数大于当前的超时时间，也返回null让其去服务端取数据
        if (Math.abs(overTime) > data.timeout) {
            // 此代码可以没有，不会出现问题，但是如果有此代码，再次进入该方法就可以减少判断。
            ExpriesCache.cacheMap.delete(name);
            return true;
        }

        // 不超时
        return false;
    }

    // 当前data在 cache 中是否存在且未超时
    static has(name) {
        return !ExpriesCache.isOverTime(name);
    }

    // 删除 cache 中的 某个请求接口的所有data
    static delete(name) {
        const keyList = ExpriesCache.cacheMap.keys();
        for (let key of keyList) {
            key.startsWith(name) && ExpriesCache.cacheMap.delete(key);
        };
    }

    // 删除 cache 中的 单个data
    static deleteWithParam(name) {
        ExpriesCache.cacheMap.delete(name);
    }

    // 清空缓存 cache
    static clear() {
        return ExpriesCache.cacheMap.clear();
    }

    // 查看当前缓存
    static view() {
        return ExpriesCache.cacheMap;
    }

    // 获取
    static get(name) {
        const isDataOverTiem = ExpriesCache.isOverTime(name);
        //如果 数据超时，返回null，但是没有超时，返回数据，而不是 ItemCache 对象
        return isDataOverTiem ? null : ExpriesCache.cacheMap.get(name).data;
    }

    // 默认存储60分钟
    static set(name, data, timeout = DEFAULT_TIMEOUT) {
        console.log(ExpriesCache.cacheMap.size)
        // 设置 itemCache
        const itemCache = new ItemCache(data, timeout);
        //缓存
        ExpriesCache.cacheMap.set(name, itemCache);
    }
}

// 生成key值错误
const generateKeyError = new Error('Generate key error');
// 非空判断
const isEmpty = data => {
    return data === null || data === undefined || typeof data === 'string' && data.trim() === '' || typeof data === 'object' && Object.keys(data).length < 1;
}
/**
 * 生成key值
 * @param {string} url	请求地址
 * @param {object} params	查询参数
 * @returns {string} 请求地址 + 查询字符串
 */
const generateKey = (url, params) => {
    // 将参数对象序列化生成字符串
    const paramsString = queryString.stringify(params);

    try {
        // 返回 字符串，请求地址 + 查询字符串
        return isEmpty(params) ? url : `${url}:${paramsString}`;
    } catch(_) {
        // 返回生成key错误
        return generateKeyError;
    }
};

/**
 * 发起请求函数
 * @param {string} url	请求地址
 * @param {object} params 查询参数
 */
const cacheRequest = async (url, params, method = 'post') => {
    // 生成key
    const key = generateKey(url, params);
    // 获得数据
    let data = ExpriesCache.get(key);
    if (!data) {
        const res = await axios({url, data: params, method});
        // 使用 DAY_TO_S 缓存，一天之后再次get就会取不到值 从而继续服务端继续请求;
		ExpriesCache.set(key, res, DAY_TO_S);
		return res;
    }
    return data;
};

/**
 * 强制缓存失效
 * @param {boolean || string} clearKey 布尔值则代表是否清空所有缓存，字符串则代表需要失效缓存的接口名
 */
const clearRequestCache = (clearKey) => {
    if(clearKey === true) {
        return ExpriesCache.clear();
    }
    if(typeof clearKey === 'string') {
        ExpriesCache.delete(clearKey);
    }
}

const viewRequestCache = () => {
    const cacheMap = ExpriesCache.view();
    console.log('cacheMap =>', cacheMap);
    return cacheMap;
}
