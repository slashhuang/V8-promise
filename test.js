/*
 * built by slashhuang 
 * 17/3/25
 * SuperPromise测试
 */


let SuperPromise = require('./promise');

/*-------test 同步测试-------*/
 
let syncTest = new SuperPromise((res,rej)=>{
	res(1)
});
let syncTest1 = syncTest.then((val)=>{
	console.log(val+10000);
	return 2000
});
syncTest1.then(val=>console.log('anothernext-should be 2000--',val))


/*-------test1 异步测试-------*/
 
let asyncTest = new SuperPromise((res,rej)=>{
	setTimeout(res,1000,500)
});
let asyncTest1 = asyncTest.then((val)=>{
	console.log(val+100);
	return new SuperPromise((res,rej)=>{
		res(100)
	})
});
asyncTest1.then(val=>console.log('anothernext-should be 100--',val))




