/*
 * axios
 * http://www.axios-js.com/zh-cn/docs/ 
 * 
 * 封装的配置项
 *   url
 *   method
 *   baseURL
 *   transformRequest
 *   headers
 *   params
 *   data
 *   withCredentials
 *   ...
 * axios.interceptors
 *   .request.use()
 *   .response.use()
 */
const defaults = {};
const getMethods = ['get', 'delete', 'head', 'options'];
const postMethods = ['put', 'patch', 'post'];
const defaultConfig = {
    headers: {
        'Accept': 'application/json, text/plain, */*'
    }
};
const valueFromConfig2Keys = ['url', 'method', 'data'];
const mergeDeepPropertiesKeys = ['headers', 'auth', 'proxy', 'params'];
const defaultToConfig2Keys = [
    'baseURL', 'transformRequest', 'transformResponse', 'paramsSerializer',
    'timeout', 'timeoutMessage', 'withCredentials', 'adapter', 'responseType', 'xsrfCookieName',
    'xsrfHeaderName', 'onUploadProgress', 'onDownloadProgress', 'decompress',
    'maxContentLength', 'maxBodyLength', 'maxRedirects', 'transport', 'httpAgent',
    'httpsAgent', 'cancelToken', 'socketPath', 'responseEncoding'
];
function isUndefined(value) {
    return typeof value === 'undefined';
}
function isObject(value) {
    return typeof value === 'object' && value !== null;
}

// 仅做简单merge操作,毕竟是简单实现^0^
function mergeConfig(config1, config2) {
    config2 = config2 || {};
    let config = {};
    valueFromConfig2Keys.forEach(key => {
        if(!isUndefined(config2[key])) {
            config[key] = config2[key];
        }
    });
    defaultToConfig2Keys.forEach(key => {
        if(!isUndefined(config2[key])) {
            config[key] = config2[key];
        } else if (!isUndefined(config1[key])) {
            config[key] = config1[key];
        }
    });
    mergeDeepPropertiesKeys.forEach(key => {
        if(isObject(config1[key]) || isObject(config2[key])) {
            config[key] = {...(config1[key]||{}), ...(config2[key]||{})}
        }
    });
    return config;
}

class InterceptorManager {
    constructor() {
        this.handlers = [];
    }
    // 注册函数，返回对应的下标作为唯一标识定位
    use(fulfilled, rejected) {
        this.handlers.push({
            fulfilled: fulfilled,
            rejected: rejected,
        });
        return this.handlers.length - 1;
    }
    // 注销函数
    eject(id) {
        if (this.handlers[id]) {
            this.handlers[id] = null;
        }
    }
    // 遍历this.handlers，并将遍历元素作为参数执行fn
    forEach(fn) {
        this.handlers.forEach(obj => fn(obj));
    }
}

