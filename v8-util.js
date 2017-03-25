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

const IS_UNDEFINED = arg=> arg === void 0 ;

const make_type_error = (err)=>new TypeError(err) 

const GET_PRIVATE = (obj, sym) => obj[sym];

// Mock V8 internal functions and vars
const IS_SPEC_FUNCTION = obj => typeof obj === "function";
const IS_SPEC_OBJECT = obj =>  obj === Object(obj);
const HAS_DEFINED_PRIVATE = (obj, prop) =>  prop in obj



// In IE8 Object.defineProperty only works on DOM nodes, and defineProperties does not exist
let _defineProperty = Object.defineProperties && Object.defineProperty;

const AddNamedProperty =(target, name, value)=>{
    if (!_defineProperty) {
        target[name] = value;
        return;
    }
    _defineProperty(target, name, {
        configurable: true,
        writable: true,
        enumerable: false,
        value: value
    });
}

const InstallFunctions=(target, attr, list)=>{
    for (let i = 0; i < list.length; i += 2)
        AddNamedProperty(target, list[i], list[i + 1]);
}

const IsArray = Array.isArray;

const Global = (function() {
    try { return self.self } catch (x) {}
    try { return global.global } catch (x) {}
    return null;
})();
module.exports = {
	SET_PRIVATE,
	_Call,
	utils,
	IS_CALLABLE,
	IS_UNDEFINED,
	make_type_error,
	GET_PRIVATE,
	IS_SPEC_FUNCTION,
	IS_SPEC_OBJECT,
	HAS_DEFINED_PRIVATE,
	AddNamedProperty,
	InstallFunctions,
	Global
}






