/*
 * self fulfilled promise implementation
 * @Author slashhuang
 * 17/3/25
 */
// new Promise((resolve,reject)中resolve,reject对应的symbol
let resolveSymbol = Symbol('resolve');
let rejectSymbol = Symbol('reject');
// Promise的内部状态，需要定义writable false.
const stateSymbol = Symbol('Promise#state');

//promise的状态集合
const fulfillState = 1;
const rejectState = -1;
const pendingState = 0;

//在then/catch中做hook
const resolveFnSymbol = Symbol('Promise#resolveFn');
const rejectFnSymbol = Symbol('Promise#rejectFn');

//Promise内部逻辑，避免暴露给外界开发者看到
const nextThenCatchSymbol =  Symbol('nextThenCatch');
const executorMicrotask = Symbol('microtask');
let {defineProperty,RunLater} = require('./util');

//promise shape
class SuperPromise{
	constructor(executor){
		if(typeof executor!=='function'){
			throw new TypeError(`${executor} is not a function`)
		};
		let resolveFn = val=>this[resolveSymbol](val);
		let rejectFn = error=>this[rejectSymbol](error);
		defineProperty(this,stateSymbol,pendingState)
		try{
			executor(resolveFn,resolveFn)
		}catch(err){
			rejectFn(err)
		}
	}
	RunLater(){
		if(!this.microtask){
			return 
		}
		let state =  this[stateSymbol];
		let PromiseVal = this.PromiseVal;
		let { newPromise } = this.microtask;
		let hookFn= '';
		if(state == fulfillState || state == rejectState){
			hookFn = state == fulfillState?resolveFnSymbol:rejectFnSymbol;
			RunLater(()=>newPromise[hookFn](PromiseVal))
		}
	}
	[resolveSymbol](val){
		defineProperty(this,stateSymbol,fulfillState);
		this.PromiseVal =  val;
		this.RunLater()
	}
	[rejectSymbol](error){
		defineProperty(this,stateSymbol,rejectState);
		this.PromiseVal =  error;
		this.RunLater()
	}
	// fnArr ==> resolve reject
	[nextThenCatchSymbol](fnArr,type){
		let method = 'resolve';
		let resolveFn = fnArr[0];
		let rejectFn = fnArr[1];
		if(type=='catch'){
			method = 'catch';
			rejectFn = fnArr[0];
		};

		//返回新的Promise,pending状态
		let newPromise =  new SuperPromise((resolve,reject)=>{});
		/*
		 * hook 用来执行本来resolve和reject的逻辑，在我们这里的实现
		 * 不一定要通过resolve,reject来改变状态
		 * 但是，对于开发者来说，看不到这一层
		 */
		newPromise[resolveFnSymbol]=function(val){
			let nextValue = resolveFn(val);
			if(nextValue instanceof SuperPromise){
				nextValue.then(val=>{
					this[resolveSymbol](val)
				})
			}else{
				this[resolveSymbol](nextValue)
			}
		}
		newPromise[rejectFnSymbol]=function(val){
			let nextValue = rejectFn(val);
			if(nextValue instanceof SuperPromise){
				nextValue.catch(val=>{
					this[rejectSymbol](val)
				})
			}else{
				this[rejectSymbol](nextValue)
			}
		}
		/*
		 * 推送进microtask队列,构筑链表
		 * 当microtask对应的caller执行的时候，会遍历microtask找到可以执行的点
		 * 通知newPromise.hook执行
		 */
		this.microtask = {
			newPromise 
		};
		this.RunLater()
		return newPromise
	}
	then(fn,fn1){
		return this[nextThenCatchSymbol]([fn,fn1],'resolve')
	}
	catch(fn){
		return [nextThenCatchSymbol]([fn],'reject')
	}
	//@TODO
	static resolve(){

	}
	static reject(){
		
	}
	static all(){

	}
	static race(){
		
	}
}
module.exports = SuperPromise;














