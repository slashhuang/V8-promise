## write your own Promise

## 定义Promise结构的基本symbol
```javascript
let resolveSymbol = Symbol('resolve');
let rejectSymbol = Symbol('reject');
const stateSymbol = Symbol('Promise#state');
const fulfillState = 1;
const fulfillSymbol = Symbol('fulfilled');
const rejectState = -1;
const rejectSymbol = Symbol('rejected');
const pendingState = 0;
const pendingSymbol = Symbol('pending');
let {defineProperty} = require('./util')
```

## 定义基本的Promise结构
```javascript
	class Promise{
		constructor(executor){
			if(typeof executor!=='function'){
				throw new TypeError(`${executor} is not a function`)
			};
			let resolveFn = val=>this[resolveSymbol](val);
			let rejectFn = error=>this[rejectSymbol](error);
			defineProperty(this,stateSymbol,pendingSymbol)
			try{
				executor(resolveFn,resolveFn)
			}catch(err){
				rejectFn(err)
			}
		}
		[resolveSymbol](val){
			defineProperty(this,stateSymbol,resolveSymbol);
			this.PromiseVal =  val
		}
		[rejectSymbol](error){
			defineProperty(this,stateSymbol,rejectSymbol);
			this.PromiseVal =  error
		}
		then(){

		}
		catch(){

		}
		static resolve(){

		}
		static reject(){
			
		}
		static all(){

		}
		static race(){
			
		}
	}
```






