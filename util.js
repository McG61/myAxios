/**
 * 简单实现的queryString，具有parse和stringify功能，
 */
const queryString = {
	/**
	 * parse，用于把一个URL查询字符串解析成一个键值对的集合。
	 * @param {string} str 查询字符串 'name=McG&age=18&age=81&age=99'
	 * @returns {object} 一个键值对的对象
	 */
	parse(str) {
	  	let queryObj = str.split('&').reduce((params, item) => {
			// 获取单个query的key和value
		  	const [key, value = ''] = item.split('=');
			if(params[key] !== undefined) {
			  	// 处理key多次存在，值设为数组
				params[key] = [].concat(params[key], value);
		  	} else {
				params[key] = value;
              }
              return params;
	  	}, {});
	  	return queryObj;
	},
	/**
	 * stringify，用于序列化给定对象的自身属性，生成URL查询字符串。
	 * @param {object} obj 一个键值对的对象 {name: 'McG', age: ['18', '81']}
	 * @returns {string} 查询字符串 'name=McG&age=18&age=81'
	 */
	stringify(obj) {
	  	// 获取obj的键值对集合并进行处理
	  	let queryStr = Object.entries(obj).reduce((str, item) => {
		  	const [key, value = ''] = item;
			// 处理值为数组的情况
			if(value instanceof Array) {
			  	for(let val of value) {
					str = `${str}${key}=${val}&`;
			  	}
		  	} else {
				// 字符串拼接
				str = `${str}${key}=${value}&`;
		  	}
			return str;
	  	}, '');
	  	// 去除末尾多出来的&
	  	queryStr.replace(/\&$/, '');
	  	return queryStr;
	}
};

const ECMA_SIZES =  = {
	STRING: 2,
	BOOLEAN: 4,
	NUMBER: 8
}

/**
 * 近似计算数组对象内存大小
 * @param {array} objList 
 * @returns {number} bytes 所占内存大小
 */
function calcMapSize(objList) {
    let objectList = [];
    let stack = objList;
    let bytes = 0;
    while ( stack.length ) {
        let value = stack.pop();
        if ( typeof value === 'boolean' ) {
            bytes += ECMA_SIZES.BOOLEAN;
        } else if ( typeof value === 'string' ) {
            bytes += value.length * ECMA_SIZES.STRING;
        } else if ( typeof value === 'number' ) {
            bytes += ECMA_SIZES.NUMBER;
        } else if ( typeof value === 'object' && objectList.indexOf(value) === -1 ) {
            objectList.push( value );
            for( let i in value ) {
                stack.push( value[i] );
            }
        }
    }
    return bytes;
}