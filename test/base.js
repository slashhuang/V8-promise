/*
 * built by slashhuang 
 * 17/3/25
 * SuperPromise测试
 */

let SuperPromise = require('../promise');

let assert = require('assert');

describe('Promise constructor should work', function() {
  describe('Promise constructor', function(done) {
    it('should resolve to 3', function(done) {

    	let syncTest = new SuperPromise((res,rej)=>{
			res(1)
		});
		let syncTest1 = syncTest.then((val)=>{
			return val+2
		});
		syncTest1.then(val=>{
			assert.equal(3, val);
		}).then(done)
    });
  });
});






