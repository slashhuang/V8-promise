/*
 * @Author slashhuang
 * 17/3/24
 * 模拟V8中的macros.py
 */


//设置私有变量，实际上在V8中定义在js/macros.py文件中，用来给js2c.py使用
const SET_PRIVATE = (obj, sym, val)=> obj[sym] = val;

//模拟全局的_Call函数，类似python中的__call__
const _Call = (executor,_this,...argumentList)=>{
	 executor.apply(_this,argumentList)
}
//模拟V8对每个JS的wrap注入
const utils = {
	InstallFunctions:(nameSpace,methodObj)=>{
		Object.assign(nameSpace,methodObj)
	}
}

const IS_CALLABLE = arg => typeof(arg) === 'function';


module.exports = {
	SET_PRIVATE,
	_Call,
	utils,
	IS_CALLABLE
}