class MyAxios {
    constructor(defaults) {
        this.defaults = defaults;
        console.log(222, this.defaults, defaults)
        this.interceptors = {
            request: new InterceptorManager(),
            response: new InterceptorManager()
        };
    }
    // request方法发起xhr请求并返回一个promise对象
    request = (config) => {
        config = mergeConfig(this.defaults, config);
        // 请求拦截器和响应拦截器的本质就是一个实现特定功能的函数。
        // 只需要把一个完整的请求分成三步走，维护好一个任务队列的顺序，再依次执行就可
        let dispatchRequest = (config) => {
            return new Promise((resolve, reject) => {
                let { url = '', method = 'get', data, baseURL } = config;
                if(baseURL) {
                    url = baseURL + url;
                }
                let xhr = new XMLHttpRequest();
                xhr.open(method.toLowerCase(), url, true);
                xhr.onload = () => {
                    if(xhr.status >= 300) {
                        reject(new Error('Some Error Happened！'));
                    }
                    resolve(xhr.responseText);
                }
                xhr.timeout = config.timeout;
                xhr.send(data);
                xhr.ontimeout = function handleTimeout() {
                    let timeoutErrorMessage = '已超过' + config.timeout + '毫秒的超时时间';
                    if (config.timeoutErrorMessage) {
                      timeoutErrorMessage = config.timeoutErrorMessage;
                    }
                    reject(new Error(timeoutErrorMessage));
              
                    // 清除请求
                    xhr = null;
                };
                // 如果配置项带有cancelToken参数，支持取消请求
                if (config.cancelToken) {
                    // config.cancelToken.promise 为 CancelToken类中的this.promise;
                    // 注册CancelToken实例属性promise的Fulfilled回调
                    config.cancelToken.promise.then(function onCanceled(cancel) {
                        // 该请求已完成，不做处理
                        if (!xhr) {
                            return;
                        }
                        // 取消请求
                        xhr.abort();
                        // 将dispatchRequest reject，cancel为config.cancelToken.promise reject的message
                        reject(cancel);
                        // 把该请求清空
                        xhr = null;
                    });
                }
            })
        }
        // 发起请求任务
        let chain = [dispatchRequest, undefined];
        let promise = Promise.resolve(config);
        // 如果注册了请求拦截器，则遍历handlers依次向前推入任务队列，在发起请求前执行
        this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
            // 按顺序往chain中推入fulfilled回调和rejected回调（fulfilled和rejected按顺序成对存在，保证了消费顺序）
            interceptor && chain.unshift(interceptor.fulfilled, interceptor.rejected);
        });
        // 如果注册了响应拦截器，则依次往后推入任务队列，在请求返回响应后执行
        this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
            interceptor && chain.push(interceptor.fulfilled, interceptor.rejected);
        });
    
        while (chain.length) {
            // 依次取出fulfilled和rejected回调消费
            promise = promise.then(chain.shift(), chain.shift());
        }

        return promise;
    }
}

// MyAxios原型上添加相应get类方法
getMethods.forEach(method => {
    MyAxios.prototype[method] = function(url, config) {
        return this.request({...config, ...{
            method,
            url,
        }});
    }
});

// MyAxios原型上添加相应post类方法
postMethods.forEach(method => {
    MyAxios.prototype[method] = function(url, data, config) {
        return this.request({...config, ...{
            method,
            url,
            data,
        }});
    }
});
// axios实例生成函数
function CreateAxiosInstance(defaultConfig) {
    // 创建axios实例
    let context = new MyAxios(defaultConfig);
    // 取得request方法并绑定上下文context
    let instance = context.request.bind(context);
    // 将MyAxios原型上的方法添加到instance上
    [...getMethods, ...postMethods].forEach(method => {
        instance[method] = MyAxios.prototype[method].bind(context);
    });
    // 将拦截器对象interceptors添加到instance上
    instance.interceptors = context.interceptors;
    instance.defaults = context.defaults;
    return instance;
}

function CancelToken(executor) {
    let resolvePromise;
    this.promise = new Promise((resolve, reject) => {
      resolvePromise = resolve;
    });
  
    let token = this;
    executor(function cancel(message) {
        if (token.reason) {
            return;
        }
        // 保存取消message，作为是否已取消的标识
        token.reason = new Cancel(message);
        // 将this.promise状态改为Fulfilled，触发this.promise.then的Fulfilled回调
        resolvePromise(token.reason);
    });
}

function Cancel(message) {
    this.message = message;
}

Cancel.prototype.toString = function toString() {
    return 'Cancel' + (this.message ? ': ' + this.message : '');
};

let axios = CreateAxiosInstance(defaults);
axios.Axios = MyAxios;
axios.CancelToken = CancelToken;
axios.Cancel = Cancel;
// 支持处理并发请求，采用Promise.all方式
axios.all = function all(promises) {
    return Promise.all(promises);
};
// 进行spread处理，只是把<Array>res => {} 转成 (res1, res2, ...) => {}；更便捷获取到每个请求返回的响应
axios.spread = function spread(callback) {
    return function wrap(arr) {
      return callback.apply(null, arr);
    };
};
// axios生成函数
axios.create = function create(instanceConfig) {
    return CreateAxiosInstance(mergeConfig(axios.defaults, instanceConfig));
}

// export default axios;