
/*
 * built by slashhuang 
 * 17/3/25
 * SuperPromise测试
 */

let SuperPromise = require('../promise');
let assert = require('assert');

describe('chained Promise test should work', function() {
  describe('chained Promise test', function(done) {
    it('should return 700', function() {
        let asyncTest = new SuperPromise((res,rej)=>{
			setTimeout(res,1000,500)
		});
		let asyncTest1 = asyncTest.then((val)=>{
			return new SuperPromise((res,rej)=>{
				setTimeout(res,1000,(100+val))
			}).then(val=>val+100)
		});
		asyncTest1.then(val=>assert.equal(700,val)).then(done)
    });
  });
});




/*-------test1 异步测试-------*/
 
