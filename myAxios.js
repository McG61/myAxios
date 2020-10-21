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
const getMethods = ['get', 'delete', 'head', 'options'];
const postMethods = ['put', 'patch', 'post'];
const defaultConfig = {
    headers: {
        'Accept': 'application/json, text/plain, */*'
    }
};

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
    // 删除
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
    constructor() {
        this.interceptors = {
            request: new InterceptorManager(),
            response: new InterceptorManager()
        };
    }
    // request方法发起xhr请求并返回一个promise对象
    request(config) {
        
        // 请求拦截器和响应拦截器的本质就是一个实现特定功能的函数。
        // 只需要把一个完整的请求分成三步走，维护好一个任务队列的顺序，再依次执行就可
        let dispatchRequest = (config) => {
            return new Promise((resolve, reject) => {
                let { url = '', method = 'get', data } = config;
                let xhr = new XMLHttpRequest();
                xhr.open(method.toLowerCase(), url, true);
                xhr.onload = () => {
                    if(xhr.status >= 300) {
                        reject(new Error('Some Error Happened！'));
                    }
                    resolve(xhr.responseText);
                }
                xhr.send(data);
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
// axios生成函数
function CreateAxios(defaultConfig) {
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
    return instance;
}
let myAxios = CreateAxios();